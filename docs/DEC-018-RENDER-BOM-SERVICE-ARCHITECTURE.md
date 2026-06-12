# DEC-018 — Render BOM Service Architecture

**Data:** 2026-06-11  
**Status:** decisão oficial de arquitetura  
**Render:** https://bom-resolver.onrender.com  
**Backend:** `backend/` (mesmo repositório)  
**Referências:** DEC-017 (mirror bloqueado), DEC-015 (Expand Item diagnóstico), DEC-016 (Explorer Mirror encerrado)

---

## 1. Problema original

O BOM Analytics foi concebido para exibir tabela E-BOM, KPIs e gráficos **coerentes com a estrutura de produto** aberta no 3DEXPERIENCE (Product Structure Explorer). O usuário abre o produto no Explorer; o dashboard deve refletir a estrutura de engenharia com colunas relevantes (Título, Revisão, Proprietário, Maturidade, Formato, Descrição) e KPI **Total Peças** alinhado à intenção de produto.

A proposta de negócio permanece válida: analytics sobre E-BOM no contexto do 3DDashboard (Additional App trusted).

---

## 2. O que foi tentado (builds `bom20260614h` … `bom20260614n`)

| Abordagem | Onde | Resultado |
|-----------|------|-----------|
| **Explorer Mirror** | `explorer-mirror-provider.js`, hotfix 14k–14n | Provider carrega; sem payload oficial de grade |
| **postMessage** | `product-explorer-bridge.js` | Tipos inferidos; sem broadcast comprovado do PSE |
| **ENOPSTR_AP / ENOSCEN_AP** | AMD `require` no provider | Sem contrato documentado; runtime sem linhas |
| **DOM scraping** | `product-explorer-bridge.js` (legado) | Proibido; cross-origin / não escalável |
| **clipboard / Ctrl+C / Ctrl+V** | `snapshot-panel.js`, bundle legado | Removido do fluxo principal (14l+) |
| **TSV** | `tsv-bom-loader.js`, `file-import-service.js` | Contingência legada; fora da arquitetura alvo |
| **Expand Item** (`dseng` POST `/expand`) | `expand-item-provider.js`, backend `expand-item/start` | API OK; contagem diverge do Explorer visual (ex.: 24 vs 17) |
| **Full BOM API** | `bomResolver.js`, browser-auth bridge | Estrutura via API; não equivale à grade visual do Explorer |
| **Espelho visual da grade PSE** | Várias combinações acima | **Sem contrato oficial comprovado** (DEC-017 conclusão D) |

Produto de referência nos testes: **CJ MESA 4BCS VP TOP 3DX**  
RootId conhecido: `63FC553465A62400699E0792000086AB`

---

## 3. Por que a arquitetura antiga foi bloqueada

1. **DEC-017** documentou que, no runtime e abordagem avaliados até o momento, não existe contrato oficial comprovado para o frontend ler/espelhar a **grade visual atual** do Product Structure Explorer. Isso não fecha a porta para Additional App nativo, extensão CAA ou contrato Dassault futuro.
2. Tentativas de mirror (postMessage, AMD inferido, DOM, clipboard, TSV, Expand Item como fonte principal) geravam **falsa sensação de sucesso** ou divergência mascarada.
3. O frontend GitHub Pages / widget UWA **não deve** consultar outro widget/app (PSE) nem fazer scraping.
4. Expand Item e Full BOM respondem perguntas de **EBOM via Engineering Web Services**, não de “o que o usuário vê expandido na UI do Explorer”.

A arquitetura antiga (frontend como coletor da grade do Explorer) está **encerrada**.

---

## 4. Nova decisão

O **frontend BOM Analytics** consome exclusivamente o **Render Backend / SKA BOM Service** (`backend/` neste repositório, deploy em https://bom-resolver.onrender.com).

O SKA BOM Service consulta **3DEXPERIENCE / 3DSpace / Engineering Web Services / dseng** e devolve **JSON normalizado** estável para tabela, KPIs e diagnóstico.

O frontend **não tenta mais ler** o Product Structure Explorer diretamente.

---

## 5. Nova arquitetura

```
BOM Analytics Frontend (Additional App / GitHub Pages)
        │
        │  HTTPS JSON
        ▼
Render Backend / SKA BOM Service  (bom-resolver.onrender.com)
        │
        │  REST autenticado (credenciais no servidor)
        ▼
3DEXPERIENCE / 3DSpace / dseng (Engineering Web Services)
```

**Rotas atuais preservadas** (não quebrar nesta migração):

| Método | Rota | Função atual |
|--------|------|----------------|
| GET | `/health` | Health do serviço legado |
| POST | `/api/bom/resolve` | Resolver BOM server-auth (`bomResolver.js`) |
| POST | `/api/bom/browser/start` | Job browser-auth bridge |
| POST | `/api/bom/browser/continue` | Continuação browser-auth |
| POST | `/api/bom/expand-item/start` | Expand Item diagnóstico |

**Rotas futuras** (PRs 2–3): ver `docs/API-CONTRACT-BOM-SERVICE.md`.

---

## 6. Responsabilidades do frontend

- Renderizar tabela E-BOM, KPIs, gráficos e preview.
- Chamar o backend Render (`POST /api/3dx/bom/structure` quando disponível).
- Exibir loading, erros e diagnóstico retornado pelo backend.
- Obter `rootId` via seleção/hash/configuração do usuário — **sem** ler outro widget.
- Feature flag para rollback (`BOM_DATA_SOURCE = render-bom-service`).
- Mensagem honesta sobre a fonte dos dados.

**Não fazer:**

- Consultar DOM de outro widget/iframe.
- Clipboard, TSV, postMessage inferido como fonte principal.
- Prometer espelho visual do Product Structure Explorer.

---

## 7. Responsabilidades do backend (SKA BOM Service)

- Receber e validar `rootId`, `depth`, `includeRoot`, `mode`.
- Autenticar no 3DSpace com credenciais **somente em variáveis de ambiente** (Render).
- Consultar `dseng:EngItem`, `dseng:EngInstance` (e helpers existentes em `enoviaClient.js`).
- Normalizar linhas no contrato `rows[]` (ver API contract).
- Retornar `counts`, `diagnostics`, erros sem vazar segredos.
- Reutilizar `EnoviaClient` / `bomResolver.js` onde fizer sentido — **sem duplicar** cliente.

**Env existente no backend** (referência `bomResolver.js`):

- `SPACE_URL`, `ENO_CSRF_TOKEN`, `SECURITY_CONTEXT`, `ENOVIA_COOKIE`, `ENOVIA_BEARER_TOKEN`
- `BOM_MAX_ITEMS`, `BOM_PAGE_SIZE`, `BOM_MAX_DEPTH`, `AUTO_CSRF`, `CORS_ORIGIN`, `PORT`

**Env futuro documentado** (PR 3, se necessário): `THREEDX_SPACE_URL`, `THREEDX_SECURITY_CONTEXT`, `THREEDX_USERNAME`, `THREEDX_PASSWORD` — mapear para padrão existente antes de introduzir duplicata.

---

## 8. O que não será mais feito

- Explorer Mirror fake como fonte principal.
- DOM scraping (`window.parent`, `iframe.contentDocument`, `querySelectorAll` no Explorer).
- Clipboard / Ctrl+C / Ctrl+V / TSV como fluxo principal.
- Expand Item como fonte principal da tabela (permanece diagnóstico se necessário).
- Full BOM API / browser-auth bridge apresentados como “Product Explorer Mirror”.
- Promessa de igualdade com a grade visual do PSE até existir contrato DS oficial para isso.

**Mensagem de produto (frontend):**

> Esta estrutura é retornada pelo SKA BOM Service via Engineering Web Services. Não representa leitura direta da grade visual do Product Structure Explorer.

---

## 9. Riscos

| Risco | Mitigação |
|-------|-----------|
| Autenticação 3DEXPERIENCE no Render | Credenciais em env; rotação; nunca no código/commits |
| Permissão do usuário vs service account | Documentar modo delegado; diagnostics sem segredo |
| CORS | Já configurado para `*.3dexperience.3ds.com` e GitHub Pages |
| Diferença dseng vs visualização Explorer | DEC-018 + mensagem honesta; não mascarar |
| Performance em estruturas grandes | `depth` limitado, paginação, `BOM_MAX_ITEMS` |
| Quebra de rotas legadas | PRs incrementais; rotas antigas intactas até deprecação explícita |
| Segredos em logs/diagnostics | Sanitizar responses de erro |

---

## 10. Rollback

- Branch **`backup/main-before-render-bom-service`** preserva o estado de `main` antes desta iniciativa.
- Frontend: feature flag `BOM_DATA_SOURCE` para voltar ao comportamento anterior durante transição.
- Backend: novas rotas em prefixo `/api/3dx/` sem remover `/api/bom/*` até Fase 5.

---

## Documentos relacionados

- `docs/ROADMAP-RENDER-BOM-SERVICE.md`
- `docs/API-CONTRACT-BOM-SERVICE.md`
- `docs/REPOSITORY-INVENTORY.md`
- `docs/LEGACY-CLEANUP-PLAN.md`
- `docs/DEC-017-PRODUCT-EXPLORER-MIRROR-CONTRACT-DISCOVERY.md`
