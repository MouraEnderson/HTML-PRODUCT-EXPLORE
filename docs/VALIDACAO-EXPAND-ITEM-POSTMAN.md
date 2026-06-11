# Validação Postman — Expand Item dseng (DEC-015)

**Data do protocolo:** 2026-06-11  
**Build widget:** `bom20260614e`  
**PR:** #11 — **sem merge** até Postman/probe OK + `__expandItemProbe(2)` no dashboard  
**Tenant:** `R1132100929518`

---

## Objetivo

Provar **fora do widget** se o endpoint oficial Expand Item funciona no tenant com:

- autenticação Passport/CAS válida;
- CSRF oficial (`GET /application/CSRF` → `ENO_CSRF_TOKEN`);
- `SecurityContext` correto;
- `ROOT_ID` interno VPMReference (32 hex);
- host **3DSpace `*-space`** (nunca `*-ifwe`).

---

## Variáveis fixas (tenant piloto)

| Variável | Valor |
|----------|--------|
| `SPACE_URL` | `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia` |
| `ROOT_ID` | `63FC553465A62400699E0792000086AB` |
| `SECURITY_CONTEXT` | `ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO` |
| `EXPAND_DEPTH` | `2` |
| CSRF endpoint | `{{SPACE_URL}}/resources/v1/application/CSRF` |
| Expand endpoint | `{{SPACE_URL}}/resources/v1/modeler/dseng/dseng:EngItem/{{ROOT_ID}}/expand` |

---

## Artefatos no repositório

| Arquivo | Uso |
|---------|-----|
| `postman/Expand-Item-DEC015.postman_collection.json` | Collection Postman (3 requests em ordem) |
| `postman/Expand-Item-Tenant-R1132100929518.postman_environment.json` | Environment com variáveis acima |
| `scripts/expand-item-postman-probe-dashboard.mjs` | Equivalente no console do iframe widget (WAFData + mesma sessão) |

### Importar no Postman

1. Postman → Import → `postman/Expand-Item-DEC015.postman_collection.json`
2. Import → `postman/Expand-Item-Tenant-R1132100929518.postman_environment.json`
3. Selecionar environment **Expand Item — Tenant R1132100929518**
4. Autenticar (ver abaixo)
5. Executar requests **1 → 2 → 3** em ordem

### Autenticação Postman (padrão oficial)

Usar uma das opções documentadas DS / ENOVIA User Community:

1. **Collection Postman Primer** ([3DEXPERIENCE Web Services Postman Primer](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw))  
   - Login Ticket + CAS Service Login → cookie de sessão no Postman  
2. **Cookie do navegador** (Chrome DevTools → Application → Cookies do tenant) exportado para Postman — somente se permitido pela política do tenant.

Fluxo mínimo após login:

```
GET Login Ticket → CAS Login → (cookie CASTGC/sessão)
GET {{SPACE_URL}}/resources/v1/application/CSRF
GET/POST demais endpoints
```

**Proibido:** token inventado, header fake, `x-csrf-token`, `X-CSRF-Token`.

---

## Etapa 1 — GET CSRF

```http
GET {{SPACE_URL}}/resources/v1/application/CSRF
Accept: application/json
```

### Resultado esperado

```json
{
  "csrf": {
    "name": "ENO_CSRF_TOKEN",
    "value": "<token>"
  }
}
```

| Campo relatório | Valor |
|-----------------|-------|
| CSRF status | _(preencher)_ |
| csrf.name | _(preencher)_ |
| csrf.value present | true / false |
| CSRF response | _(JSON ou erro)_ |

Se CSRF falhar → **parar**; não testar expand.

---

## Etapa 2 — Validar ROOT_ID

```http
GET {{SPACE_URL}}/resources/v1/modeler/dseng/dseng:EngItem/{{ROOT_ID}}
Accept: application/json
SecurityContext: {{SECURITY_CONTEXT}}
```

| Campo relatório | Valor |
|-----------------|-------|
| Root validation status | _(preencher)_ |
| Root title | _(preencher)_ |
| Root type | _(VPMReference esperado)_ |
| Root state | _(preencher)_ |
| Root id | _(preencher)_ |

| Status | Interpretação |
|--------|----------------|
| 200 | Seguir para expand |
| 403 | SecurityContext/permissão — **não adianta expand** |
| 404 | ROOT_ID errado |

---

## Etapa 3 — POST Expand Item (contrato dseng_v1)

```http
POST {{SPACE_URL}}/resources/v1/modeler/dseng/dseng:EngItem/{{ROOT_ID}}/expand
Accept: application/json
Content-Type: application/json
SecurityContext: {{SECURITY_CONTEXT}}
ENO_CSRF_TOKEN: {{csrf.value}}
```

Body (raw JSON):

```json
{
  "expandDepth": 2,
  "withPath": true,
  "type_filter_bo": ["VPMReference", "VPMRepReference"],
  "type_filter_rel": ["VPMInstance", "VPMRepInstance"]
}
```

**Não usar:** host ifwe, GET expand, form-data, x-www-form-urlencoded, x-csrf-token.

### Registro obrigatório do POST

| Campo | Valor |
|-------|-------|
| POST Expand status | _(preencher)_ |
| POST Expand response headers | _(preencher)_ |
| POST Expand response body | _(preencher ou anexar)_ |
| totalItems | _(preencher)_ |
| member count | _(preencher)_ |
| VPMReference count | _(preencher)_ |
| VPMInstance count | _(preencher)_ |
| Path count | _(preencher)_ |
| first Path | _(preencher)_ |
| first VPMReference | _(preencher)_ |
| first VPMInstance | _(preencher)_ |

---

## Matriz de conclusão (A–E)

| Status | Classificação | Próximo passo |
|--------|---------------|---------------|
| **200** + `member` + `{ Path: [...] }` | **A — API OK** | Build `bom20260614f`: widget = mesmo contrato Postman (CSRF GET + `ENO_CSRF_TOKEN` + space-only) |
| **403** | **B — Permissão/contexto** | Checklist admin; **não** patch widget |
| **404** | **C — rootId/URL** | Revalidar ROOT_ID 32 hex |
| **405** | **D — método/URL** | Confirmar POST em `*-space*`; **nunca ifwe** |
| **400** | **E — body/schema** | Ajustar body dseng_v1 |
| **415** | **E — Content-Type** | raw JSON + `application/json` |

---

## Tentativa Cloud Agent (sem sessão Passport)

Executado em 2026-06-11 a partir do ambiente CI (sem cookie CAS):

| Request | URL | Status | Observação |
|---------|-----|--------|------------|
| GET CSRF | `...-space.../application/CSRF` | **302** | Redirect login — sessão ausente |
| GET EngItem | `.../dseng:EngItem/63FC...` | **302** | Redirect login — sessão ausente |

**Conclusão Cloud Agent:** não é possível completar Postman real sem credenciais/sessão do tenant. A validação definitiva deve ser feita por:

1. **Postman** com login CAS no tenant, ou  
2. **Probe dashboard** no iframe autenticado (abaixo).

---

## Probe equivalente no 3DDashboard (iframe widget)

Com dashboard piloto logado e pill `bom20260614e`:

```javascript
// Console do IFRAME do widget BOM
await fetch('https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/scripts/expand-item-postman-probe-dashboard.mjs')
  .then(r => r.text())
  .then(src => {
    const blob = new Blob([src], { type: 'text/javascript' });
    return import(URL.createObjectURL(blob));
  })
  .then(m => m.runExpandItemPostmanProbe());

// Relatório estruturado:
window.__expandItemPostmanReport
```

O probe executa **exatamente** a sequência Postman via `WAFData.authenticatedRequest`:

1. GET CSRF  
2. GET EngItem root  
3. POST expand com `ENO_CSRF_TOKEN` + `SecurityContext` + body oficial  

**Não altera** normalizador, tabela, layout nem provider.

Copiar `window.__expandItemPostmanReport` para a seção **Resultado preenchido** abaixo.

---

## Resultado preenchido (tenant — aguardando execução manual)

> Preencher após Postman ou `runExpandItemPostmanProbe()` no dashboard.

| Item | Resultado |
|------|-----------|
| Data/hora teste | _pendente_ |
| Executor | _Postman / probe dashboard_ |
| CSRF status | _pendente_ |
| csrf.name | _pendente_ |
| csrf.value present | _pendente_ |
| Root validation status | _pendente_ |
| Root title | _pendente_ |
| POST Expand status | _pendente_ |
| Path count | _pendente_ |
| normalizedRows esperado | _após probe widget_ |
| **Conclusão final** | _A / B / C / D / E — pendente_ |
| **Decisão** | _WAFData direto / Additional App / backend-auth / admin — pendente_ |

### Exemplo Path (se status 200)

```json
_Pendente — colar primeiro objeto { "Path": [...] } real_
```

---

## Se Postman = 200 (Etapa 7 — próximo patch, não aplicado ainda)

Somente após **A** confirmado:

- Build `bom20260614f`
- URL sempre `SPACE_URL` (`*-space`)
- POST oficial + `Content-Type: application/json`
- `GET /application/CSRF` antes do POST
- Header dinâmico `csrf.name` (normalmente `ENO_CSRF_TOKEN`)
- **Remover** swap ifwe e `proxifiedRequest` sobre ifwe
- Testar: `await window.__expandItemProbe(2)` → status 200, pathCount > 0

---

## Se Postman = 403 (Etapa 8)

Checklist admin (parar desenvolvimento widget):

- [ ] Usuário tem acesso ao collabspace do objeto?
- [ ] `SecurityContext` = mesmo do Product Structure Explorer?
- [ ] Role `VPLMProjectLeader` permite expand via API dseng?
- [ ] Objeto root pertence ao collabspace `CS_IMPLANTACAO`?
- [ ] Licença cobre API dseng expand?
- [ ] Restrição tenant no endpoint `/expand`?
- [ ] Expand visual no Explorer OK mas API exige role diferente?

---

## Se Postman = 200 mas widget falha (Etapa 9)

| Sintoma widget | Classificação | Solução |
|----------------|---------------|---------|
| ResponseCode 0 / CORS com `ENO_CSRF_TOKEN` | Web Page Reader / GitHub Pages | Additional App trusted ou backend browser-auth |
| 403 com CSRF no Postman OK | Sessão/cookie iframe | Additional App ou backend-auth |
| 405 | Host ifwe ou método errado | Apenas `*-space*` |

---

## Referências

- [dseng_v1](https://media.3ds.com/support/documentation/developer/Cloud/en/DSDoc.htm?show=CAAEngineeringWS/dseng_v1.htm) (login 3DEXPERIENCE ID)
- [Postman Primer ENOVIA](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw)
- [CSRF token EKL wiki DS](https://3dswym.3dexperience.3ds.com/wiki/delmia-process-engineering/how-to-get-csrf-token-in-ekl_euCHu0sFRzCJgPbiSz38Ng)
- [Widget HTTP Request — WAFData](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSWS/CAAWebAppsTaDataAccess.htm)
- [Web Page Reader vs Additional App](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm)
- `docs/DEC-015-EXPAND-ITEM-PROVIDER.md`

---

## Gate merge PR #11

- [ ] GET CSRF 200 + token presente  
- [ ] Root validation 200  
- [ ] POST expand 200 + Path count > 0  
- [ ] Relatório acima preenchido  
- [ ] `__expandItemProbe(2)` no dashboard com Path real  
- [ ] Tabela = `rows.length` após Atualizar estrutura  

**Até lá: nenhum merge; nenhum patch widget além do protocolo de validação.**
