# DEC-017 — Product Explorer Mirror Contract Discovery

**Data:** 2026-06-11  
**Build de investigação:** `bom20260614n`  
**Deploy piloto:** **Additional App** (trusted) no 3DDashboard — **não** Web Page Reader.  
**Gate:** nenhuma implementação de Explorer Mirror na tabela principal até esta decisão ser aceita.

## Objetivo

Descobrir se existe contrato oficial para o widget BOM Analytics ler a estrutura **carregada/visível** do Product Structure Explorer (grade atual), com contagem e colunas equivalentes — sem DOM scraping, clipboard, TSV ou corte artificial.

## Requisito funcional

O dashboard E-BOM precisa bater com o Product Structure Explorer em:

- quantidade de objetos;
- linhas principais;
- colunas relevantes (Título, Revisão, Proprietário, Estado de maturidade, Formato, Descrição);
- KPI **Total Peças** = contagem do Explorer.

## Fontes pesquisadas

| Fonte | Link ou arquivo | Tipo | O que diz | Evidência encontrada | Relevância para Explorer Mirror | Resultado |
|-------|-----------------|------|-----------|----------------------|----------------------------------|-----------|
| CAA — Widget Dashboard Integration | [library.plmcoach.com/.../CAAWebAppsTaWidgetIntegration.htm](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm) | oficial | Três modos: Additional App (trusted), Run Your App (untrusted), **Web Page Reader** (stand-alone) | **Web Page Reader:** app **não** acessa 3DSpace/3DSwym; **não** integra 6WTagger; **não** usa capacidades do 3DDashboard (**comunicação entre widgets**, etc.) | Define o isolamento do widget GitHub Pages no piloto | **útil** |
| CAA — Widget Principles | [library.plmcoach.com/.../CAAWebAppsTaWidgetWriting.htm](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetWriting.htm) | oficial | Widget UWA em iframe; openness para comunicação **entre widgets** via `widget.addEvent` / `dispatchEvent` | Comunicação inter-widget documentada para widgets UWA no dashboard; não descreve export de grade do PSE para iframe externo | Confirma que mirror exige widget no modelo UWA confiável, não Web Page Reader puro | **útil** |
| CAA — Widget Object / Class Reference | [library.plmcoach.com/.../CAAWebAppsTaWidgetClass.htm](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJS/CAAWebAppsTaWidgetClass.htm) | oficial | Ciclo de vida, `addEvent`, `dispatchEvent`, preferências | Nenhum método documentado para ler grade de outro app (PSE) nem `getLoadedStructure` | Eventos genéricos; sem contrato de estrutura Explorer | **útil** (negativo) |
| CAA — 3DEXPERIENCE Applications overview | [library.plmcoach.com/.../CAAWebAppsJSTaOverview.htm](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsJSTaOverview.htm) | oficial | Widget colabora com Compass, Search, outros widgets, 6WTagger | Sem API nomeada para Product Structure Explorer / export de nós visíveis | Contexto de openness; sem contrato PSE→widget externo | **inconclusivo** |
| DS Engineering Web Services — `dseng_v1` | [media.3ds.com/.../dseng_v1.htm](https://media.3ds.com/support/documentation/developer/Cloud/en/DSDoc.htm?show=CAAEngineeringWS/dseng_v1.htm) | oficial | REST `dseng:EngItem`, `EngInstance`, **POST** `/expand` com `expandDepth`, `withPath`, filtros BO/rel | Expand retorna `member` + `Path` — **EBOM expandida por profundidade**, não “estado visual” do Explorer | API de estrutura de engenharia, não mirror de grade UI | **útil** (modo C) |
| DS CPE — `ws3dx.dseng` (GitHub) | [github.com/3ds-cpe-emed/ws3dx-dotnet](https://github.com/3ds-cpe-emed/ws3dx-dotnet) | sample oficial | Cliente .NET para família `dseng`; `EngItemService.Expand` | Confirma contrato REST; sem semântica “loaded/visible nodes” do PSE | Mesmo que dseng_v1 | **útil** |
| 3DS Openness | [3ds.com/3dexperience/openness](https://www.3ds.com/3dexperience/openness) | oficial | REST + JMS para integração enterprise | Integração server-side / serviços autenticados; não descreve export de grade PSE para widget GitHub | Caminho E (serviço intermediário) | **útil** |
| Repo — `ARQUITETURA-3DX-REFERENCIA.md` | `docs/historico/root-md/ARQUITETURA-3DX-REFERENCIA.md` | inferência interna | Web Page Reader vs Additional App; deep-link `3DXContent` abre objeto; **exportar seleção para iframe externo não é API pública documentada** | Alinhado com CAA Web Page Reader | Arquitetura do piloto atual | **útil** |
| Repo — DEC-014 / DEC-015 / DEC-016 | `docs/DECISOES-TECNICAS.md`, `docs/DEC-015-*.md`, `docs/DEC-016-*.md` | inferência interna | Mirror GitHub Pages reprovado; Expand Item = EBOM API; Explorer Mirror como meta sem contrato provado | Expand Item validado tenant (24 linhas) vs Explorer (17) — divergência funcional | Histórico de tentativas | **útil** |
| Repo — `RELATORIO-MIRROR-EXPLORER-2026-06-12.md` | `docs/RELATORIO-MIRROR-EXPLORER-2026-06-12.md` | inferência interna | Mirror via GitHub Pages encerrado como sprint ativo | Cross-origin + sem API pública de árvore carregada | Confirma direção DEC-017 | **útil** |
| Tenant — Expand Item (build `14l`) | runtime / validação interna | runtime | WAFData OK, CSRF 200, POST expand 200, `normalizedRows` 24 | Explorer mostra **17** objetos no teste atual | Prova que API expand **não** espelha grade | **útil** |
| Tenant — ExplorerMirrorProvider (`14l`) | runtime | runtime | Provider carrega; `fetch` retorna 0 linhas oficiais; tabela vazia | postMessage/AMD/cache sem payload de estrutura | Nenhum contrato ativo no runtime | **útil** |
| UWA Widget reference | [uwa.netvibes.com/docs/.../Widget.UWA.Widget.html](https://uwa.netvibes.com/docs/Uwa/html/Widget.UWA.Widget.html) | oficial | API UWA genérica (title, body, preferences) | Sem API de estrutura ENOVIA/PSE | Base UWA apenas | **não útil** para mirror |
| Trimech — Product Structure Explorer (blog) | [trimech.com/.../accessing-data](https://trimech.com/managing-cad-data-on-3dexperience-part-3-accessing-data/) | terceiro | PSE: árvore, colunas configuráveis, export BOM, filtros 6W | Descreve **funcionalidade de usuário** (export), não API widget→widget para grade carregada | Confirma que export existe na UI, não como contrato para widget externo | **inconclusivo** |

## Candidatos avaliados

### Candidato 1 — PlatformAPI / postMessage oficial

| Campo | Valor |
|-------|-------|
| Nome técnico | `DS/PlatformAPI/PlatformAPI`, `window.postMessage`, eventos `3DXContent` |
| Origem da evidência | Código `product-explorer-bridge.js`; CAA widget events; uso DS em widgets nativos |
| É documentado oficialmente? | **Parcial** — PlatformAPI e seleção em widgets confiáveis; postMessage ad hoc **não** documentado para export de grade PSE |
| Está disponível no runtime? | WAFData/Compass carregam em widget `08i` (trusted flag); PlatformAPI às vezes via `require` |
| Acessível a partir do widget BOM? | **Parcial** — seleção/root possível; grade completa não comprovada |
| Retorna estrutura carregada do Explorer? | **Não** comprovado |
| Retorna somente seleção? | **Sim** (padrão `getSelection` / `3DXContent` com 1..N itens) |
| Retorna full EBOM? | **Não** |
| Retorna grade visível? | **Não** comprovado |
| Risco de ser gambiarra | Alto se inventar tipos `ENOPSTR_structure` sem documentação |
| Pode ser usado na tabela principal? | **Não** (insuficiente para mirror) |
| Motivo | CAA não define payload de linhas da grade PSE para consumo por Web Page Reader; bridge escuta tipos por inferência, sem evidência de broadcast do Explorer |

### Candidato 2 — i3DXCompassServices

| Campo | Valor |
|-------|-------|
| Nome técnico | `DS/i3DXCompassServices/i3DXCompassServices` |
| Origem da evidência | CAA “Service URL and Platform Instance”; `widget-v3-08i.html` `loadWaf` |
| É documentado oficialmente? | **Sim** — resolução de URL de serviços (3DSpace, etc.) |
| Está disponível no runtime? | **Sim** no widget com WAFData |
| Acessível a partir do widget BOM? | **Sim** |
| Retorna estrutura carregada do Explorer? | **Não** — só URLs de plataforma |
| Retorna somente seleção? | **Não** |
| Retorna full EBOM? | **Não** |
| Retorna grade visível? | **Não** |
| Risco de ser gambiarra | Baixo |
| Pode ser usado na tabela principal? | **Não** (infraestrutura apenas) |
| Motivo | Compass resolve host; não exporta grade do PSE |

### Candidato 3 — WAFData + APIs públicas REST (`dseng`, search, EngInstance)

| Campo | Valor |
|-------|-------|
| Nome técnico | `WAFData.authenticatedRequest`, `/resources/v1/modeler/dseng/...` |
| Origem da evidência | `dseng_v1`, DEC-015, validação tenant Expand Item |
| É documentado oficialmente? | **Sim** |
| Está disponível no runtime? | **Sim** (widget trusted / Additional App) |
| Acessível a partir do widget BOM? | **Sim** no piloto atual |
| Retorna estrutura carregada do Explorer? | **Não** — retorna modelo ENOVIA por profundidade/lazy, independente do que o usuário expandiu na UI |
| Retorna somente seleção? | **Não** |
| Retorna full EBOM? | **Sim** (com parâmetros de expand/recursão) |
| Retorna grade visível? | **Não** |
| Risco de ser gambiarra | Baixo tecnicamente; **alto funcionalmente** se usado como “mirror” |
| Pode ser usado na tabela principal? | **Não** para requisito Explorer Mirror; **sim** para modo “BOM completa via API” (DEC-014) |
| Motivo | Contrato REST ≠ estado visual do PSE; prova tenant: 24 ≠ 17 |

### Candidato 4 — DataDragAndDrop oficial

| Campo | Valor |
|-------|-------|
| Nome técnico | Drag-and-drop 3DDashboard / HTML5 DnD |
| Origem da evidência | CAA (DnD de apps no Compass); `DRAG-DROP-EXPLORER.md` (Excel local) |
| É documentado oficialmente? | DnD de **apps** no dashboard; **não** DnD de grade PSE para widget externo |
| Está disponível no runtime? | DnD de arquivo no widget (legado); não estrutura live do Explorer |
| Acessível a partir do widget BOM? | Export manual Excel → drop (legado, fora do escopo) |
| Retorna estrutura carregada do Explorer? | Só via export manual do usuário |
| Retorna somente seleção? | N/A |
| Retorna full EBOM? | Depende do export |
| Retorna grade visível? | Apenas se usuário exportar |
| Risco de ser gambiarra | Alto como mirror automático |
| Pode ser usado na tabela principal? | **Não** (proibido pelo requisito: sem clipboard/TSV/export manual) |
| Motivo | Não há contrato DS de DnD da grade PSE para Web Page Reader |

### Candidato 5 — ENOPSTR_AP

| Campo | Valor |
|-------|-------|
| Nome técnico | `DS/ENOPSTR_AP/ENOPSTR_AP` (Product Structure Editor) |
| Origem da evidência | Inferência em `explorer-mirror-provider.js`; deep-link CAA cita `ENOPSTR_AP` |
| É documentado oficialmente? | **Não** encontrado método público `getLoadedStructure` / export de grade para terceiros |
| Está disponível no runtime? | **Não comprovado** — `require` falha ou módulo sem API esperada no iframe BOM |
| Acessível a partir do widget BOM? | **Não** comprovado (Web Page Reader isolado) |
| Retorna estrutura carregada do Explorer? | **Não comprovado** |
| Retorna somente seleção? | **Não comprovado** |
| Retorna full EBOM? | **Não comprovado** |
| Retorna grade visível? | **Não comprovado** |
| Risco de ser gambiarra | **Muito alto** — nome inventado sem doc |
| Pode ser usado na tabela principal? | **Não** |
| Motivo | Sem evidência oficial de API exportável; tentativa AMD no provider não retornou linhas |

### Candidato 6 — ENOSCEN_AP

| Campo | Valor |
|-------|-------|
| Nome técnico | `DS/ENOSCEN_AP/ENOSCEN_AP` (ENXScene / Product Explorer) |
| Origem da evidência | `ARQUITETURA-3DX-REFERENCIA.md`; bridge message hints `ENOSCEN_selection` |
| É documentado oficialmente? | App nativo web (`ENXScene.html`); **sem** API pública documentada de export de grade para widget externo |
| Está disponível no runtime? | App roda em iframe irmão; módulo AMD **não** exposto ao widget BOM |
| Acessível a partir do widget BOM? | **Não** |
| Retorna estrutura carregada do Explorer? | **Não** |
| Retorna somente seleção? | Eventos de seleção inferidos; não estrutura |
| Retorna full EBOM? | **Não** |
| Retorna grade visível? | **Não** |
| Risco de ser gambiarra | **Muito alto** |
| Pode ser usado na tabela principal? | **Não** |
| Motivo | Isolamento iframe + ausência de contrato público |

### Candidato 7 — Product Structure Explorer internal modules

| Campo | Valor |
|-------|-------|
| Nome técnico | Módulos internos PSE (grid engine, virtual scroll) |
| Origem da evidência | Código legado `product-explorer-bridge.js` (DOM/text — **fora do escopo DEC-017**) |
| É documentado oficialmente? | **Não** |
| Está disponível no runtime? | Inacessível cross-origin |
| Acessível a partir do widget BOM? | **Não** |
| Retorna estrutura carregada do Explorer? | Só via scraping (proibido) |
| Pode ser usado na tabela principal? | **Não** |
| Motivo | Violação explícita do requisito; não é contrato oficial |

### Candidato 8 — Product Structure Editor APIs

| Campo | Valor |
|-------|-------|
| Nome técnico | PSE / Structure Editor (ENOPSTR) |
| Origem da evidência | CAA deep-link `app:ENOPSTR_AP` |
| É documentado oficialmente? | Abertura de objeto via `3DXContent`; não export de árvore carregada |
| Está disponível no runtime? | App separado no dashboard |
| Acessível a partir do widget BOM? | **Não** |
| Retorna estrutura carregada do Explorer? | **Não** |
| Pode ser usado na tabela principal? | **Não** |
| Motivo | Mesmo que candidatos 5–6 |

### Candidato 9 — dseng Expand Item

| Campo | Valor |
|-------|-------|
| Nome técnico | `POST .../dseng:EngItem/{id}/expand` |
| Origem da evidência | DEC-015, validação tenant `bom20260614g`–`14l` |
| É documentado oficialmente? | **Sim** |
| Está disponível no runtime? | **Sim** |
| Acessível a partir do widget BOM? | **Sim** |
| Retorna estrutura carregada do Explorer? | **Não** — 24 linhas vs 17 no Explorer (teste atual) |
| Retorna somente seleção? | **Não** |
| Retorna full EBOM? | **Parcial** (expansão por `expandDepth`) |
| Retorna grade visível? | **Não** |
| Risco de ser gambiarra | Alto se usado como mirror silencioso |
| Pode ser usado na tabela principal? | **Não** — apenas diagnóstico Avançado |
| Motivo | Divergência funcional comprovada; doc não promete equivalência com UI |

### Candidato 10 — Full BOM API (EngInstance recursivo / backend)

| Campo | Valor |
|-------|-------|
| Nome técnico | `dseng:EngInstance`, lazy children, `bom-resolver` backend |
| Origem da evidência | DEC-014, sprints API-first |
| É documentado oficialmente? | **Sim** (REST) |
| Está disponível no runtime? | **Sim** |
| Retorna estrutura carregada do Explorer? | **Não** |
| Retorna full EBOM? | **Sim** (reconstruída) |
| Pode ser usado na tabela principal? | **Não** para mirror; **sim** para modo API explícito |
| Motivo | “Mirror falso” reprovado em DEC-014/016 |

### Candidato 11 — 3DSearch / rootId + estrutura

| Campo | Valor |
|-------|-------|
| Nome técnico | Federated search, `EngItem/search`, physical id |
| Origem da evidência | Sprints 01.x, `enovia-api.js` |
| É documentado oficialmente? | **Sim** (search) |
| Retorna estrutura carregada do Explorer? | **Não** — resolve raiz/objeto |
| Pode ser usado na tabela principal? | **Não** para mirror |
| Motivo | Entrada para API; não reflete expansão visual do usuário |

### Candidato 12 — Event bus / inter-app communication (`widget`, InterCom)

| Campo | Valor |
|-------|-------|
| Nome técnico | `widget.addEvent` / `dispatchEvent`, `UWA/Utils/InterCom` |
| Origem da evidência | CAA Widget Object; `3dplay-bridge.js` |
| É documentado oficialmente? | **Sim** para mecanismo genérico entre widgets **no modelo UWA confiável** |
| Está disponível no runtime? | **Parcial** — Web Page Reader **não** tem capacidades 3DDashboard (CAA) |
| Acessível a partir do widget BOM? | **Não** no Web Page Reader; **possível** em Additional App |
| Retorna estrutura carregada do Explorer? | **Não** sem app PSE publicar evento documentado |
| Pode ser usado na tabela principal? | **Não** hoje; **caminho futuro** com Additional App + contrato DS/tenant |
| Motivo | Mecanismo existe; **payload** de grade PSE não documentado |

## Resultado da investigação

**Conclusão: D — Não foi encontrada fonte oficial acessível ao widget (Web Page Reader + GitHub Pages) para espelhar a grade atual do Product Structure Explorer.**

Evidência convergente:

1. **CAA** restringe Web Page Reader: sem REST 3DSpace, sem comunicação entre widgets, sem 6WTagger.
2. **`dseng` Expand Item** é oficial mas retorna **EBOM expandida** (C), com contagem **diferente** do Explorer no tenant.
3. **ENOPSTR_AP / ENOSCEN_AP / `getLoadedStructure`** — **sem documentação oficial** encontrada; tentativas no runtime não produziram linhas.
4. **postMessage** com tipos inferidos — **sem evidência** de broadcast oficial do PSE com `loadedNodes` / grade.

Nota: viabilizar mirror no futuro alinha-se com **E** (Additional App trusted, extensão CAA/tenant, ou serviço intermediário com contrato explícito) — mas isso **não** constitui contrato existente hoje para o widget atual.

## Decisão técnica (conclusão D)

- **NÃO** implementar mirror falso.
- **NÃO** preencher tabela com Expand Item.
- **NÃO** usar clipboard, DOM scraping, TSV ou `slice(expectedCount)`.
- Tabela principal permanece **vazia** até existir contrato comprovado.
- Widget deve exibir honestamente:

  > Não foi encontrada fonte oficial acessível ao widget para espelhar exatamente a grade atual do Product Structure Explorer. O diagnóstico Expand Item está disponível, mas retorna uma estrutura diferente e não será usado como fonte principal.

### Caminhos corretos (fora do gate atual)

| Caminho | Descrição |
|---------|-----------|
| **Additional App (trusted)** | Registrar widget no Platform Manager; habilitar WAFData + inter-widget; validar com DS se PSE publica evento de estrutura |
| **Extensão nativa / CAA** | App no domínio ENOVIA/3DDashboard com acesso aos módulos PSE |
| **Serviço tenant-side** | Backend com 3DPassport + REST; contrato de dados acordado com TI — não equivale a “grade visível” sem spec DS |
| **Suporte Dassault / SKA** | Solicitar API oficial “loaded/visible nodes” do Product Structure Explorer para widgets de dashboard |

### Validação contínua

Use o probe **ProductExplorerMirrorContractProbe** (Avançado → “Copiar relatório DEC-017”) após cada build. Critérios para liberar implementação:

- fonte documentada ou comprovada no runtime;
- acesso permitido ao widget;
- linhas equivalentes ao Explorer;
- campos suficientes para colunas da tabela;
- contagem compatível;
- sem DOM / clipboard / TSV / corte artificial.

### Versionamento (cache)

Se `requestedBuildFromUrl !== runtimeBuild`, o relatório DEC-017 deve alertar:

> Versão divergente: Web Page Reader ainda aponta para {requestedBuildFromUrl}, mas runtime carregou {runtimeBuild}. Atualize a URL do widget e faça hard refresh.

Não usar divergência de cache como desculpa para fallback.

## Referências internas

- `docs/DEC-016-EXPLORER-MIRROR.md`
- `docs/DEC-015-EXPAND-ITEM-PROVIDER.md`
- `docs/DECISOES-TECNICAS.md` (DEC-014)
- `docs/RELATORIO-MIRROR-EXPLORER-2026-06-12.md`
- `assets/js/integration/product-explorer-mirror-contract-probe.js`
