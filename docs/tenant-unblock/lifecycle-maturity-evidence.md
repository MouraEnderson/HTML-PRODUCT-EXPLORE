# Evidências — lifecycle / maturidade (tenant unblock)

**Projeto:** BOM Analytics 3DEXPERIENCE  
**Repositório:** MouraEnderson/HTML-PRODUCT-EXPLORE  
**Data de referência:** 2026-06-18  
**Commit main (pré-correção):** `63ee892`  
**Commit correção dashboard:** `7dcae3b`

---

## 0. Dashboard regression (corrigida)

Antes da correção `7dcae3b`, SyntaxError no hotfix impedia todo o serviço SKA de instalar → E-BOM 0 linhas. **Não confundir** bloqueio de maturidade (seção abaixo) com essa regressão de frontend, já corrigida.

---

## 1. Resumo

A dashboard possui **modal e backend** para mudança de maturidade PLM. O backend:

- **Não infere** transições (IN_WORK→FROZEN removido).
- Só retorna sucesso se **reler o EngItem** e confirmar `newState === targetState`.
- Expõe rotas `/api/3dx/lifecycle/transitions` e `/change-maturity`.

No tenant piloto, **nenhuma transição oficial** foi retornada e **change-maturity não alterou o estado**. O modal no widget corretamente **bloqueia** a operação.

---

## 2. Objeto testado

| Campo | Valor |
|-------|-------|
| Item | Tampo |
| referenceId | `63FC553465A62400699DB56700005253` |
| currentState | `IN_WORK` |
| targetState testado | `FROZEN` |
| transition | promote |
| **stateAfter** | **`IN_WORK`** (inalterado) |

**Security context (Render):** `ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO`  
**Auth:** cookie de serviço (não exposto em logs).

---

## 3. Endpoints / tentativas testadas

### 3.1 Consulta de transições

| Invoke / Endpoint | Método | Payload resumido | HTTP | Resultado |
|-------------------|--------|------------------|------|-----------|
| `dseng:EngItem/{id}/invoke/dseng:GetNextStates` | POST | currentState IN_WORK | **404** | URI not Found |
| `.../invoke/dseng:getNextStates` | POST | idem | **404** | URI not Found |
| `.../invoke/dseng:GetTransitions` | POST | idem | **404** | URI not Found |
| `.../invoke/dseng:getTransitions` | POST | idem | **404** | URI not Found |
| `.../invoke/dseng:GetMaturityTransitions` | POST | idem | **404** | URI not Found |
| `.../invoke/dseng:GetLifecycleTransitions` | POST | idem | **404** | URI not Found |
| `.../invoke/dseng:NextStates` | POST | idem | **404** | URI not Found |
| `dseng/invoke/dseng:getNextStates` (global) | POST | array EngItem | **500** | Internal Error |
| `dseng/invoke/dseng:GetNextStates` (global) | POST | array EngItem | **500** | Internal Error |

**Rota Render:** `POST /api/3dx/lifecycle/transitions`

```json
{
  "ok": false,
  "code": "LIFECYCLE_TRANSITIONS_UNAVAILABLE",
  "currentState": "IN_WORK",
  "transitions": []
}
```

### 3.2 Mudança de maturidade (teste controlado)

| Invoke / Endpoint | Método | HTTP | Resultado |
|-------------------|--------|------|-----------|
| `.../invoke/dseng:ChangeMaturity` | POST | **404** | URI not Found |
| `.../invoke/dseng:changeMaturity` | POST | **404** | URI not Found |
| `.../invoke/dseng:Promote` | POST | **404** | URI not Found |
| `.../invoke/dseng:Demote` | POST | **404** | URI not Found |
| `.../invoke/dseng:SetState` | POST | **404** | URI not Found |
| `dseng/invoke/dseng:changeMaturity` (global) | POST | **500** | Internal Error |

**Rota Render:** `POST /api/3dx/lifecycle/change-maturity`

```json
{
  "ok": false,
  "code": "TRANSITION_NOT_PERMITTED",
  "previousState": "IN_WORK",
  "targetState": "FROZEN",
  "stateAfter": "IN_WORK"
}
```

### 3.3 dslc (candidatos)

| Endpoint | HTTP | Resultado |
|----------|------|-----------|
| `POST .../dslc/dslc:changeMaturity` | **404** | Não encontrado |
| `POST .../dslc/invoke/dslc:changeMaturity` | **404** | Não encontrado |
| `POST .../dslc/dslc:Lifecycle/changeMaturity` | **404** | Não encontrado |

---

## 4. Evidência sanitizada

Resumo de tentativa per-item (exemplo):

```json
{
  "invoke": "dseng:GetNextStates",
  "scope": "item",
  "status": 404,
  "summary": "{\"status\":404,\"message\":\"URI not Found.\"}"
}
```

Resumo invoke global:

```json
{
  "invoke": "dseng:changeMaturity",
  "scope": "global",
  "status": 500,
  "summary": "{\"status\":500,\"message\":\"Internal Error. Please, contact your administrator.\"}"
}
```

Sem cookie, token, bearer ou authorization nos artefatos de probe.

---

## 5. Conclusão técnica

```txt
O bloqueio NÃO está no modal frontend.
O bloqueio É que o tenant/API atual não expõe transições oficiais
nem aceita promote/demote/changeMaturity com o contrato REST testado.

O backend corretamente retornou TRANSITION_NOT_PERMITTED
e manteve stateAfter = IN_WORK.
```

---

## 6. Pesquisa de endpoints — maturidade direta (sem Change Action)

**Premissa:** maturidade direta no EngItem/VPMReference; Change Action **não** é caminho principal (aplica-se a itens configurados ou processo controlado).

### 6.1 Candidatos REST (oficiais dseng/dslc)

| Endpoint | Método | Payload típico | Status tenant R1132100929518 |
|----------|--------|----------------|------------------------------|
| `POST .../dseng:EngItem/{id}/invoke/dseng:GetNextStates` | POST | `{ currentState }` | **404** URI not Found |
| `POST .../dseng:EngItem/{id}/invoke/dseng:changeMaturity` | POST | `{ targetState, transition }` | **404** |
| `POST .../dseng/invoke/dseng:changeMaturity` | POST | `[{ identifier, type, source, targetState }]` | **500** Internal Error |
| `POST .../dslc/dslc:changeMaturity` | POST | `{ identifier, targetState }` | **404** |

Headers esperados (Cloud REST): cookie CAS + `ENO_CSRF_TOKEN` em mutações ([Postman Primer DS](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw)).

### 6.2 Referência C++ (não REST, confirma modelo)

`CATAdpMaturityServices::GetStateAndPossibleTransitions` / `ApplyMaturityTransition` — transição direta por grafo de maturidade do tipo de objeto ([CATAdpMaturityServices](http://www.q-solid.com/CATIA_Doc/generated/refman/CATPLMIntegrationAccess/class_CATAdpMaturityServices_51381.htm)).

### 6.3 PDFs tenant-unblock

PDFs 3DEXPERIENCE Platform (Upgrade Guide, Monitoring, Trace Dictionary) ajudam com traces/F12/FCS/service URL — **não** expõem endpoint REST pronto de changeMaturity.

### 6.4 Conclusão pesquisa

**Status maturidade direta: FAIL** no tenant piloto. Candidatos oficiais identificados (dseng invoke); nenhum respondeu com transições ou mudança de estado. Requer confirmação Dassault do contrato REST Cloud R2026x.

---

## 7. Perguntas para admin / Dassault

1. Qual **endpoint REST oficial** muda maturidade de **EngItem/VPMReference** neste tenant (Cloud)?
2. Qual **payload correto** para `changeMaturity` (array vs objeto, `targetState` Frozen vs FROZEN)?
3. O serviço é **dseng/invoke**, **dslc**, ENOVIA legacy ou outro?
4. Quais **roles** e **security context** são obrigatórios?
5. A conta com `ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO` pode promover IN_WORK→FROZEN?
6. A operação exige **lock/reservation** no item?
7. É necessário **token de usuário interativo** em vez de cookie de serviço?
8. Quais estados/transições reais existem na policy **Engineering Definition** deste item?
9. Como consultar transições permitidas **antes** de executar (equivalente GUI “Changing Maturity”)?
10. Existe contrato diferente para **R2026x** Cloud?

---

## 7. Opções de desbloqueio

| Opção | Descrição |
|-------|-----------|
| **A** | Admin fornecer endpoint + payload oficial de change maturity |
| **B** | Habilitar permissão / security context / role Leader no collaborative space |
| **C** | Usar credencial de **usuário interativo** se serviço bloquear conta técnica |
| **D** | Ajustar payload para contrato real do tenant (após documentação) |
| **E** | Integrar serviço lifecycle correto (dslc/outro) após confirmação Dassault |

---

## 8. Reteste

```bash
cd backend
npm run probe:tenant -- 63FC553465A62400699E0792000086AB 63FC553465A62400699DB56700005253
```

Mudança destrutiva (somente ambiente seguro):

```bash
npm run probe:tenant -- 63FC553465A62400699E0792000086AB 63FC553465A62400699DB56700005253 --change --target FROZEN
```

Via Render:

```bash
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/lifecycle/transitions \
  -H "Content-Type: application/json" \
  -d '{"referenceId":"63FC553465A62400699DB56700005253","mode":"dseng-official"}'
```

**Aceite:** `ok:true`, `transitions` não vazio; após `--change`, `newState === targetState`.
