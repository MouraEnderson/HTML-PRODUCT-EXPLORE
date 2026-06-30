# BOM Analytics — Ponto de Backup Estável 2026-06-29

## BACKUP

**SHA:** `64975dccb5dcb16f6083de4cd2dc283e50a6fb4f`
**Data:** 2026-06-29 23:58 UTC
**Para restaurar:** `git reset --hard 64975dccb5dcb16f6083de4cd2dc283e50a6fb4f`

---

## Estado funcional confirmado neste ponto

| Item | Status | Evidência |
|------|--------|-----------|
| Widget carrega no F5 | ✅ | UWA lifecycle oficial |
| E-BOM com dados reais | ✅ | 5 linhas CJ MESA |
| Gráficos pizza (doughnut) | ✅ | Saúde Maturidade + Proprietários |
| IDs reais no clique | ✅ | Reference ID: 63FC...86AB |
| Layout 5 zonas | ✅ | Top/filt/graf/ebom/prev |
| Topbar funcional | ✅ | Sincronizar + Atualizar + Diagnóstico |
| rawRows=13 do expand | ✅ | API retorna 13 membros |
| Resolução CJ MESA automática | ✅ | prd-R → dseng via registry |

## Pendente neste ponto

| Item | Detalhe |
|------|---------|
| expandDepth 1 (deveria ser 8) | Contagem parcial — 5 linhas de 13 rawRows |
| PSE mostra 92 objetos | E-BOM mostra 5 — investigar profundidade |
| 3D viewer | fileCount=0 — sem derived output |
| Maturity write | GetNextStates 404 |

---

## Problemas resolvidos nesta sessão (2026-06-25 a 2026-06-29)

### Problema 1 — Loading infinito após F5 (10-20 minutos)

**Causa:** código violava padrão UWA da DS. Runtime fazia polling por `w.widget` com `setTimeout(bootWidget, 200)`. Na primeira F5, `w.widget` não existia → caia no branch `document.body` (body errado) → `started=true` → boot travado.

**Agravante:** `w.__BOM_WIDGET_BOOT_STATE__ = w.__BOM_WIDGET_BOOT_STATE__ || {...}` preservava estado da sessão anterior no `window` global do Netvibes.

**Solução:** refatoração para padrão UWA oficial:
```xml
<script type="text/javascript">
//<![CDATA[
widget.addEvent('onLoad', function () {
  window.__BOM_WIDGET_BOOT_STATE__ = { started: false, completed: false, build: null, startedAt: 0 };
  if (typeof window.BomWidgetRuntime !== 'undefined' && window.BomWidgetRuntime.init) {
    window.BomWidgetRuntime.init('init');
  }
});
//]]>
</script>
```
- HTML controla lifecycle, runtime só define funções
- `bootWidget()` auto-call removido
- Baseado na documentação oficial DS: "Do not handle the widget object before the onLoad event is triggered"

**Commits:** `0364a945` (widget-v3.html UWA inline), `99a53f0d` (runtime remove auto-call)

### Problema 2 — SyntaxError linha 2407 do hotfix

**Causa:** `;` onde deveria ser `,` no `setStatus()`. Hotfix inteiro falhava silenciosamente. Netvibes servia versão cacheada sem o bug.

**Solução:** corrigido `;` → `,`

**Commit:** `0787dc5f`

### Problema 3 — ProductExplorerBridge = null causava TypeError

**Causa:** substituição de `ProductExplorerBridge` por `null` no bundle. `typeof null !== 'undefined'` → código tentava chamar métodos em `null` → crash em 278 guards.

**Solução:** primeiro trocado para `undefined`, depois restaurado completamente quando descobri que ExplorerContext depende dele.

**Commits:** `2f1aac24` (null→undefined), `64975dcc` (restauração completa)

### Problema 4 — E-BOM não carregava dados (RESOLVE_PENDING)

**Duas causas:**
1. `explorer-context.js` não estava na cadeia de loadScript do runtime → `w.ExplorerContext === undefined` → sync-provider retornava `source: NONE`
2. `bootLoadFromContextOrPersisted` não chamava `refreshBom()` quando contexto tinha rootId válido

**Solução:**
1. Adicionado `explorer-context.js` à cadeia de loadScript, antes do sync-provider
2. `bootLoadFromContextOrPersisted` agora verifica contexto e chama `refreshBom()` automaticamente

**Commits:** `f610e621` (explorer-context na cadeia), `ea680ae6` (auto-load)

### Problema 5 — ProductExplorerBridge removido indevidamente

**Causa:** removido como "código morto" (93KB). Na verdade, ExplorerContext depende dele para TODA detecção do PSE: `pollDashboardExplorerChrome`, `getSelection`, `getStructureNameHint`, `getExplorerObjectCount`.

**Solução:** restaurado do commit b72b25d (estado estável original).

**Commit:** `64975dcc`

### Problema 6 — Gráfico pizza aparecia como barra

**Causa:** seletor `quadCharts` buscava `.bom-charts-row-quad` mas CSS usa `.bom-charts-row`.

**Solução:** seletor expandido para detectar ambas classes.

**Commit:** `62048e9b`

### Problema 7 — CSS sem grid-template-areas

**Causa:** layout usava `repeat(10, minmax(0, 1fr))` sem áreas nomeadas.

**Solução:** CSS com `grid-template-areas: "top top" "filt graf" "ebom prev"` + `grid-template-columns: 60% 40%`.

**Commit:** `ef2bd1ce`

---

## Cadeia de arquivos ativa neste ponto

```
widget-v3.html (UWA lifecycle inline)
  ├── dashboard.css (14KB)
  ├── widget-runtime-bom20260617d.js (17KB)
  │     ├── bom-bundle-bom20260607a.js (499KB, ProductExplorerBridge restaurado)
  │     ├── integration/explorer-context.js (9KB)
  │     ├── integration/product-explorer-sync-provider.js (19KB)
  │     ├── integration/expand-item-provider.js (34KB)
  │     ├── bom-ska-service-hotfix-20260617d.js (151KB)
  │     ├── waf3dx-client-bom20260617d.js (111KB)
  │     └── wafdata-probe-bom20260617d.js (25KB)
  └── <script inline CDATA> widget.addEvent('onLoad'/'onRefresh')
```

---

## Lições aprendidas

1. **Usar `widget.addEvent('onLoad')` inline** — padrão UWA oficial. Nunca polling por `w.widget`.
2. **`typeof null !== 'undefined'`** — usar `undefined` para stubs, não `null`.
3. **Não remover módulos sem entender dependências** — ProductExplorerBridge era essencial para ExplorerContext.
4. **`explorer-context.js` precisa estar no loadScript** — sem ele, sync-provider não detecta PSE.
5. **Um arquivo por commit, validar antes de avançar.**
6. **XHTML 1.0 Strict** — scripts inline precisam de `<![CDATA[...]]>`.
7. **Boot state do Netvibes persiste no `window`** — resetar explicitamente no onLoad.
