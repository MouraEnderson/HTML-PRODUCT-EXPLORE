# WAFData session validation — BOM Analytics

**Build:** `bom20260617d`  
**Probe:** `assets/js/wafdata-probe-bom20260617d.js`  
**Objetivo:** validar se o widget no 3DDashboard/Web Page Reader consegue chamar 3DSpace usando a **sessão do usuário logado** (WAFData), sem Render CAS e sem cookie manual.

---

## Como rodar

No console do **frame do widget** (Web Page Reader no 3DDashboard):

```js
window.__bomWafProbe.runAll()
```

Ou botão em **Avançado** → **Testar sessão 3DX**.

Probes individuais:

```js
window.__bomWafProbe.probeWafAvailability()
window.__bomWafProbe.probeGetRoot()
window.__bomWafProbe.probeExpand()
window.__bomWafProbe.probeDerivedOutput()
window.__bomWafProbe.probeMaturityReadOnly()
```

Constantes (somente leitura):

```js
window.__bomWafProbe.constants
```

---

## O que o probe testa

| # | Teste | Endpoint / ação |
|---|--------|-----------------|
| 1 | WAFData disponível | `require(['DS/WAFData/WAFData'])` ou `window.WAFData` |
| 2 | GET root CJ MESA | `GET .../dseng:EngItem/63FC553465A62400699E0792000086AB` |
| 3 | Expand depth=1 | `POST .../expand` (CSRF automático se necessário) |
| 4 | Derived Output (read-only) | `dseng expand` 3DShape + `dsdo:DerivedOutputs/Locate` (Tampo) |
| 5 | Maturidade (read-only) | `GET EngItem` state + `invoke/dseng:GetNextStates` (sem promote) |

**Não faz:** cookie manual, salvar token, mudança de maturidade, download FCS.

---

## Resultado esperado (PASS)

```json
{
  "wafAvailable": true,
  "canReadRoot": true,
  "expandOk": true,
  "rowsDetected": 5,
  "pass": true,
  "recommendation": "PASS — WAFData session can load E-BOM..."
}
```

---

## Registro de execução (preencher após teste no tenant)

| Campo | Valor |
|-------|--------|
| Data | 2026-06-20 |
| Frame | Web Page Reader / 3DDashboard |
| Usuário | enderson.moura@ska.com.br |
| **1. WAFData disponível** | _pendente no 3DDashboard — cloud sem sessão_ |
| **2. GET root status** | _pendente_ |
| **3. Expand status** | _pendente_ |
| **4. CSRF necessário?** | _pendente_ |
| **5. dsdo Locate** | _pendente_ |
| **6. Maturity read-only** | _pendente_ |
| **7. pass** | _pendente_ |

### Evidência automática (cloud agent — 2026-06-20)

**3DDashboard (Playwright headless):** redirecionou para login 3DPassport — **sem sessão** no browser da cloud.

**Widget GitHub Pages direto (sem 3DDashboard):**

```json
{
  "wafAvailable": false,
  "error": "WAFData module not available in Web Page Reader frame (require missing)",
  "pass": false
}
```

→ Esperado fora do 3DDashboard. O teste decisivo **só** roda no iframe do dashboard com usuário logado.

### Evidência console (colar após run no 3DDashboard)

```js
window.__bomWafProbe.runAll()
```

```json
(paste aqui o resultado de runAll())
```

---

## Interpretação

### WAFData disponível = false

- Web Page Reader pode não expor AMD `DS/WAFData/WAFData` no iframe GitHub Pages.
- **Recomendação:** manter Render como backend; avaliar Additional App nativo ou proxy no tenant.

### WAFData OK + root OK + expand FAIL

- Sessão válida para leitura simples; POST bloqueado (CSRF, role, ou contrato expand).
- Verificar SecurityContext e role VPLMProjectLeader.

### WAFData OK + expand 5 linhas (PASS)

- **E-BOM pode migrar** para fonte WAFData no dashboard (fase documentada, não implementada nesta tarefa).
- Render ainda útil para: probes offline, CI, usuários fora do 3DDashboard, 3D/maturidade server-side.

### dsdo fileCount = 0

- Igual evidência tenant-unblock — Derived Format não configurado (não é falha do probe).

### Maturity GetNextStates 404/500

- Pendência tenant (documentado em `lifecycle-maturity-evidence.md`).

---

## Próxima recomendação arquitetural

| Cenário | Próximo passo |
|---------|----------------|
| **PASS** (WAFData + 5 linhas) | PR fase 2: `BOM_DATA_SOURCE=wafdata-session` no hotfix, fallback Render |
| **PARTIAL** (root OK, expand fail) | Debug CSRF/roles com admin 3DS |
| **FAIL** (sem WAFData) | Manter Render; SR Dassault para CAS/Openness Agent |

---

## Arquivos

| Arquivo | Função |
|---------|--------|
| `assets/js/wafdata-probe-bom20260617d.js` | Probe + `window.__bomWafProbe` |
| `assets/js/widget-runtime-bom20260617d.js` | Carrega probe após hotfix |
| `docs/tenant-unblock/wafdata-session-validation.md` | Este documento |

---

## Critério de aceite desta tarefa

- [x] Probe criado e exposto no console
- [x] Sem cookie manual / sem persistir segredo
- [x] Botão opcional Avançado
- [ ] Execução no 3DDashboard com JSON de evidência (requer usuário no tenant)

**Nota:** o agente cloud não executa WAFData no 3DDashboard — o resultado real deve ser colado na seção "Registro de execução" acima.
