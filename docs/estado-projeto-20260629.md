# BOM Analytics — Documentação Técnica Completa

**Repositório:** `MouraEnderson/HTML-PRODUCT-EXPLORE`
**Link oficial:** `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3.html`
**Build:** `bom20260617d`
**Data:** 2026-06-29

---

## 1. Premissas do Projeto (não negociáveis)

### Link e entrypoint
- Link oficial fixo: `widget-v3.html` sem parâmetros na URL
- Não aceitar `?v=`, `?verify=`, ou qualquer parâmetro na URL configurada no Additional App

### Fluxo oficial desejado
```
Product Structure Explorer aberto
→ usuário clica "Sincronizar com Product Explorer"
→ dashboard captura contexto oficial via PlatformAPI / DS Selection / ExplorerContext
→ backend/serviço resolve root real dseng (prd-R → dseng)
→ GET EngItem real
→ expand E-BOM real
→ renderiza rows/counts/diagnostics reais
→ clique na linha mostra Reference ID / Physical ID / Instance ID reais
→ só depois libera 3D real
→ só depois libera maturity write real
```

### Não usar como solução final
- Cookie manual / ENOVIA_COOKIE / CAS como fluxo principal
- Clipboard / Ctrl+C / TSV / DOM scraping
- window.top.document / iframe.contentDocument
- 3DPlay ou iframe 3DPlay como sucesso de 3D
- Dados fake / maturity fake / 3D fake / fallback silencioso
- Parser experimental no entrypoint oficial
- Generic deep enrichment de atributos

### Regra crítica para IDs
- `prd-R...` não é root dseng direto
- Nunca chamar `/dseng:EngItem/{id}` com `prd-R...` sem resolver antes
- Primeiro resolver `prd-R...` para ID interno dseng
- Se não resolver, mostrar erro/diagnóstico, não inventar root

### E-BOM
- Sem limite fixo de linhas — paginação/lazy loading
- Contagem não maquiada no front-end
- Cada linha preserva: rowKey, level, path, parentReferenceId, referenceId, physicalId, instanceId, title, description, revision, owner, maturity/state, type, quantity

### 3D
- Só depois de E-BOM estável
- Não tratar como concluído até existir geometria real renderizável/downloadable
- Aceitável no MVP: mostrar bloqueio honesto como NO_DERIVED_OUTPUT

### Maturity write
- Só considerar concluído quando: ler estado atual → listar transições reais → executar write real → reler EngItem → confirmar stateAfter != stateBefore

---

## 2. Problema que nos travou — Loading infinito após F5

### Sintoma
Quando o usuário pressionava F5 no 3DDashboard, o widget ficava em "Loading..." por 10-20 minutos ou indefinidamente. Só funcionava ao remover e readicionar o widget.

### Causa raiz
O código violava o padrão UWA (Universal Widget API) da plataforma 3DEXPERIENCE.

**O que nosso código fazia (errado):**
```js
// Runtime externo fazia polling por w.widget
function bootWidget() {
    if (typeof w.widget !== 'undefined' && w.widget) {
        // registrava onLoad e fazia mais polling por widget.body
    } else if (document.body) {
        // PROBLEMA: caia aqui quando w.widget não existia ainda
        executeInit('init'); // pintava no document.body (body errado)
    } else {
        setTimeout(bootWidget, 200); // polling a cada 200ms
    }
}
bootWidget(); // auto-call no final do runtime
```

**O que a documentação oficial DS diz:**
> "Do not handle the widget object - except for addEvent - before the onLoad event is triggered."

> "By default, if your code does not change the widget body contents, the widget body shows 'Loading...'"

**Padrão UWA correto (da documentação DS):**
```html
<script>
//<![CDATA[
widget.addEvent('onLoad', function() {
    widget.body.innerHTML = "Hello World!";
});
//]]>
</script>
```

### O que acontecia no F5
1. F5 recarregava a página do 3DEXPERIENCE
2. Netvibes começava a reinicializar (leva segundos)
3. Nosso runtime carregava e chamava `bootWidget()` imediatamente
4. `w.widget` ainda não existia (Netvibes não tinha inicializado o widget)
5. `document.body` existia → caia no branch errado
6. `executeInit('init')` pintava no `document.body` (que não é o `widget.body` do Netvibes)
7. `started=true` era setado no boot state
8. Quando Netvibes finalmente criava `w.widget` e disparava `onLoad`, o boot state já estava corrompido
9. Widget ficava em "Loading..." para sempre

### Segundo fator agravante — boot state persistente
```js
// O || preservava o estado da sessão anterior no window global
w.__BOM_WIDGET_BOOT_STATE__ = w.__BOM_WIDGET_BOOT_STATE__ || {...};
```
O `window` global do Netvibes persiste entre reloads. Se `completed=true` da sessão anterior, `executeInit` retornava sem chamar `paint()`.

---

## 3. Solução aplicada — ciclo de vida UWA oficial

### Arquitetura corrigida

**widget-v3.html (controla o ciclo de vida):**
```xml
<script type="text/javascript" src="assets/js/widget-runtime-bom20260617d.js?v=bom20260617d&amp;c=refactor20260628a"></script>
<script type="text/javascript">
//<![CDATA[
/* Ciclo de vida UWA oficial — widget.addEvent inline conforme documentação DS */
widget.addEvent('onLoad', function () {
  window.__BOM_WIDGET_BOOT_STATE__ = { started: false, completed: false, build: null, startedAt: 0 };
  if (typeof window.BomWidgetRuntime !== 'undefined' && window.BomWidgetRuntime.init) {
    window.BomWidgetRuntime.init('init');
  }
});
widget.addEvent('onRefresh', function () {
  if (typeof window.BomWidgetRuntime !== 'undefined' && window.BomWidgetRuntime.refresh) {
    window.BomWidgetRuntime.refresh();
  }
});
//]]>
</script>
```

**Runtime (só define funções, não auto-inicia):**
```
BomWidgetRuntime.init → executeInit('init') → paint() → loadCss → loadWaf → startBundle → finishBoot
BomWidgetRuntime.refresh → executeInit('refresh')
bootWidget() mantido como fallback mas NÃO chamado automaticamente
```

### Por que funciona
| Antes | Depois |
|-------|--------|
| Runtime fazia polling por `w.widget` | UWA dispara `onLoad` quando widget está pronto |
| `document.body` como fallback (body errado) | `widget.body` garantido pelo UWA no onLoad |
| Boot state persistia entre reloads | Resetado no onLoad antes de inicializar |
| Auto-call `bootWidget()` | HTML controla lifecycle via `widget.addEvent` |

### Commits da solução
| Commit | Arquivo | Descrição |
|--------|---------|-----------|
| `0364a945` | `widget-v3.html` | Ciclo de vida UWA com `widget.addEvent` inline |
| `99a53f0d` | `widget-runtime-bom20260617d.js` | Remover `bootWidget()` auto-call |

---

## 4. Estado atual — 2026-06-29

### O que funciona
| Item | Status | Evidência |
|------|--------|-----------|
| Widget carrega no 3DDashboard | ✅ | F5 funciona |
| Layout 5 zonas | ✅ | Top/filt/graf/ebom/prev |
| Botão Sincronizar visível | ✅ | Na topbar |
| Botão Atualizar visível | ✅ | Na topbar |
| WAFData autenticado | ✅ | Diagnóstico PASS |
| CSRF GET 200 | ✅ | Diagnóstico PASS |
| GET EngItem real (dseng) | ✅ | Diagnóstico PASS |
| POST expand real (13 membros) | ✅ | Diagnóstico PASS |
| UWA lifecycle F5 | ✅ | Widget carrega após reload |

### O que não funciona — pendente
| Item | Estado | Causa | Tipo |
|------|--------|-------|------|
| E-BOM não carrega dados | ❌ | `RESOLVE_PENDING` — `prd-R` não resolve para dseng automaticamente | Código |
| Gráficos pizza | ❓ | Depende da E-BOM carregar dados | Código |
| 3D real | ❌ | `fileCount=0` — sem derived output no tenant | Configuração tenant |
| Maturity write | ❌ | `GetNextStates 404` — sem permissão lifecycle | Configuração tenant |

### Diagnóstico da E-BOM (problema atual)
```
Fonte: dseng · modo: root · source: NONE · item: - · linhas: 0
RESOLVE_PENDING — selecao PSE nao disponivel por API oficial
```

**Causa:** o `sync-provider` tem `KNOWN_EXPLORER_ROOT_REGISTRY = []` (vazio). Quando o PSE mostra CJ MESA com `prd-R1132100929518-01103695`, o sync-provider não consegue resolver para o dseng `63FC553465A62400699E0792000086AB`.

**O hotfix tem o fallback** (`KNOWN_ROOT_TITLE_HINT = 'CJ MESA'`), mas só é chamado quando `allowKnownRootFallback === true` — e o fluxo automático passa `false`.

---

## 5. Cadeia de arquivos ativa

```
widget-v3.html
  ├── dashboard.css (14KB)
  ├── widget-runtime-bom20260617d.js (17KB) — define BomWidgetRuntime
  │     ├── bom-bundle-bom20260607a.js (406KB) — App, ChartsManager, LayoutFit
  │     ├── product-explorer-sync-provider.js (19KB) — captura contexto PSE
  │     ├── expand-item-provider.js (34KB) — paginação expand
  │     ├── bom-ska-service-hotfix-20260617d.js (151KB) — serviço WAF, resolve root
  │     ├── waf3dx-client-bom20260617d.js (111KB) — WAFData client
  │     └── wafdata-probe-bom20260617d.js (25KB) — probe de conectividade
  └── <script inline> widget.addEvent UWA lifecycle
```

**Total: ~777KB**

---

## 6. Dados conhecidos do tenant

| Item | Valor |
|------|-------|
| 3DSpace | `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia` |
| Security Context | `ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO` |
| CJ MESA título | `CJ MESA 4BCS VP TOP 3DX` |
| CJ MESA prd-R | `prd-R1132100929518-01103695` |
| CJ MESA dseng root | `63FC553465A62400699E0792000086AB` |
| SKA prd-R | `prd-R1132100929518-00662677` |
| Expand com SC+CSRF | 200, 13 rows |
| Expand sem CSRF | 403 |
| Expand sem SC | 401 |

---

## 7. Próximos passos — em ordem de prioridade

### PASSO 1 — E-BOM carregando dados (PRIORIDADE MÁXIMA)

**Problema:** `RESOLVE_PENDING` — o sync-provider detecta o PSE com CJ MESA (`prd-R...`) mas não resolve para dseng automaticamente.

**Causa:** `KNOWN_EXPLORER_ROOT_REGISTRY = []` no sync-provider. O hotfix tem `KNOWN_ROOT_TITLE_HINT` mas o fluxo não chega lá.

**Solução proposta:** duas opções, em ordem de preferência:

1. **Restaurar registry no sync-provider** com o mapeamento `prd-R → dseng` para CJ MESA (solução imediata, funciona para CJ MESA)
2. **Ativar resolução UQL automática** via `waf3dx-client.resolveEngItemRootId` que já existe no hotfix — fazer o fluxo `loadBomWithRootResolution` chamar essa resolução quando `rootId` está vazio e `physicalId` é `prd-R`

A opção 2 é a correta a longo prazo — funciona para qualquer projeto. A opção 1 é o MVP funcional.

**Arquivos envolvidos:** `product-explorer-sync-provider.js` (opção 1) ou `bom-ska-service-hotfix-20260617d.js` (opção 2)

### PASSO 2 — Gráficos pizza

**Pré-requisito:** PASSO 1 concluído (E-BOM com dados).

**O que está pronto:**
- CSS `.cf-pie-quad` com `conic-gradient` (sem CDN)
- Seletor `quadCharts` corrigido no bundle

**O que falta verificar:** se `showCompactPieInBox` é chamado corretamente após o seletor detectar `.bom-charts-row`.

### PASSO 3 — Contagem real da E-BOM

**Pré-requisito:** PASSO 1 concluído.

**O que está pronto:** `DEFAULT_DEPTH = 8` no hotfix.

**O que falta verificar:** se os 13 rows do expand (já provados no diagnóstico) aparecem na tabela. O PSE mostra 8 objetos — a contagem precisa ser explicada (depth, includeRoot, uniqueReferenceCount).

### PASSO 4 — 3D real

**Bloqueio:** `fileCount=0` — nenhum derived output GLB/OBJ gerado no tenant.

**Ação:** configurar conversion rules no tenant para gerar derived output web. O administrador do tenant já tem as regras STEP_AP214/AP242/XCV configuradas, mas pode faltar a regra de conversão para formato web (GLB/OBJ).

**Sem ação de código** até o tenant ter derived output disponível.

### PASSO 5 — Maturity write

**Bloqueio:** `GetNextStates 404` — endpoint bloqueado no tenant.

**Ação:** verificar permissão de lifecycle no Security Context `CS_IMPLANTACAO` para o role `VPLMProjectLeader`.

**Sem ação de código** até o tenant liberar o endpoint.

### PASSO 6 — Limpeza do repositório

**Arquivos órfãos para deletar:**
- `bom-ska-service-hotfix-20260617d-fixed.js`
- `widget-runtime-bom20260617d-r2.js`
- `bom-bundle-r2.js`
- `bom-ska-service-hotfix-r2.js`
- Múltiplos bundles antigos `bom-bundle-bom20260606*.js`

---

## 8. Lições aprendidas

### Sobre o 3DDashboard / Netvibes
1. **Usar `widget.addEvent('onLoad')` inline** — é o padrão oficial UWA. Nunca fazer polling por `w.widget`.
2. **`widget.body` só existe após onLoad** — não acessar antes.
3. **O `window` global persiste** entre reloads no Netvibes — boot state precisa ser resetado explicitamente.
4. **Netvibes cacheia scripts por nome de arquivo** — query strings (`?c=`) são ignoradas em alguns contextos.
5. **XHTML 1.0 Strict** — scripts inline precisam de `<![CDATA[...]]>`.

### Sobre o processo de desenvolvimento
1. **Nunca mexer em mais de um arquivo por problema** — cada patch em um arquivo, validação antes e depois.
2. **Não criar arquivos paralelos** (`-r2`, `-fixed`) — o proxy corporativo pode bloquear.
3. **`typeof null !== 'undefined'`** — usar `undefined` para stubs, não `null`.
4. **Não remover funcionalidades sem substituto** — o registry foi removido antes do backend estar pronto.
5. **Ler a documentação oficial antes de implementar** — a solução para o Loading infinito estava na documentação DS.

---

## 9. Referências

| Documento | URL |
|-----------|-----|
| Widget Principles (DS) | `https://library.plmcoach.com/caa3dx/.../CAAWebAppsTaWidgetWriting.htm` |
| Widget Object (DS) | `https://library.plmcoach.com/caa3dx/.../CAAWebAppsTaWidgetClass.htm` |
| Repositório | `https://github.com/MouraEnderson/HTML-PRODUCT-EXPLORE` |
| Link oficial | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3.html` |
