# Checklist admin / Dassault — desbloqueio BOM Analytics

**Para:** Administrador 3DEXPERIENCE / Suporte Dassault  
**Tenant piloto:** R1132100929518  
**Widget:** BOM Analytics (GitHub Pages + backend Render)  
**Data:** 2026-06-18

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

## Pedido 2 — Maturidade / lifecycle

Precisamos **mudar maturidade real** de EngItem via backend REST.

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

**Perguntas fechadas:**

- [ ] Derived Output GLB/glTF está habilitado para Physical Product?
- [ ] Derived Format Converter está habilitado?
- [ ] Existe DownloadTicket para 3DShape via dsdo?
- [ ] Existe endpoint lifecycle REST para EngItem?
- [ ] Qual payload de changeMaturity?
- [ ] Qual security context / role é exigido?
- [ ] Conta atual pode promover/demover?
- [ ] Precisa reserva/lock no item?

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
