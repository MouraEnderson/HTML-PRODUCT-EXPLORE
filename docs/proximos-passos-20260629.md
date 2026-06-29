# BOM Analytics — Próximos Passos e Análise de 3D

**Data:** 2026-06-29
**Status:** Widget carrega no F5 via UWA lifecycle. E-BOM, contagem, 3D e maturity pendentes.

---

## 1. Estado atual confirmado

| Item | Status | Detalhe |
|------|--------|---------|
| Widget carrega no F5 | ✅ | UWA lifecycle oficial resolveu Loading infinito |
| Layout 5 zonas | ✅ | CSS com grid-template-areas |
| Topbar com Sincronizar/Atualizar | ✅ | Botões visíveis |
| WAFData autenticado | ✅ | Diagnóstico PASS |
| CSRF | ✅ | 200 OK |
| GET EngItem CJ MESA | ✅ | 200, root dseng correto |
| POST expand (13 membros) | ✅ | 200 com SC+CSRF |
| E-BOM dados na tela | ❌ | RESOLVE_PENDING — auto-sync não dispara |
| Gráficos pizza | ❌ | Depende da E-BOM |
| Contagem real | ❌ | DEFAULT_DEPTH=8 no código mas E-BOM não carrega |
| 3D viewer | ❌ | fileCount=0 + sem viewer implementado |
| Maturity write | ❌ | GetNextStates 404 |

---

## 2. Próximos passos — em ordem de prioridade

### PASSO 1 — E-BOM carregando dados automaticamente (PRIORIDADE MÁXIMA)

**Problema:** `source: NONE · RESOLVE_PENDING`

O widget carrega mas não dispara a sincronização automática com o PSE. O diagnóstico mostra que manualmente (botão Testar E-BOM) retorna 13 rows com sucesso.

**Causa provável:** com a remoção do `bootWidget()` auto-call, o `App.run()` no `finishBoot` pode não estar disparando o polling automático do PSE que antes era ativado pelo `bootWidget → onLoad → executeInit → startBundle → finishBoot → App.run`.

**Investigação necessária:**
1. Verificar se `App.run()` está sendo chamado no fluxo UWA
2. Verificar se `ExplorerContext` está disponível quando `App.run()` executa
3. Verificar se o polling do sync-provider é ativado após o boot

**Abordagem:** mínima invasão — garantir que `App.run()` e o polling do PSE funcionem no fluxo UWA sem reintroduzir o `bootWidget()`.

**Arquivos envolvidos:** `widget-runtime-bom20260617d.js` (finishBoot), `bom-bundle-bom20260607a.js` (App.run), `bom-ska-service-hotfix-20260617d.js` (syncWithProductExplorer)

---

### PASSO 2 — Contagem real da E-BOM

**Pré-requisito:** PASSO 1 concluído.

**O que está pronto no código:**
- `DEFAULT_DEPTH = 8` no hotfix
- `resolveKnownExplorerRoot` com fallback interno por título
- Registry CJ MESA no sync-provider

**Validação necessária após PASSO 1:**
- Diagnóstico deve mostrar `expandDepth 8`
- Explorer mostra 8 objetos → E-BOM deve ter mais linhas que 5
- Contagem explicada: depth, includeRoot, occurrenceCount, uniqueReferenceCount

---

### PASSO 3 — Visualização 3D

**Situação atual:**
- 3DShape representation probe: 200 PASS (representação existe no servidor)
- dsdo DerivedOutputs/Locate: fileCount=0 (sem formato web: GLB/OBJ/STL)
- Derived output configurado no tenant mas conversão não gerou formato web
- waf3dx-client já tem funções de probe, locate e download implementadas

**Análise de alternativas:**

#### Opção A — Thumbnail/imagem da peça (viável agora)
- **Como:** GET do EngItem retorna campo `image` ou usar API de thumbnail do 3DSpace
- **Prós:** sempre disponível, sem dependência de conversão, implementação simples
- **Contras:** não é 3D interativo, apenas imagem 2D estática
- **Nível de esforço:** baixo (1-2 horas)
- **Respeita premissas:** sim — é visualização honesta, não fake

#### Opção B — Download 3DShape e render com Three.js (complexo)
- **Como:** checkout ticket via FCS → download CGR/3DXML → parse → render Three.js
- **Prós:** 3D real interativo dentro do widget
- **Contras:** CGR/3DXML são formatos proprietários DS, parser complexo, pode não funcionar
- **Nível de esforço:** alto (dias/semanas)
- **Respeita premissas:** sim — é geometria real

#### Opção C — Forçar geração de derived output GLB via API (investigar)
- **Como:** POST para forçar conversão sob demanda usando a API dsdo
- **Prós:** se funcionar, usa o pipeline de derived output já configurado
- **Contras:** pode não estar disponível na versão do tenant, pode demorar
- **Nível de esforço:** médio (1-2 dias para investigar)
- **Respeita premissas:** sim

#### Opção D — Usar módulo AMD DS/ThreeJS ou DS/3DPlayViewer (investigar)
- **Como:** carregar módulo AMD do 3DEXPERIENCE via require() dentro do widget
- **Prós:** usa a infraestrutura nativa da plataforma para rendering
- **Contras:** pode ser considerado "3DPlay" nas premissas do projeto
- **Nível de esforço:** médio (1-2 dias)
- **Respeita premissas:** discutível — é módulo nativo, não iframe 3DPlay

#### Opção E — Cross-widget com 3DPlay via DS/Selection (opção DS oficial)
- **Como:** publicar o item selecionado via DS/Selection; 3DPlay em widget separado exibe
- **Prós:** abordagem oficial DS, zero implementação de viewer
- **Contras:** requer 3DPlay como widget separado no dashboard; premissas rejeitam 3DPlay
- **Nível de esforço:** baixo (horas)
- **Respeita premissas:** não — premissas rejeitam 3DPlay como sucesso de 3D

**Recomendação:** começar com **Opção A (thumbnail)** como MVP imediato, investigar **Opção C (forçar conversão)** em paralelo. Se a Opção C funcionar, implementar download GLB + Three.js viewer.

---

### PASSO 4 — Maturity write

**Bloqueio:** `GetNextStates 404` — endpoint não responde no tenant.

**Investigação necessária:**
- Verificar se o endpoint `/invoke/dseng:GetNextStates` está disponível na versão do tenant
- Verificar se o Security Context `VPLMProjectLeader.Company Name.CS_IMPLANTACAO` tem permissão lifecycle
- Testar com outro Security Context ou outro role
- Testar em outro item (não só CJ MESA)

**O que já funciona no código:**
- Maturity read: PASS (lê estado atual)
- Botão "Alterar maturidade" visível
- Fluxo read → list transitions → write → reread implementado no hotfix

---

### PASSO 5 — Limpeza do repositório

Arquivos órfãos para deletar:
```
assets/js/bom-ska-service-hotfix-20260617d-fixed.js
assets/js/widget-runtime-bom20260617d-r2.js
assets/js/bom-bundle-r2.js
assets/js/bom-ska-service-hotfix-r2.js
Múltiplos bundles antigos bom-bundle-bom20260606*.js
```

---

## 3. Premissas do projeto (referência rápida)

- Link: `widget-v3.html` sem parâmetros
- `prd-R` nunca como dseng direto — sempre resolver antes
- E-BOM sem limite de linhas — paginação/lazy
- 3D: só geometria real renderizável (não 3DPlay/iframe/fake/placeholder)
- Maturity: read → list → write → reread → confirmar mudança
- Sem dados fake, mock, fallback silencioso
- Um arquivo por commit, validação antes de avançar
- Ciclo de vida UWA: `widget.addEvent('onLoad')` inline no HTML (padrão DS)

---

## 4. Dados do tenant

| Item | Valor |
|------|-------|
| 3DSpace | `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia` |
| Security Context | `ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO` |
| CJ MESA dseng root | `63FC553465A62400699E0792000086AB` |
| CJ MESA prd-R | `prd-R1132100929518-01103695` |
| Derived output | Configurado (STEP_AP214/AP242/XCV) mas fileCount=0 |
| Maturity | GetNextStates retorna 404 |
