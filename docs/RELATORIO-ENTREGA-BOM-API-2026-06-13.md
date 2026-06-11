# Relatório de entrega — Full BOM API (DEC-014)

**Data:** 2026-06-13  
**Build entregue:** `bom20260613b`  
**Widget:** `widget-v3-08i.html`  
**Hotfix:** `assets/js/bom-api-id-hotfix-20260608a.js`  
**DEC-014:** `docs/DECISOES-TECNICAS.md`

---

## Modo entregue

| Item | Valor |
|------|--------|
| Modo operacional | **Full BOM API** |
| `LOADER_MODE` | `full-bom-api` |
| `MIRROR_EXPLORER_MODE` | `false` |
| Payload backend `mirrorExplorerMode` | `false` |
| `expectedCount` no `/api/bom/browser/start` | `0` (referência Explorer não limita/corta resultado) |
| Mirror Explorer | **Indisponível** (widget GitHub Pages separado — cross-origin, sem API pública de árvore expandida) |

---

## Fonte das linhas

A tabela E-BOM e o KPI **Total Peças** são alimentados pela reconstrução **Full BOM API**:

1. Widget 3DDashboard executa `WAFData.authenticatedRequest` (tarefas delegadas pelo backend).
2. Backend (`bom-resolver.onrender.com`) orquestra BFS sobre **dseng** (`EngItem` / `EngInstance`).
3. Hotfix mapeia linhas do backend para o modelo interno e aplica na UI via `BomSnapshot` / `BomService`.

O **Explorer carregado** (contagem visual no Product Structure Explorer) é **referência contextual**, não validação de total nem critério de sucesso.

---

## Comportamento esperado na UI (pós-teste manual)

Teste no tenant piloto `R1132100929518` (2026-06-13):

| Verificação | Resultado |
|-------------|-----------|
| Build pill | `bom20260613b` |
| Banner | `Explorer carregado: 34 \| Full BOM API: 50 linhas \| modo API ENOVIA` |
| KPI Total Peças | 50 |
| Tabela E-BOM | 50 linhas |
| Status bar (diagnóstico) | `Diagnóstico: 20 probes técnicos, 0 falhas operacionais` |
| Toast | `Full BOM API: 50 linhas (Explorer ref: 34)` |

**Diferença Explorer (34) vs Full BOM API (50) não é falha** — reflete expansão visual parcial no Explorer vs estrutura completa via API.

---

## O que a UI principal **não** deve mostrar

- `Extractor incompleto`
- `diferença de X` como erro/warn após sucesso Full BOM API
- `falha(s)` quando forem apenas probes técnicos esperados
- Instruções de mirror manual (`copie TSV`, `Ctrl+A`, `Ctrl+C`) no fluxo principal

---

## O que a UI principal **pode** mostrar

- `Explorer carregado: N`
- `Full BOM API: M linhas`
- `Diagnóstico: X probes técnicos, 0 falhas operacionais`
- Painel **Avançado** com resumo DEC-014 (modo, contagens, probes, falhas operacionais)

---

## Classificação de diagnóstico

### Probes técnicos / esperados (não falha operacional)

- 404 em `EngItem` / `EngInstance` / `PhysicalProduct` / `VPMReference` (`prd-R...`)
- 403 em `/expand`
- Endpoints de search/modeler não suportados no tenant
- Candidatos descartados e tentativas de resolução controladas (`RAW *` no relatório Avançado)

### Falha operacional real

- `WAFData` indisponível
- `SecurityContext` ausente
- `3DSpace` não resolvido / Compass falhou
- `CSRF` ausente quando necessário
- Backend `/api/bom/browser/start` ou `/continue` falhou
- CORS bloqueando backend
- Exceção JS fatal
- Resultado final **0 linhas** no modo Full BOM API

Implementação: `classifyDiagnosticRows()` em `bom-api-id-hotfix-20260608a.js` + `runApiDiagnostic` em `app.js`.

---

## Config estática (DEC-014)

Em `assets/js/config.js` (coerente com hotfix `disableMirrorCaptureFlags()`):

| Flag | Valor |
|------|--------|
| `EXPLORER_AUTO_COPY_ENABLED` | `false` |
| `PASTE_TRAP_ENABLED` | `false` |
| `PRIMARY_LOADER` | `'api'` |
| `USE_DOM_MIRROR_PRIMARY` | `false` |
| `DOM_MIRROR_FALLBACK` | `false` |

---

## Critérios de aceite final

- [x] Build pill `bom20260613b`
- [x] **Atualizar estrutura** → `POST /api/bom/browser/start` + loop `/continue`
- [x] Full BOM API retorna linhas e popula tabela
- [x] KPI Total Peças = linhas da tabela
- [x] Banner neutro/ok (sem “diferença” como erro)
- [x] Diagnóstico: 0 falhas operacionais quando só há probes esperados
- [x] Sem mensagens mirror/TSV/manual na UI principal
- [x] Avançado explica DEC-014

---

## Limitação conhecida

**Full BOM API não representa o estado visual expandido do Product Structure Explorer.**  
O usuário pode ver menos nós no Explorer (ex.: 34) do que a API retorna (ex.: 50) se a árvore não estiver totalmente expandida ou se a contagem visual usar outro critério.

---

## Roadmap (fora desta entrega)

Mirror Explorer **real** somente com:

- Widget nativo **mesma origem** no 3DDashboard, ou
- Contrato oficial Dassault (`ENOPSTR_*` / API interna para nós expandidos)

Sem esse contrato, o produto permanece em **Full BOM API** conforme DEC-014.

Relatório técnico mirror: `docs/RELATORIO-MIRROR-EXPLORER-2026-06-12.md`.

---

## URLs

- GitHub Pages: `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260613b`
- Dashboard piloto: tenant `R1132100929518`, lista PRODUCTEXPLORE / BOM Analytics
