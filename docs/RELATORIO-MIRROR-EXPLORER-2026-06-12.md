# Relatório técnico — Mirror Explorer vs Full BOM API

Data: 2026-06-12  
Build de referência: `bom20260612h`  
Tenant piloto: `R1132100929518`

## Resumo executivo

O modo **Mirror Explorer** (dashboard = mesma quantidade e ordem visual do Product Structure Explorer expandido) **não é viável** com o widget atual hospedado em **GitHub Pages** dentro do 3DDashboard, mesmo como **Additional App trusted** com `WAFData` funcional.

A causa não é falta de autenticação REST. É a **ausência de contrato público** que exponha, para widgets externos, o estado **expandido/carregado** da árvore do Explorer — somada ao **isolamento de iframe** entre widgets no dashboard.

O modo **Full BOM via API** (`dseng` + backend/WAFData) continua viável, mas deve ser apresentado como **“BOM completa via API”**, não como espelho do Explorer.

---

## 1. Por que o widget GitHub Pages não acessa o estado expandido do Product Explorer

### 1.1 Isolamento de iframe (same-origin policy)

No 3DDashboard, **cada widget roda em iframe isolado**. O Product Structure Explorer (`ENOPSTR_AP` / ENOSCEN_AP) e o BOM Analytics ocupam iframes **irmãos**, não o mesmo documento.

- O BOM Analytics consegue ler **metadados do painel** no `top.document` (título, texto “21 objetos”, nome da raiz) via `harvestExplorerWidgetTextFromDashboard()`.
- O BOM Analytics **não consegue** acessar `frame.contentDocument` do iframe do Explorer: o navegador bloqueia com **cross-origin** (`*.3dexperience.3ds.com` ≠ `mouraenderson.github.io` transformado/injetado).
- Diagnóstico runtime (`probeAutomaticExplorerCapture`, build `bom20260612h`):
  - `sibling iframe access: blocked`
  - `explorer counter: 21` (contador OK)
  - `DOM rows found: 1` (somente raiz/metadados)
  - `final mirror rows: 1`

A grade virtualizada (WUX DataGrid) que contém as linhas expandidas está **dentro** do iframe do Explorer. Sem acesso ao documento interno, scroll automático e seletores DOM **não alcançam** filhos expandidos.

### 1.2 Additional App “trusted” não elimina o isolamento entre widgets

Documentação DS ([Widget Dashboard Integration](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm)):

| Modo | Acesso 3DSpace/WAFData | Comunicação entre widgets |
|------|------------------------|---------------------------|
| **Additional App (trusted)** | Sim | Sim (pub/sub, 6WTagger) |
| Run Your App (untrusted) | Não | Parcial |
| Web Page Reader | Não | Não |

O widget BOM roda como **Additional App trusted** (há `widget`, `WAFData`, `require`). Isso habilita REST ENOVIA — mas **não funde** o DOM do Explorer com o do BOM Analytics. Trusted significa acesso a servidores 3DEXPERIENCE, não leitura cross-widget do DOM interno.

### 1.3 Grid virtualizada

O Explorer renderiza apenas um subconjunto de linhas no DOM visível. Mesmo com acesso same-origin, seria necessário contrato estável de **scroll + modelo de dados** — não apenas scraping de células. No runtime atual, o acesso ao scroller interno já falha por cross-origin.

### 1.4 O que foi reprovado (e não será retomado)

| Caminho | Motivo |
|---------|--------|
| DOM mirror / scroll heurístico | Cross-origin + virtualização; captura 1/N |
| TSV / Ctrl+A/Ctrl+C / clipboard | Manual ou não confiável; proibido como solução |
| `slice(expectedCount)` / clamp por contador | Mascara falha; não espelha Explorer |
| Full backend BOM como fonte do mirror | API não representa expansão visual do usuário |
| Renderizar 1/21 como sucesso | Viola regra de negócio |

---

## 2. APIs oficiais 3DEXPERIENCE verificadas

### 2.1 Widget / Dashboard (inter-widget)

| API / mecanismo | O que entrega | Verificado no projeto | Entrega árvore expandida? |
|-----------------|---------------|----------------------|---------------------------|
| `widget` (UWA) + `addEvent` / `dispatchEvent` | Lifecycle e eventos entre widgets | Sim (`widget-v3-08i.html`) | **Não documentado** para estrutura expandida |
| `UWA/Utils/InterCom` publish/subscribe | Mensagens `3DXContent` entre widgets | Sim (`bom-bundle.js`, bridge) | **Seleção/contexto**, não árvore completa |
| `DS/PlatformAPI/PlatformAPI.getSelection()` | Objeto(s) selecionado(s) no dashboard | Sim (`product-explorer-bridge.js`) | **Seleção atual**, não nós expandidos |
| `DS/Selection/Selection.getSelection()` | Seleção global ENOVIA | Sim (bridge `initPlatformSelection`) | Idem |
| `postMessage` custom (`3DX_GET_STRUCTURE`, etc.) | Tentativa best-effort | Sim (`PlatformBridge.requestExplorerStructure`) | **Sem resposta** observada do Explorer |
| Deep link `3DXContent` / `ENOPSTR_AP` | **Abrir** objeto raiz no Explorer | Sim (`3dx-content-parser.js`, docs) | **Entrada** na app, não exportação de árvore |
| 6WTagger | Filtros/tags no dashboard | Citado na doc DS | Filtro de contexto, **não** lista de instâncias expandidas |

Fontes DS consultadas:

- [Widget Principles](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetWriting.htm) — openness “Between widgets”, “6WTagger”
- [Widget Dashboard Integration](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm)
- [Widget Class Reference](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRef/CAAWebAppsQrWidgetClass.htm) — `addEvent`, `dispatchEvent`
- [3DSwym — Link to object in 3DDashboard](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/link-directly-to-an-object-in-3ddashboard_PzA_WXcdSd6imG-ShMU1qQ) — `ENOPSTR_AP` + `X3DContentId` para **abrir** objeto
- Repositório interno: `docs/historico/root-md/ARQUITETURA-3DX-REFERENCIA.md`

### 2.2 REST 3DSpace (ENOVIA) — não é mirror do Explorer

| API | O que entrega | Verificado no tenant | Representa expansão visual do Explorer? |
|-----|---------------|---------------------|--------------------------------------|
| `WAFData.authenticatedRequest` | Chamadas autenticadas | Sim (Sprint 01.x) | N/A (transporte) |
| `i3DXCompassServices` → URL 3DSpace | Base REST | Sim | N/A |
| `GET dseng:EngItem/{id32}` | Item engenharia | Sim (após UQL `name:prd-R...`) | Raiz técnica, não estado UI |
| `GET dseng:EngItem/{id}/dseng:EngInstance` | Filhos diretos paginados | Sim (casos 50 e 79) | **BOM lógica**, não “o que o usuário expandiu” |
| `$mask=dsmveng:EngInstanceMask.Details` | `referencedObject` | Testado (Sprint 29) | Melhora resolução filho, ainda **não** espelha expansão UI |
| `POST dseng:EngItem/{id}/expand` | Expansão programática | Diagnóstico criado | Expansão **por API**, independente do Explorer |
| `dspfl:PhysicalProduct`, `dsxcad:VPMReference` | Resolução alternativa de raiz | Sim | Idem |

Evidências: `docs/ANALISE-CONTRATO-EBOM-2026-06-06.md`, sprints 01.x–08, 29.

### 2.3 Backend bridge (`bom-resolver`)

| Endpoint | Função | É mirror Explorer? |
|----------|--------|-------------------|
| `POST /api/bom/browser/start` | BFS + enriquecimento WAFData | **Não** — navega árvore por API a partir da raiz |
| `expectedCount` | Validação/delta apenas | Não deve cortar lista |

---

## 3. Existe contrato público para árvore expandida do Explorer?

### Conclusão: **Não encontrado**

Após revisão de documentação DS pública, código do repositório e testes no tenant:

| Dado necessário para mirror | Contrato público encontrado? |
|----------------------------|------------------------------|
| Objeto raiz atual | **Parcial** — `3DXContent`, seleção, deep link `ENOPSTR_AP` |
| Nós expandidos pelo usuário | **Não** |
| Nós carregados na grade | **Não** |
| Ordem visual da árvore | **Não** |
| Nível/hierarquia como no Explorer | **Não** (dseng entrega hierarquia **lógica**, não estado UI) |
| Lista de instâncias visíveis/carregadas | **Não** |

O que existe oficialmente:

1. **Abrir** objeto no Product Structure Editor/Explorer via `3DXContent` + `ENOPSTR_AP`.
2. **Seleção** global (`PlatformAPI`, `Selection`, eventos pub/sub) — tipicamente **um ou poucos** objetos, não a árvore expandida.
3. **REST dseng** — BOM de engenharia no servidor, **independente** do que o usuário expandiu na UI.

O que **não** existe na documentação acessível:

- API “`getExpandedTree()`”, “`getVisibleRows()`”, “`getLoadedInstances()`” do Product Structure Explorer.
- Evento documentado do Explorer publicando a lista completa de linhas expandidas para widgets externos.
- Exportação programática do estado da grade para iframes de outros widgets.

Citação consolidada do repositório (`ARQUITETURA-3DX-REFERENCIA.md`):

> O Explorer usa conteúdo `3DXContent` no hash — **abrir** objeto é suportado; **exportar seleção/estrutura expandida para iframe externo** não é API pública documentada.

### Implicação para o produto

O modo **“Mirror Explorer”** via widget GitHub Pages separado deve ser considerado **tecnicamente reprovado** até que a Dassault documente um contrato explícito ou o widget migre para **mesma origem** com acesso ao runtime interno do Explorer.

---

## 4. Arquitetura mínima do widget nativo (quando for implementado)

Objetivo: obter estado expandido **sem** DOM scraping cross-origin e **sem** TSV.

### 4.1 Pré-requisitos

| Requisito | Motivo |
|-----------|--------|
| Widget **Additional App** com HTML servido em domínio **trusted** do 3DDashboard (ou webapp `3DSpace`) | `require`, `WAFData`, pub/sub |
| Script inline no `<head>` para `widget` (regra DS) | Compatibilidade com motor UWA |
| UI em `widget.body` | Renderização correta no dashboard |
| Coexistir no mesmo dashboard que `ENOPSTR_AP` | Comunicação inter-widget |

### 4.2 Camadas mínimas

```
┌─────────────────────────────────────────────────────────┐
│ 3DDashboard (top)                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ ENOPSTR_AP (Explorer) │  │ BOM Analytics (nativo)    │ │
│  │ iframe same-origin    │  │ iframe trusted 3ddashboard│ │
│  └──────────┬───────────┘  └────────────┬─────────────┘ │
│             │    InterCom / PlatformAPI   │               │
│             └──────────────┬──────────────┘               │
└────────────────────────────┼──────────────────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ ExplorerBridge (mesma origem)   │
              │ - escuta eventos DS documentados│
              │ - OU acesso interno se exposto  │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ Snapshot normalizado (ordem,   │
              │ level, instanceId, metadata)  │
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ Enriquecimento opcional REST  │
              │ (WAFData — revisão, owner…)   │
              └──────────────────────────────┘
```

### 4.3 Fluxo mínimo (3 etapas)

1. **Captura do contrato Explorer** (bloqueante)
   - Validar com DS/tenant se `InterCom`, `PlatformAPI` ou evento `ENOPSTR_*` publica árvore expandida.
   - Se não existir: **não implementar mirror**; manter apenas modo API.

2. **Normalizador único**
   - Entrada: snapshot do Explorer (ordem + hierarquia + IDs de instância).
   - Saída: modelo interno `ExplorerRow[]` (já esboçado em `bom-api-id-hotfix`).

3. **Enriquecimento REST (secundário)**
   - `WAFData` só complementa metadados dos IDs capturados.
   - Nunca substitui lista/ordem do Explorer no modo mirror.

### 4.4 O que o widget nativo **não** precisa (no mínimo)

- Scraping de `top.document` por texto “N objetos”.
- `postMessage` com tipos inventados (`3DX_GET_STRUCTURE`) sem contrato.
- Backend BFS como fonte primária no modo mirror.

### 4.5 Critério de aceite do mirror nativo

- Explorer mostra N objetos expandidos → dashboard mostra **N linhas**, mesma ordem visual.
- Falha explícita se contrato Explorer não responder — sem fallback manual.

---

## 5. Separação oficial dos dois modos de produto

| Modo | Nome na UI | Fonte da lista | Viável hoje (GitHub Pages)? |
|------|------------|----------------|----------------------------|
| **1. Mirror Explorer** | “Estrutura do Explorer” | Contrato Explorer (evento/API nativa) + enriquecimento | **Não** |
| **2. Full BOM API** | “BOM completa via API” | `dseng` / backend BFS + WAFData | **Sim** (com limitações de contrato relacional documentadas) |

Regras:

- Modo 2 **não** usa `expectedCount` do Explorer para cortar lista.
- Modo 2 **não** exibe “Bridge OK (Explorer mirror)” quando a fonte foi API.
- Modo 1 **não** faz fallback para TSV, clipboard ou full BOM.
- `1/21` é sempre **erro**, nunca sucesso parcial.

---

## 6. Referências internas

- `docs/DECISOES-TECNICAS.md` — DEC-010, DEC-014
- `docs/ANALISE-CONTRATO-EBOM-2026-06-06.md`
- `assets/js/integration/product-explorer-bridge.js` — `probeAutomaticExplorerCapture`
- `assets/js/bom-api-id-hotfix-20260608a.js` — pipeline mirror (build `bom20260612h`)
