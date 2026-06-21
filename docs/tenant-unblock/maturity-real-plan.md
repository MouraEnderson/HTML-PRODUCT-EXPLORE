# Maturidade real via WAFData session — plano e status

**Build:** `bom20260617d`  
**Cliente:** `window.__waf3dxClient`  
**Modo:** read-only no diagnóstico; write somente com releitura verificada

---

## Fluxo alvo

1. Usuário seleciona item real (clique E-BOM).
2. `GET dseng:EngItem/{id}` → estado atual.
3. `POST .../invoke/dseng:GetNextStates` → transições permitidas.
4. Usuário escolhe transição → `changeMaturity()` tenta invokes oficiais.
5. **Releitura** `GET EngItem` → sucesso só se `stateAfter !== stateBefore`.

---

## Endpoints implementados

| Operação | Endpoint | Função |
|----------|----------|--------|
| Read state | `GET .../dseng:EngItem/{id}` | `getMaturity(id)` |
| Transitions | `POST .../invoke/dseng:GetNextStates` | `getAllowedMaturityTransitions(id)` |
| Change (candidatos) | `POST .../invoke/dseng:ChangeMaturity` / `Promote` / `SetState` | `changeMaturity(id, transition)` |

**Referência backend:** `backend/src/services/threeDxLifecycleService.js` — mesma ordem de invokes candidatos.

---

## Fontes pesquisadas

| Fonte | Notas |
|-------|-------|
| DSDoc IAM REST / lifecycle | invoke EngItem documentado para cloud em variantes dseng |
| Backend `INVOKE_TRANSITION_CANDIDATES` | lista oficial testada no Render |
| UI nativa | se invoke falhar: capturar F12 ao mudar maturidade manualmente |

---

## Critério de aceite

```json
{
  "maturityReadOk": true,
  "transitionsLoaded": true,
  "changeExecuted": true,
  "verifiedByReread": true,
  "stateBefore": "...",
  "stateAfter": "...",
  "success": true
}
```

**Erro honesto sem permissão:**

```json
{
  "success": false,
  "status": 403,
  "blocker": "User session lacks permission or endpoint is not available",
  "nextAction": "Validar role PLM ou capturar invoke exato da UI nativa"
}
```

---

## Status atual

| Item | Status |
|------|--------|
| Probe read-only no widget | ✅ `Testar maturidade read-only` |
| Painel lateral → consulta transições WAF | ✅ `loadLifecycleForRowWaf` |
| Botão alterar maturidade → `changeMaturity` + reread | ✅ implementado (invokes candidatos) |
| Sucesso sem reread | ❌ proibido — código exige `verifiedByReread` |

**Item de teste:** Tampo `63FC553465A62400699DB56700005253`

---

## Instrução F12 (se invokes falharem)

1. No 3DEXPERIENCE, abrir item de teste e mudar maturidade manualmente.
2. DevTools → Network → filtrar `invoke`, `maturity`, `lifecycle`, `dseng`.
3. Exportar URL + método + payload **sanitizado** (sem cookies/CSRF).
4. Mapear invoke name exato do tenant e adicionar ao cliente.

---

## Dependências

- **Fase 1 E-BOM** (expand OK) não bloqueia leitura de maturidade de item individual, mas seleção na tabela depende de E-BOM carregada.
- Write requer permissão PLM equivalente à UI nativa.
