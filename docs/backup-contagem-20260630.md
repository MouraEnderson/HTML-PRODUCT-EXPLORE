# BOM Analytics — Backup Estável 2026-06-30 (Contagem Corrigida)

## BACKUP

**SHA:** `9b7397d45429dfaf3e32a4127f0d2b9a30e4737a`
**Data:** 2026-06-30 11:21 UTC
**Para restaurar:** `git reset --hard 9b7397d45429dfaf3e32a4127f0d2b9a30e4737a`

---

## Estado funcional confirmado

| Item | Status | Detalhe |
|------|--------|---------|
| Widget carrega no F5 | ✅ | UWA lifecycle oficial |
| E-BOM com dados reais | ✅ | CJ MESA — estrutura completa |
| Contagem correta (depth 20) | ✅ | Estrutura expandida com profundidade real |
| Gráficos pizza (doughnut) | ✅ | Saúde Maturidade + Proprietários |
| IDs reais no clique | ✅ | Reference ID, Instance ID |
| Layout 5 zonas | ✅ | Top/filt/graf/ebom/prev |
| Resolução CJ MESA automática | ✅ | prd-R → dseng via registry + ExplorerContext |
| Sem limite de linhas | ✅ | Normalizador processa todas as rows da API |

## Pendente

| Item | Bloqueio | Tipo |
|------|----------|------|
| 3D viewer | fileCount=0 — sem derived output web no tenant | Configuração/Código |
| Maturity write | GetNextStates 404 | Configuração tenant |
| Resolução automática outros projetos (SKA, Drone) | Sem registry/UQL para prd-R genérico | Código |
| Limpeza arquivos órfãos | Não bloqueia funcionalidade | Manutenção |

---

## Problema resolvido: contagem E-BOM incorreta

### Sintoma
- PSE mostrava 92 objetos, E-BOM mostrava 5 linhas
- Diagnóstico: `expandDepth 1 · parcial`
- rawRows=13 mas apenas 5 processadas
- API retornava `rows=5` no expand

### Causa (3 fatores combinados)

**Fator 1 — DEFAULT_DEPTH = 1**
O hotfix tinha `DEFAULT_DEPTH = 1` — expand retornava apenas filhos diretos do root.

**Fator 2 — Input max = 3**
O campo de profundidade no Avançado tinha `depthEl.max = '3'`, limitando a UI a no máximo 3 níveis.

**Fator 3 — Input preservava valor da sessão anterior**
```js
// Antes: só inicializava se vazio
if (!s(depthEl.value)) depthEl.value = String(DEFAULT_DEPTH);
// Se sessão anterior tinha depth=1, o valor persistia
```

**Fator 4 — Cache do browser**
Após corrigir `DEFAULT_DEPTH=20` no hotfix, o `RELEASE_COMMIT` no runtime não foi atualizado. O browser continuou servindo o hotfix antigo (com depth=1) do cache.

### Solução aplicada

| Commit | O que mudou |
|--------|-------------|
| `cfc3c01e` | `DEFAULT_DEPTH`: 1 → 8, `depthEl.max`: '3' → '20', input sempre inicia com DEFAULT_DEPTH |
| `977acab3` | `DEFAULT_DEPTH`: 8 → 20, `depthEl.max`: '20' → '100' |
| `2320fed8` | `RELEASE_COMMIT`: refactor20260628a → refactor20260630a (invalida cache) |
| `9b7397d4` | `c=refactor20260630a` no widget-v3.html (cache-bust runtime) |

### Configuração final

```
DEFAULT_DEPTH = 20        → estrutura expandida com profundidade real
depthEl.max = '100'       → usuário pode expandir manualmente até 100 níveis
Input inicia com = 20     → sempre DEFAULT_DEPTH no boot
Sem limite de linhas      → normalizador processa todas as rows
RELEASE_COMMIT atualizado → browser busca hotfix novo
```

### Lição aprendida
**Sempre atualizar RELEASE_COMMIT ao alterar qualquer arquivo da cadeia.** Sem isso, o browser serve a versão antiga do cache mesmo que o arquivo no servidor esteja correto.

---

## Cadeia de arquivos ativa

```
widget-v3.html (c=refactor20260630a)
  ├── dashboard.css
  ├── widget-runtime-bom20260617d.js (RELEASE_COMMIT=refactor20260630a)
  │     ├── bom-bundle-bom20260607a.js (499KB)
  │     ├── integration/explorer-context.js
  │     ├── integration/product-explorer-sync-provider.js
  │     ├── integration/expand-item-provider.js
  │     ├── bom-ska-service-hotfix-20260617d.js (DEFAULT_DEPTH=20)
  │     ├── waf3dx-client-bom20260617d.js
  │     └── wafdata-probe-bom20260617d.js
  └── <script inline CDATA> widget.addEvent UWA lifecycle
```

---

## Próximos passos — análise

### Opção A — 3D Viewer (visualização de geometria ao selecionar item)
**Status:** fileCount=0 no derived output. Configuração de conversão existe no tenant mas não gera formato web.
**Abordagens possíveis:**
1. Thumbnail/imagem da peça (viável agora, sem derived output)
2. Forçar conversão GLB via API dsdo (investigar)
3. Download 3DShape + Three.js (complexo — formato CGR proprietário)
4. Módulo AMD DS nativo para rendering (investigar disponibilidade)

**Recomendação:** começar com thumbnail como MVP, investigar conversão GLB em paralelo.

### Opção B — Maturity Write
**Status:** GetNextStates retorna 404 no tenant.
**Ação:** verificar permissões lifecycle no Security Context.
**Sem ação de código** até o tenant liberar o endpoint.

### Opção C — Resolução automática de qualquer projeto
**Status:** funciona para CJ MESA via registry hardcoded.
**Ação:** implementar resolução UQL genérica via waf3dx-client para qualquer prd-R.
**Benefício:** SKA, Drone, Starret e qualquer outro projeto resolvem automaticamente.

### Opção D — Limpeza do repositório
**Status:** arquivos órfãos (-fixed, -r2, bundles antigos).
**Ação:** deletar arquivos não utilizados.
**Risco:** zero — são arquivos que não estão na cadeia ativa.

### Ordem sugerida
1. **D** — Limpeza (5 min, zero risco)
2. **C** — Resolução genérica (desbloqueia qualquer projeto)
3. **A** — 3D Viewer (MVP com thumbnail)
4. **B** — Maturity (depende do tenant)
