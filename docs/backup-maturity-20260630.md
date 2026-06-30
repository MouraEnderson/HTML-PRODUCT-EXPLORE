# BOM Analytics — Backup Estável: Maturity Write Funcional

## BACKUP

**SHA:** `7d1ec67e4fd30e83d8eaba8aa3095d3e23093dee`
**Data:** 2026-06-30 22:27 UTC
**Para restaurar:** `git reset --hard 7d1ec67e4fd30e83d8eaba8aa3095d3e23093dee`

---

## Estado funcional completo neste ponto

| Item | Status |
|------|--------|
| Widget carrega no F5 | ✅ UWA lifecycle oficial |
| E-BOM com dados reais | ✅ 92 linhas CJ MESA, depth 20 |
| Contagem sem limite | ✅ Todas as rows processadas |
| Gráficos pizza | ✅ Saúde Maturidade + Proprietários |
| IDs reais no clique | ✅ Reference ID, Instance ID |
| Resolução CJ MESA | ✅ Via registry (instantâneo) |
| Resolução genérica prd-R | ✅ Via UQL (qualquer projeto) |
| Modal maturidade | ✅ Abre com transições locais |
| **Maturity write (promote)** | ✅ **Funcional via endpoint real** |
| Repositório limpo | ✅ 10 arquivos ativos |

## Pendente

| Item | Detalhe |
|------|---------|
| 3D/2D viewer | Thumbnail da peça ao selecionar item |
| Demote maturity | Testar `/resources/lifecycle/maturity/demote` |

---

## Problema resolvido: Maturity Write

### O problema

Nenhum endpoint REST documentado funcionava para alterar maturidade no tenant cloud:

| Endpoint testado | Método | Status | Resultado |
|-----------------|--------|--------|-----------|
| `dseng:EngItem/{id}/invoke/dseng:GetNextStates` | POST | 404 | Não existe |
| `dseng:EngItem/{id}/invoke/dseng:ChangeMaturity` | POST | 404 | Não existe |
| `dseng:EngItem/{id}/invoke/dseng:Promote` | POST | 404 | Não existe |
| `dseng:EngItem/{id}/invoke/dseng:SetState` | POST | 404 | Não existe |
| `/resources/v1/modeler/dslc/` | GET | 404 | Modeler não existe |
| `/resources/v1/modeler/dscfg/dscfg:ChangeAction` | GET | 404 | Modeler não existe |
| `/resources/v1/modeler/dslib/dslib:ChangeAction` | GET | 404 | Modeler não existe |
| `dseng:EngItem/{id}` PATCH `{state:"FROZEN"}` | PATCH | 400 | "state is not an attribute of dseng:EngItem type" |
| `dseng:EngItem/{id}` PATCH `{ceStamp, state}` | PATCH | 400 | Mesmo erro |
| `/model/changeactions/{id}/lifecycle` | POST | 404 | ID não é Change Action |
| `DS/Visualization/Viewer3D` (AMD) | require | 404 | Módulo não existe |

**Todos os endpoints documentados na API pública retornaram 404 ou 400.**

### A descoberta

A documentação DS e fóruns não documentam o endpoint real para cloud. A solução foi **capturar o tráfego da UI nativa** (Collaborative Lifecycle) durante uma operação de promote real:

1. Abrir Collaborative Lifecycle no 3DDashboard
2. F12 → Network → Preserve log → Filter Fetch/XHR
3. Promover um item de IN_WORK → FROZEN pela UI
4. Capturar a requisição `promote` que retornou 200

### O endpoint real

```
POST /enovia/resources/lifecycle/maturity/promote?tenant=R1132100929518
```

**Nota:** NÃO é `/resources/v1/modeler/dseng/...`. É `/resources/lifecycle/maturity/promote` — path completamente diferente do padrão documentado.

### Payload

```json
{
  "data": [{
    "physicalid": "B976537070BA110065FD9C9F001B73D3",
    "tostate": "FROZEN",
    "fromstate": "IN_WORK"
  }],
  "metrics": {
    "UXName": "Maturity",
    "client_app_domain": "3DEXPERIENCE 3DDashboard",
    "client_app_name": "ENOLCMI_AP"
  },
  "notificationTimeout": 3600
}
```

### Headers necessários

- `Content-Type: application/json`
- `SecurityContext: ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO`
- Cookies de sessão (via `credentials: 'include'` ou WAFData)
- ENO_CSRF_TOKEN não foi necessário neste endpoint (autenticação via cookies)

### Fluxo implementado no widget

```
1. Usuário seleciona item na E-BOM
2. Zona 5 mostra detalhes + botão "Alterar maturidade"
3. Clique → modal com transições locais (Engineering Definition Maturity Graph)
   - IN_WORK → Congelar (FROZEN)
   - FROZEN → Liberar (RELEASED) ou Devolver (IN_WORK)
   - RELEASED → Obsoleto (OBSOLETE)
4. Confirmar → POST /resources/lifecycle/maturity/promote
5. Reread EngItem → confirma state mudou
6. Atualiza UI + pizza Saúde da Maturidade
```

### Commits da solução

| Commit | Arquivo | Descrição |
|--------|---------|-----------|
| `f5b07fb0` | waf3dx-client | PATCH cestamp como primeiro fallback (descartado) |
| `b1fc0347` | hotfix | Transições locais (TRANSITION_MAP) |
| `f77b0f54` | hotfix | Remover getAllowedMaturityTransitions (causava 404) |
| `73c5b605` | CSS | Estilos do modal de maturidade |
| `52616d0c` | hotfix | bindMaturityAction atualiza active a cada seleção |
| `d41825f6` | waf3dx-client | ceStamp camelCase (tentativa PATCH) |
| `3e17cade` | waf3dx-client | **Endpoint real /resources/lifecycle/maturity/promote** |

---

## Premissas do projeto (atualizadas)

### Funcionais
- Link oficial: `widget-v3.html` sem parâmetros
- Ciclo de vida UWA: `widget.addEvent('onLoad')` inline
- `prd-R` nunca como dseng direto — resolver via registry ou UQL
- E-BOM sem limite de linhas (DEFAULT_DEPTH=20)
- Maturity via `/resources/lifecycle/maturity/promote` (endpoint real)
- 3D/2D: thumbnail da peça (próximo passo)

### Técnicas
- Um arquivo por commit, validar antes de avançar
- RELEASE_COMMIT atualizado a cada mudança no hotfix/waf3dx
- Sem dados fake, mock, fallback silencioso
- Sem 3DPlay, iframe, clipboard, DOM scraping
- ProductExplorerBridge necessário para ExplorerContext (não remover)

### O que não usar
- `dseng:GetNextStates` — 404 no tenant cloud
- `dseng:ChangeMaturity` / `dseng:Promote` / `dseng:SetState` — 404
- `dslc` modeler — não existe
- PATCH `state` no EngItem — "not an attribute"
- `DS/Visualization/Viewer3D` — módulo AMD não existe

---

## Próximo passo: Thumbnail 2D View

### Objetivo
Quando o usuário seleciona um item na E-BOM, mostrar uma imagem/thumbnail da peça na zona 5 (preview).

### Abordagem
A API dseng não retorna campo `image`. Alternativas a investigar:
1. Ícone genérico por tipo (Assembly/Part) — sem chamada de API
2. `/resources/lifecycle/maturity/` pode ter endpoint de thumbnail
3. Capturar da UI nativa como foi feito com promote
4. Usar imagem do Product Structure Explorer via ExplorerContext

### Arquivos envolvidos
- `bom-ska-service-hotfix-20260617d.js` — zona 5 rendering
- `assets/css/dashboard.css` — estilos da zona de preview
