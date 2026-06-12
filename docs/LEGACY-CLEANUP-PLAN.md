# Legacy Cleanup Plan — Explorer Mirror → Render BOM Service

**Decisão:** DEC-018  
**Inventário:** `docs/REPOSITORY-INVENTORY.md`  
**Regra:** limpeza **controlada** — nunca apagar sem etapa e validação.

---

## Princípios

1. **Nenhuma remoção** antes do frontend consumir Render com sucesso (Fase 4 concluída).
2. **Rotas backend legadas** (`/api/bom/*`) permanecem até deprecação documentada.
3. **Diagnósticos úteis** (Expand Item, API diagnostic) podem permanecer em Avançado se não alimentarem tabela principal.
4. **Proibido** reativar DOM scraping, clipboard, TSV ou mirror falso durante limpeza.

---

## Etapa 1 — Documentar e marcar deprecated (PR 1 ✅)

| Ação | Detalhe |
|------|---------|
| DEC-018 publicado | Direção oficial Render |
| REPOSITORY-INVENTORY | Status por arquivo |
| LEGACY-CLEANUP-PLAN | Este documento |
| Código | **Sem alteração** — apenas inventário |

Arquivos marcados **deprecated** no inventário (sem delete):

- `product-explorer-bridge.js`
- `explorer-mirror-provider.js`
- `snapshot-panel.js`, `paste-bom-loader.js`, `tsv-bom-loader.js`
- `explorer-scanner.js`, `file-import-service.js` (fluxo principal)
- Bundles históricos `bom-bundle-bom202606*.js` (exceto `07a` pinado)

---

## Etapa 2 — Remover do fluxo principal (PR 4)

**Quando:** após `BOM_DATA_SOURCE=render-bom-service` funcional.

| Ação | Arquivo / ponto |
|------|-----------------|
| `widget-v3-08i.html` | Parar de carregar `explorer-mirror-provider.js` (opcional manter probe DEC-017) |
| `bom-api-id-hotfix` | Botão **Atualizar estrutura** → apenas Render API |
| `config.js` | Default `DATA_SOURCE` / `BOM_DATA_SOURCE` = `render-bom-service` |
| `sync-banner.js` | Texto: Render BOM Service, não Explorer Mirror |
| Hotfix | Desabilitar `atualizarEstruturaExplorerMirror` como path principal |
| Bridge | Não chamar `ProductExplorerBridge.scrape*` no load |

**Manter temporariamente:**

- `expand-item-provider.js` em Avançado (diagnóstico)
- `product-explorer-mirror-contract-probe.js` (referência DEC-017)
- `api-diagnostic.js` (WAF local)

**Feature flag rollback:**

```javascript
BOM_DATA_SOURCE: 'render-bom-service' | 'legacy-explorer-mirror'
```

---

## Etapa 3 — Remover arquivos não usados (PR 5)

**Pré-requisitos:**

- [ ] Dashboard OK com Render em tenant piloto
- [ ] `grep` confirma zero imports do arquivo no fluxo ativo
- [ ] Backup branch disponível

| Prioridade | Candidato | Condição |
|------------|-----------|----------|
| P1 | Referências DOM scrape em hotfix | Já desligadas |
| P2 | `explorer-mirror-provider.js` | Removido do HTML + sem require |
| P3 | `product-explorer-bridge.js` | Substituído por rootId da seleção apenas |
| P4 | `explorer-scanner.js` | Sem chamadas |
| P5 | `paste-bom-loader.js`, `tsv-bom-loader.js`, `snapshot-panel.js` | Sem UI |
| P6 | Bundles antigos `bom-bundle-bom202606*.js` | Arquivar ou deletar em lote |

**Não remover sem análise:**

- `expand-item-provider.js` / `expandItemJobs.js` — diagnóstico técnico
- `browserAuthJobs.js` — até migrar usuários do browser-auth bridge
- `bomResolver.js` — pode ser reutilizado pelo SKA service internamente

---

## Etapa 4 — Validar dashboard e backend

| Check | Como |
|-------|------|
| GET `/health` legado | 200 |
| POST `/api/bom/resolve` | Não regressão |
| POST `/api/3dx/bom/structure` | 200 com CJ MESA |
| Widget Additional App | Tabela + KPI preenchidos |
| Sem DOM scrape no Network/Console | Auditoria manual |
| Sem clipboard/TSV na UI | Inspeção |
| Mensagem fonte honesta | Banner correto |
| Probe DEC-017 | Opcional manter histórico |

---

## Matriz risco × ação

| Item | Risco se remover cedo | Etapa segura |
|------|----------------------|--------------|
| Explorer Mirror provider | Perda diagnóstico DEC-017 | Etapa 3, manter probe |
| product-explorer-bridge | Quebra seleção rootName | Etapa 2: manter só seleção/id |
| browser-auth jobs | Usuários em bridge legado | Etapa 3+ com comunicado |
| expand-item | Baixo se só Avançado | Etapa 3 opcional |
| bundles históricos | Baixo (não carregados) | Etapa 3 |

---

## Comunicação

Ao concluir Etapa 2, atualizar:

- `docs/DECISOES-TECNICAS.md` — entrada DEC-018
- `.cursor/rules/bom-project-status.mdc` — build + fonte Render
- README — arquitetura Render

**Não atualizar** neste PR 1 (somente docs DEC-018).
