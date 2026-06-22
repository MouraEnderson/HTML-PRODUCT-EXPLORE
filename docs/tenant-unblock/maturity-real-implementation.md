# Maturidade real via WAFData session — implementação

**Build:** `bom20260617d` / cache `waf3dx20260620e`  
**Cliente:** `window.__waf3dxClient`  
**Item teste:** Tampo `63FC553465A62400699DB56700005253`

---

## Read-only (implementado)

| Etapa | Endpoint | Função |
|-------|----------|--------|
| Estado atual | `GET .../dseng:EngItem/{id}` | `getMaturity(id)` |
| Transições | `POST .../invoke/dseng:GetNextStates` | `getAllowedMaturityTransitions(id)` |

Matriz automática adicional: `testMaturityWriteCandidates(id)` testa invokes documentados e registra HTTP status no JSON sanitizado.

---

## Write (com releitura obrigatória)

Fluxo em `changeMaturity(id, transition)`:

```js
const before = await getMaturity(id);
const result = await tryInvoke(['ChangeMaturity','Promote','SetState',…]);
const after = await getMaturity(id);
return {
  stateBefore: before.current,
  stateAfter: after.current,
  verifiedByReread: after.current !== before.current
};
```

**Sucesso só com `verifiedByReread: true`** — nunca aceita mudança visual local.

Modal **Alterar maturidade** no hotfix chama `changeMaturity` em modo `wafdata-session`.

---

## Evidência tenant piloto

| Teste | Resultado |
|-------|-----------|
| GET EngItem state | ✅ PASS |
| `invoke/dseng:GetNextStates` | ❌ **404** |
| Write invokes testados | 403/404 — sem endpoint funcional identificado |

Resposta esperada no Executor:

```json
{
  "maturityReadOk": true,
  "transitionsLoaded": false,
  "changeExecuted": false,
  "verifiedByReread": false,
  "testedEndpoints": [
    { "invoke": "dseng:GetNextStates", "status": 404 },
    { "invoke": "dseng:ChangeMaturity", "status": 404 }
  ],
  "nextAction": "GetNextStates 404 — write bloqueado no tenant"
}
```

---

## Validação automatizada

**Avançado → Executor 3DX → Testar maturidade** ou **Executar validação completa**.

Write real só executa em `runFullValidation({ testMaturityWrite: true })` quando transições existirem — uso controlado, sempre com releitura.
