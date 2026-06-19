# Checklist admin / Dassault — desbloqueio BOM Analytics

**Para:** Administrador 3DEXPERIENCE / Suporte Dassault  
**Tenant piloto:** R1132100929518  
**Widget:** BOM Analytics (GitHub Pages + backend Render)  
**Data:** 2026-06-18 (atualizado após correção de regressão)

---

## Dashboard regression corrected (2026-06-18)

**Commit de correção:** `7dcae3b` (branch `cursor/fix-dashboard-regression-bom20260617d`)

**Causa raiz:** no commit `63ee892`, a declaração `function loadVisualizationForRow(active)` foi removida acidentalmente ao adicionar helpers de mensagem 3D/maturidade. O corpo da função ficou órfão → **SyntaxError** em `bom-ska-service-hotfix-20260617d.js` → `__bomSkaServiceInstall` nunca executava → E-BOM vazia, badge **Parcial 0/5**, footer **0 de 0**, layout sem inicialização correta.

**Correção:** restaurada a linha `function loadVisualizationForRow(active) {` antes do corpo existente. Uma linha; sem alteração de build (`bom20260617d`), link oficial ou CSS.

**Evidência pós-correção (backend inalterado):**

| Teste | Resultado |
|-------|-----------|
| `npm test` | 33/33 PASS |
| `/api/3dx/bom/health` | `ok:true`, `mode:dseng-official` |
| `/api/3dx/bom/structure` CJ MESA depth=1 | **5 rows**, `totalRows:5` |
| `node --check` hotfix | SYNTAX OK |

**Status visual:** a quebra de proporção (gráficos grandes, painel espremido) era efeito colateral do hotfix não carregar; após deploy da correção, o runtime volta a aplicar layout/sync. Nenhuma reversão de CSS foi necessária.

**Link oficial inalterado:** `widget-v3-08i.html?v=bom20260617d`

---

## Contexto

O widget **BOM Analytics** lista E-BOM via dseng, permite selecionar linhas e deve:

1. Renderizar **modelo 3D real** no viewer **Three.js próprio** (sem 3DPlay).
2. Permitir **mudança real de maturidade** no 3DEXPERIENCE.

O **código da dashboard e do backend está pronto** para consumir APIs oficiais. Os testes no tenant mostraram **bloqueio de configuração/API**, não falta de implementação no app.

---

## Pedido 1 — Representação 3D (sem 3DPlay)

Precisamos renderizar modelos reais no viewer próprio da dashboard, **sem 3DPlay**.

**O que já sabemos:**

- O backend encontra **3DShape** ligados ao EngItem (expand depth=2).
- `dsdo:DerivedOutputs/Locate` retorna **0 arquivos** para os itens testados.
- Sem **GLB/glTF/OBJ/STL**, o Three.js não renderiza.

**IDs testados:**

| Objeto | referenceId |
|--------|-------------|
| CJ MESA (root) | `63FC553465A62400699E0792000086AB` |
| Tampo | `63FC553465A62400699DB56700005253` |
| 3DShape #1 | `63FC553465A62400699DB30C00004EF7` |
| 3DShape #2 | `2C56DEE5E1E943068A77F7E8B2F0AB7B` |
| Vidro (UI) | `63FC553465A62400699DB30C00004EB9` |

**Endpoints candidatos (documentação pública + probe tenant):**

| Serviço | Endpoint candidato | Método | Payload resumido | Notas |
|---------|-------------------|--------|------------------|-------|
| dsdo | `/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/Locate` | POST | `{ type, id }` VPMReference ou 3DShape | **200, fileCount:0** no tenant |
| dsdo | `/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/DownloadTicket` | POST | ticket após Locate | Requer arquivo em Locate |
| FCS | URL absoluta do ticket (host FCS) | GET | ticket da resposta DownloadTicket | Cross-host; backend já implementa |
| dseng | `/resources/v1/modeler/dseng/dseng:EngItem/{id}/expand` | POST | depth=2, filter 3DShape | Encontra shapes; **sem arquivo web** |
| dsxcad | `/resources/v1/modeler/dsxcad/dsxcad:Representation/locate` | POST | referencedObject EngItem | **400** neste tenant |
| ds3sh | `/resources/v1/modeler/ds3sh/ds3sh:3DShape/{id}` | GET | shape id | Metadados OK; sem GLB |

**Fontes pesquisadas (2026-06-18):**

- [Derived Outputs Web Services](https://media.3ds.com/support/documentation/developer/Cloud/en/DSDoc.htm?show=CAADerivedOutputsWS/dsdo_v1.htm)
- [Deep Dive: Derived Outputs](https://visiativ.co.uk/news-resources/deep-dive-derived-outputs-3dexperience/) — requer Derived Format Converter + regras no Platform Manager
- [Setting Up Derived Outputs for SOLIDWORKS](https://www.javelin-tech.com/blog/2025/09/setting-up-derived-outputs-for-solidworks-files-on-the-3dexperience-platform/) — GLB/glTF configurável via admin
- [COExperience: Public Web Services](https://www.coe.org/Content-Center/Content-Center-Details/coexperience-session-wrap-up-exploring-3dexperience-public-web-services) — OpenAPI 3DSpace + FCS

**Precisamos que o tenant:**

- [ ] Tenha **Derived Format** para peças **mecânicas** (SOLIDWORKS / Physical Product / 3DShape), **não apenas Allegro PCB→CGR**.
- [ ] Gere **GLB ou glTF** (OBJ/STL aceitável).
- [ ] Tenha **Derived Format Converter** ativo.
- [ ] Gere outputs nos itens de teste (salvar, promover maturidade ou job manual).

**Perguntas:**

1. Qual regra de conversão criar no Platform Manager (Origin, Type, Target Format)?
2. Qual endpoint REST retorna **DownloadTicket** para esse Derived Output?
3. `dsxcad:Representation/locate` retorna 400 — qual payload/permissão correta?

**Validação após configuração:**

```bash
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/visualization/resolve \
  -H "Content-Type: application/json" \
  -d '{"referenceId":"63FC553465A62400699DB56700005253","title":"Tampo","mode":"dseng-official"}'
```

Esperado: `"ok": true`, `"format": "glb"` (ou gltf/obj/stl), `"modelUrl": "..."`.

---

## Pedido 2 — Maturidade / lifecycle (direta, sem Change Action)

Precisamos **mudar maturidade real** de EngItem via backend REST — **transição direta no item**, sem Change Action e sem ECO obrigatório.

**Premissa:** itens não-configurados (EngItem/VPMReference padrão) devem permitir promote/demote via API de lifecycle/maturity. Change Action é caminho de **itens configurados** ou processo controlado — **não** é o fluxo principal deste widget.

**O que já sabemos:**

- Item Tampo: `63FC553465A62400699DB56700005253`, estado **IN_WORK**.
- Invokes per-item (`GetNextStates`, `ChangeMaturity`, etc.): **404 URI not Found**.
- Invoke global `dseng/invoke/dseng:changeMaturity`: **500 Internal Error**.
- Teste IN_WORK→FROZEN: **estado permaneceu IN_WORK**.

**Precisamos:**

- [ ] Endpoint REST oficial para **listar transições** permitidas.
- [ ] Endpoint REST oficial para **executar** promote/demote/changeMaturity.
- [ ] Payload JSON de exemplo válido neste tenant.
- [ ] Confirmação de **role** (Author vs Leader) e **security context**.
- [ ] Confirmação se cookie de serviço pode executar ou se exige sessão interativa.

**Endpoints candidatos (documentação pública + código backend):**

| Serviço | Endpoint candidato | Método | Notas |
|---------|-------------------|--------|-------|
| dseng (per-item) | `/resources/v1/modeler/dseng/dseng:EngItem/{id}/invoke/dseng:GetNextStates` | POST | Lista transições; **404** neste tenant |
| dseng (per-item) | `.../invoke/dseng:changeMaturity` | POST | Executa transição; **404** neste tenant |
| dseng (global) | `/resources/v1/modeler/dseng/invoke/dseng:changeMaturity` | POST | Array EngItem + targetState; **500** neste tenant |
| dslc | `/resources/v1/modeler/dslc/dslc:changeMaturity` | POST | **404** neste tenant |
| C++ API (referência) | `CATAdpMaturityServices::ApplyMaturityTransition` | — | Não REST; confirma modelo de transição direta por grafo de maturidade |

**Fontes pesquisadas (2026-06-18):**

- [3DEXPERIENCE Web Services Postman Primer](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw) — auth CAS, CSRF obrigatório em POST/PUT/DELETE
- [Derived Outputs Web Services (dsdo)](https://media.3ds.com/support/documentation/developer/Cloud/en/DSDoc.htm?show=CAADerivedOutputsWS/dsdo_v1.htm) — requer 3DEXPERIENCE ID
- [ws3dx.dsdo SDK](https://github.com/3ds-cpe-emed/ws3dx-dotnet/tree/main/ws3dx.dsdo) — família dsdo oficial
- PDFs tenant-unblock: traces/FCS/service URL; **não** trazem payload pronto de maturity

**Perguntas fechadas (obrigatórias):**

1. Qual endpoint REST oficial muda maturidade **diretamente** de EngItem/VPMReference no tenant Cloud?
2. Qual payload exato (array vs objeto, `targetState` Frozen vs FROZEN)?
3. Qual ID usar (physicalId vs referenceId)?
4. Precisa CSRF token 3DSpace?
5. Precisa lock/reservation no item?
6. Qual security context (`ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO` é suficiente)?
7. A conta de serviço atual tem permissão de promote/demote?
8. Como consultar transições diretas permitidas (equivalente GUI “Changing Maturity”)?
9. Como confirmar estado final após invoke?
10. Derived Output GLB/glTF está habilitado para Physical Product?
11. Derived Format Converter está habilitado?
12. Qual endpoint retorna DownloadTicket/FCS para 3DShape?
13. Por que `dsdo:Locate` retorna `fileCount:0` apesar de existirem 3DShape?

**Validação após configuração:**

```bash
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/lifecycle/transitions \
  -H "Content-Type: application/json" \
  -d '{"referenceId":"63FC553465A62400699DB56700005253","mode":"dseng-official"}'
```

Esperado: `"ok": true`, `"transitions": [ ... ]` (não vazio).

---

## Documentação de apoio no repositório

- `docs/tenant-unblock/3d-representation-evidence.md`
- `docs/tenant-unblock/lifecycle-maturity-evidence.md`
- Script: `cd backend && npm run probe:tenant -- ROOT_ID ITEM_ID`

---

## Contato técnico

Backend público: https://bom-resolver.onrender.com  
Widget: https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617d

Não enviar cookies, tokens ou senhas por e-mail. Usar canal seguro do tenant.
