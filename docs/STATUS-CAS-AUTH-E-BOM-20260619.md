# Status consolidado — CAS Auth, E-BOM e pendências

**Data:** 2026-06-19  
**Commit Render (deploy ativo):** `19919c5`  
**Backend:** https://bom-resolver.onrender.com  
**Widget:** https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617d  
**Tenant piloto:** `R1132100929518`  
**Usuário CAS (Render):** `enderson.moura@ska.com.br` — **admin confirmado** na plataforma

---

## Resumo executivo

| Área | Status | Bloqueio |
|------|--------|----------|
| Frontend E-BOM (root resolution, lastGoodContext) | ✅ OK | — |
| Backend dseng (código, testes, contrato API) | ✅ OK | — |
| CAS automático Render → 3DSpace | ❌ FAIL | `tenant 'r1132100929518' does not exist` (401 no CSRF) |
| 3D real (Derived Output) | ❌ FAIL | Tenant — sem GLB/glTF |
| Maturidade real (lifecycle) | ❌ FAIL | Tenant — invoke 404/500 |

**Conclusão:** o código do backend implementa o fluxo CAS alinhado ao Postman Primer e ao protocolo oficial 3DPassport. O Passport **aceita** login (ticket OK); o **3DSpace rejeita** a sessão na troca do service ticket. Isso **não** é bug de PowerShell, JSON malformado ou URL `ifwe` no Render — a configuração de space URL está correta.

---

## 1. O que já funciona

### 1.1 Frontend (build `bom20260617d`)

| Item | Detalhe |
|------|---------|
| Root resolution | `resolveRootForBomLoad()` — PSE → resolve-selection → lastGoodContext → manual |
| Persistência | `localStorage` `bomAnalytics:lastGoodContext:bom20260617d` |
| Boot auto-load | Recupera E-BOM quando PSE não entrega rootId dseng |
| Provider PSE | `product-explorer-sync-provider.js` — contexto parcial (title/name) não zera tabela |
| Regressão SyntaxError | Corrigida em `7dcae3b` — hotfix carrega normalmente |

Documentação: [dashboard-root-resolution.md](./tenant-unblock/dashboard-root-resolution.md)

### 1.2 Backend — contrato e lógica dseng

| Item | Detalhe |
|------|---------|
| Rotas | `/api/3dx/bom/health`, `/health/authcheck`, `/structure`, `/resolve-selection`, `/diagnostic` |
| Modo | `BOM_SERVICE_MODE=dseng` → `dseng-official` |
| Cliente | `ThreeDxDsengClient` — EngItem, EngInstance, expand |
| Testes | **43/43 PASS** (`npm test` em `backend/`) |
| Mock | `BOM_SERVICE_MODE=mock` preservado para regressão |
| ENOVIA_COOKIE | Removido fallback silencioso — CAS ou cookie explícito apenas |

### 1.3 Backend — implementação CAS (código revisado)

Arquivo principal: `backend/src/services/threeDxCasAuth.js`

Fluxo implementado (equivalente ao [Postman Primer 3DS](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw)):

1. `GET {PASSPORT}/login?action=get_auth_params` → Login Ticket (`lt`)
2. `POST {PASSPORT}/login?service={SPACE}/resources/v1/application/CSRF` → Service Ticket + CASTGC
3. Redirect com `ticket=ST-...` → `GET {SPACE}/resources/v1/application/CSRF` → CSRF + JSESSIONID
4. Header `SecurityContext: ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO` em requests mutáveis

Correções já aplicadas no código:

| Bug histórico | Sintoma | Fix |
|---------------|---------|-----|
| Passport URL = dashboard ifwe | `hasLt: false` | `sanitizePassportUrl()` ignora URLs inválidas |
| Cookie jar global | 401 após redirect cross-host | `CookieJar.headerForUrl()` escopo por host |
| Segundo GET CSRF após ticket | `invalid_grant` (ticket single-use) | Reutiliza resposta do redirect |
| Failover us1.iam (DNS inexistente) | Erro enganoso | Fail-fast; não tenta região após erro pós-ticket |
| SECURITY_CONTEXT com newline | Contexto quebrado no Render | `stripSecurityContext()` normaliza |
| THREEDX_SPACE_URL ifwe | Space errado | `sanitizeSpaceUrl()` deriva `*-space*` |

### 1.4 Ferramentas de diagnóstico

| Ferramenta | Caminho / comando |
|------------|-------------------|
| Postman CAS | `postman/CAS-Login-Tenant-R1132100929518.postman_collection.json` |
| Postman environment | `postman/CAS-Login-Tenant-R1132100929518.postman_environment.json` |
| Probe script | `cd backend && npm run probe:postman-cas` |
| Tenant probe (3D/maturidade) | `cd backend && npm run probe:tenant -- ROOT_ID ITEM_ID` |

### 1.5 Configuração Render (`render.yaml`)

```yaml
THREEDX_SPACE_URL=https://r1132100929518-us1-space.3dexperience.3ds.com/enovia
THREEDX_PASSPORT_URL=https://r1132100929518-eu1.iam.3dexperience.3ds.com
THREEDX_SECURITY_CONTEXT=ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO
THREEDX_AUTH_MODE=cas
BOM_SERVICE_MODE=dseng
THREEDX_USERNAME / THREEDX_PASSWORD  # secrets no dashboard Render
```

---

## 2. Erro bloqueante atual (produção)

### 2.1 Evidência ao vivo (2026-06-19)

**GET** `/api/3dx/bom/health/authcheck` → HTTP **503**

```json
{
  "ok": false,
  "auth": {
    "casProbe": {
      "ticketOk": true,
      "selectedPassport": "https://r1132100929518-eu1.iam.3dexperience.3ds.com",
      "steps": [{ "ticketStatus": 200, "hasLt": true, "hasPassportSession": true }]
    },
    "casLoginOk": false,
    "casLoginError": "CAS service authentication failed (401): tenant 'r1132100929518' does not exist",
    "hint": "THREEDX_SPACE_URL must be *-space* ..."
  }
}
```

**POST** `/api/3dx/bom/structure` (root CJ MESA) → HTTP **502**

```json
{
  "error": { "code": "UPSTREAM_AUTH_FAILED" },
  "diagnostics": {
    "errors": ["upstream: CAS service authentication failed (401): tenant 'r1132100929518' does not exist"]
  }
}
```

### 2.2 Interpretação técnica

| Etapa | Resultado | Significado |
|-------|-----------|-------------|
| Login Ticket (Passport) | ✅ 200, `lt` presente | Credenciais aceitas pelo 3DPassport |
| POST CAS com service URL | ✅ CASTGC / redirect | SSO Passport OK |
| GET CSRF no 3DSpace | ❌ 401 | 3DSpace **não reconhece** o tenant/usuário neste contexto de serviço |

O erro ocorre em `finalizeCasSession()` quando a resposta do endpoint CSRF retorna 401 com corpo JSON contendo `tenant 'r1132100929518' does not exist`.

### 2.3 Hint enganoso no código (documentado, não corrigido)

Em `threeDxBomService.js`, quando o erro contém `tenant does not exist`, o hint sugere corrigir `THREEDX_SPACE_URL` para `*-space*`. **No Render atual, a space URL já está correta** (`r1132100929518-us1-space`). O hint é **desatualizado** para este cenário — o problema é de **binding tenant/plataforma ou permissão de CAS server-side**, não de URL mal escrita.

---

## 3. Revisão de código — achados

### 3.1 `threeDxCasAuth.js` — alinhamento com documentação oficial

Referência: [3DPassport and CAS Protocol (CAA)](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAiamPassport/CAAiamPassportCASProtocol.htm)

| Elemento CAS | Doc oficial | Implementação |
|--------------|-------------|---------------|
| Login Ticket (LT) | GET auth params, TTL ~2 min | ✅ `fetchLoginTicket()` |
| POST credentials + LT | Form urlencoded | ✅ `postCasLogin()` |
| Service Ticket (ST) | Single-use, via redirect | ✅ `followRedirects()` + reuse |
| CASTGC | Cookie SSO 2h | ✅ `jar.hasSsoCookie()` |
| CSRF endpoint | `GET .../application/CSRF` | ✅ `serviceUrl` correto |
| SecurityContext header | Obrigatório em POST/PUT/DELETE | ✅ Envia em `fetchCsrfSession()` |

Fallback passport→space login (segundo jar) existe para cenários onde service-login falha com 401 — padrão do SDK .NET.

### 3.2 `threeDxConfig.js` — resolução de auth

Prioridade de auth:

1. `ENOVIA_BEARER_TOKEN` → bearer
2. `THREEDX_USERNAME` + `THREEDX_PASSWORD` + `THREEDX_AUTH_MODE≠cookie` → **cas**
3. `ENOVIA_COOKIE` + mode cookie → cookie
4. `THREEDX_AUTH_MODE=basic` → basic

Com `THREEDX_AUTH_MODE=cas` e user/pass configurados → modo CAS ativo. ✅

### 3.3 `threeDxDsengClient.js` — sem fallback ENOVIA_COOKIE

`ensureAuthenticated()` usa apenas CAS quando `authMode === 'cas'`. Falha de auth → `UPSTREAM_AUTH_FAILED`. ✅ Alinhado ao pedido de não depender de cookie manual.

### 3.4 Endpoints dseng usados

| Operação | Endpoint |
|----------|----------|
| EngItem | `GET /resources/v1/modeler/dseng/dseng:EngItem/{ID}` |
| EngInstance | `GET .../dseng:EngItem/{ID}/dseng:EngInstance` |
| Expand | `POST .../dseng:EngItem/{ID}/expand` |
| Search | `GET .../dseng:EngItem/search` |
| CSRF | `GET /resources/v1/application/CSRF` |

Documentação: [3DEXPERIENCE Cloud Web Services](https://media.3ds.com/support/documentation/developer/Cloud/en/DSDoc.htm) (requer 3DEXPERIENCE ID)

---

## 4. Pesquisa — causas prováveis e soluções

### 4.1 Erro `tenant does not exist` — literatura 3DS

Fontes consultadas:

- [Platform Access Login Issues (3DSwym Wiki)](https://3dswym.3dexperience.3ds.com/wiki/3dexperience-platform-user-s-community/platform-access-login-issues_egmBDta6RKa94DZv15SI4Q)
- [Managing login errors (Makers)](https://3dswym.3dexperience.3ds.com/wiki/makers-support/managing-login-errors_LE-P77XESo-Xu9M7aX8zNQ)
- [3DPassport CAS Protocol (CAA)](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAiamPassport/CAAiamPassportCASProtocol.htm)
- [3DEXPERIENCE Web Services Postman Primer](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw)
- [3dxws-dotnet-core-sdk](https://github.com/3ds-cpe-emed/3dxws-dotnet-core-sdk) — `ds.authentication` (CAS, **Openness Agent Cloud**, Batch OnPremise)

Causas documentadas pela comunidade 3DS para mensagens de tenant/acesso:

| Causa | Aplicável aqui? | Notas |
|-------|-----------------|-------|
| URL de login errada (ifwe genérico vs tenant) | ❌ Descartada | Space URL correta no Render |
| OTT / primeiro acesso não consumido | ⚠️ Possível | Usuário é admin ativo — improvável se loga no dashboard |
| Licença/role expirada | ⚠️ Possível | Admin confirmado; verificar roles **para API server-side** |
| Cross-company vs membro nativo | ⚠️ Possível | Colaborador externo pode ter acesso UI mas restrição em CAS batch |
| **Restrict Usage to this Platform** | ⚠️ **Investigar** | Wiki 3DS: desabilitar no tenant de origem para cross-company |
| CAS server-side de IP externo (Render) | ⚠️ **Investigar** | Widget in-dashboard usa sessão WAFData; backend cloud usa CAS batch |
| Tenant não provisionado para Web Services | ⚠️ **Investigar** | Erro vem do 3DSpace, não do Passport |

### 4.2 Alternativa oficial: Openness Agent (Cloud)

O SDK oficial `ds.authentication` documenta três modos:

- **CAS** — user/password (o que implementamos)
- **Openness Agent (Cloud)** — autenticação de serviço para integrações server-side
- **Batch Service (OnPremise)** — apenas on-prem

Referência: [NuGet ds.authentication](https://www.nuget.org/packages/ds.authentication/)

**Não implementado** neste repositório. Se o tenant bloquear CAS batch para usuários humanos a partir de IPs cloud, o caminho oficial alternativo é configurar **Openness Agent** no Platform Manager e usar credenciais de agente — não `THREEDX_USERNAME/PASSWORD` de usuário interativo.

### 4.3 Teste decisivo — Postman no PC do usuário

O agente cloud **não** consegue reproduzir CAS com credenciais reais do tenant. O teste abaixo no PC do Enderson separa **problema de tenant** vs **problema de IP Render**:

```powershell
cd backend
$env:THREEDX_USERNAME = "enderson.moura@ska.com.br"
$env:THREEDX_PASSWORD = "<senha>"
$env:THREEDX_SPACE_URL = "https://r1132100929518-us1-space.3dexperience.3ds.com/enovia"
$env:THREEDX_PASSPORT_URL = "https://r1132100929518-eu1.iam.3dexperience.3ds.com"
$env:THREEDX_SECURITY_CONTEXT = "ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO"
npm run probe:postman-cas
```

| Resultado Postman local | Conclusão |
|-------------------------|-----------|
| CSRF 401 igual | Problema **tenant/plataforma/usuário** — abrir SR Dassault |
| CSRF 200 OK | Problema **IP/rede Render** — whitelist ou Openness Agent |

Ou importar `postman/CAS-Login-Tenant-R1132100929518.*` e executar requests 0 → 1 → 2.

---

## 5. Pendências para implementar

### 5.1 Bloqueante — desbloquear CAS (prioridade máxima)

| # | Pendência | Responsável | Ação |
|---|-----------|-------------|------|
| P1 | Validar CAS no Postman local | Enderson | Executar collection CAS; registrar status CSRF |
| P2 | Confirmar usuário é membro **nativo** do tenant R1132100929518 | Admin 3DS | Platform Management → Members |
| P3 | Verificar **Restrict Usage to this Platform** | Admin 3DS | Desabilitar se cross-company |
| P4 | Confirmar permissão **Web Services / CAS server-side** | Admin 3DS / SR | Perguntar se IP cloud (Render) precisa whitelist |
| P5 | Avaliar **Openness Agent Cloud** | Admin + dev | Se CAS user batch não for permitido |
| P6 | Corrigir hint enganoso em authcheck | Dev (futuro) | Mensagem específica para `tenant does not exist` com space OK |

**Critério de aceite CAS:**

```bash
curl -s https://bom-resolver.onrender.com/api/3dx/bom/health/authcheck
# casLoginOk: true, canReadKnownRoot: true

curl -s -X POST https://bom-resolver.onrender.com/api/3dx/bom/structure \
  -H "Content-Type: application/json" \
  -d '{"rootId":"63FC553465A62400699E0792000086AB","depth":1}'
# 5 rows, totalRows: 5
```

### 5.2 Produto — 3D real (tenant)

Ver [admin-dassault-checklist.md](./tenant-unblock/admin-dassault-checklist.md) — Pedido 1.

- Derived Format Converter + regra GLB/glTF
- `dsdo:DerivedOutputs/Locate` retorna `fileCount:0` hoje

### 5.3 Produto — maturidade real (tenant)

Ver [admin-dassault-checklist.md](./tenant-unblock/admin-dassault-checklist.md) — Pedido 2.

- Invoke per-item 404; global `changeMaturity` 500
- Backend pronto em `/api/3dx/lifecycle/*`

### 5.4 Roadmap código (não urgente)

| Fase | Item | Status |
|------|------|--------|
| Fase 5 | Limpeza legacy mirror/clipboard | Pendente — `docs/LEGACY-CLEANUP-PLAN.md` |
| Openness Agent | Integração `ds.authentication` equivalente | Não iniciado |
| Hint authcheck | Mensagem correta pós-diagnóstico | Pendente |

---

## 6. Restrições do projeto (não violar)

- ❌ Não depender de `ENOVIA_COOKIE` manual
- ❌ Não trocar widget/build (`bom20260617d`)
- ❌ Não reintroduzir Explorer Mirror como fonte principal
- ❌ Não alterar 3D/maturidade/layout neste fluxo de auth

---

## 7. Referências oficiais

| Tema | URL |
|------|-----|
| CAS Protocol | https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAiamPassport/CAAiamPassportCASProtocol.htm |
| CAS Login Ticket API | https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAiamPassport/CAAiamPassportAPILoginTicket.htm |
| Postman Primer | https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw |
| Cloud Web Services doc | https://media.3ds.com/support/documentation/developer/Cloud/en/DSDoc.htm |
| .NET SDK (auth modes) | https://github.com/3ds-cpe-emed/3dxws-dotnet-core-sdk |
| Platform login issues | https://3dswym.3dexperience.3ds.com/wiki/3dexperience-platform-user-s-community/platform-access-login-issues_egmBDta6RKa94DZv15SI4Q |
| Arquitetura DEC-018 | [DEC-018-RENDER-BOM-SERVICE-ARCHITECTURE.md](./DEC-018-RENDER-BOM-SERVICE-ARCHITECTURE.md) |
| Contrato API | [API-CONTRACT-BOM-SERVICE.md](./API-CONTRACT-BOM-SERVICE.md) |

---

## 8. Arquivos-chave no repositório

| Área | Arquivos |
|------|----------|
| CAS auth | `backend/src/services/threeDxCasAuth.js` |
| Config | `backend/src/services/threeDxConfig.js`, `render.yaml` |
| Health/authcheck | `backend/src/services/threeDxBomService.js` |
| dseng client | `backend/src/services/threeDxDsengClient.js` |
| Frontend hotfix | `assets/js/bom-ska-service-hotfix-20260617d.js` |
| Postman | `postman/CAS-Login-Tenant-R1132100929518.*` |
| Probe | `backend/scripts/postman-cas-probe.mjs` |

---

## 9. Histórico de commits relevantes (auth)

| Commit | Descrição |
|--------|-----------|
| `19919c5` | Postman CAS collection + probe script |
| `0b8bf89` | Derive space URL from ifwe; spaceUrlHost on health |
| `71eb1c0` | Detect CAS login without service ticket; 401 body detail |
| PR #40 | Root resolution frontend (mergeado) |
| PR #41 | CAS automático (referência) |

---

*Documento gerado após pedido explícito de parar alterações de código e consolidar status. Próximo passo operacional: teste Postman local + SR Dassault se falhar igual.*
