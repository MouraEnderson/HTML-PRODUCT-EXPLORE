# O que você quer (referência única)

Este arquivo é o **norte** do projeto. Tudo o resto (código, deploy, testes) serve a isto.

---

## Objetivo principal

**Dashboard HTML no 3DDashboard** que:

1. **Lê a estrutura E-BOM** aberta no **Product Structure Explorer**
2. **Lê atributos** dos objetos (nome, revisão, maturidade, owner, collabspace, etc.)
3. **Monta automaticamente** KPIs, gráficos, tabela (colunas do Explorer), árvore BOM
4. **Atualiza** quando você muda a seleção / estrutura no Explorer
5. Roda com **sessão autenticada** da 3DEXPERIENCE (WAFData / ENOVIA REST)

**Não é o objetivo:** substituir o Explorer por upload de Excel, CSV, XLS ou listas de clientes coladas de outra planilha.

---

## O que você pediu no prompt original

| Requisito | Status no código |
|-----------|------------------|
| Hierarquia BOM, níveis, assemblies, filhos | `bom-service.js` + `bom-tree.js` (com API) |
| Atributos / maturidade / aprovação | `attribute-service.js`, colunas Explorer |
| Physical Products, gaps, duplicados | `physical-product-service.js`, `anomaly-detector.js` |
| KPIs e gráficos | `metrics-engine.js`, `kpi-cards.js`, `charts-manager.js` |
| Filtros, busca, export Excel | `filters.js`, `data-table.js` |
| Lazy load, paginação, performance | `bom-service.js`, `APP_CONFIG.BOM_*` |
| Integração widget 3DDashboard | `platform/*`, `product-explorer-bridge.js` |
| GitHub como **repositório** do código | Repo `HTML-PRODUCT-EXPLORE` |

---

## O que impede hoje (uma verdade só)

O widget aponta para **`github.io`**.

No GitHub o navegador **não deixa** o HTML:

- chamar `WAFData` / APIs ENOVIA do seu tenant
- ler o Product Explorer na outra aba
- carregar filhos da BOM do Drone (ou qualquer assembly)

Por isso **Sincronizar**, **Buscar** e **Physical ID** no GitHub só mostram **1 item** ou **demo** — não é falha do layout, é **limite de segurança**.

---

## O que entrega o objetivo de verdade

### Caminho obrigatório: HTML no **3DSpace** (mesmo domínio do Explorer)

**URL do widget (Web Page Reader):**

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

**Pacote:** pasta `webapps/BomAnalytics/` deste projeto.  
**Quem instala:** administrador 3DEXPERIENCE / ENOVIA.  
**Guia:** `DEPLOY-3DSPACE.md` (inclui texto para e-mail ao admin).

### Configuração do dashboard **LISTA 3DX**

| Aba | Widget | Função |
|-----|--------|--------|
| EXPLORE | Product Structure Explorer | Você abre o produto (ex.: Drone) |
| PRODUCTEXPLORE | Web Page Reader | URL **3DSpace** acima (não GitHub) |

**Ideal:** Explorer + HTML na **mesma aba** (dois widgets) para seleção compartilhada.

---

## GitHub: para quê?

| Uso | Sim/Não |
|-----|---------|
| Guardar código, versionar, compartilhar com admin | **Sim** |
| URL do widget em **produção** com BOM real do Explorer | **Não** |
| Testar layout com `?demo=true` ou localhost | **Sim** |

Fluxo correto: **desenvolve no GitHub** → **admin publica em 3DSpace** → **widget usa URL 3DSpace**.

---

## O que ignorar daqui pra frente

- Importar XLS de **outras planilhas** (lista de clientes, etc.) — não é BOM do Explorer
- jsDelivr como URL do widget (mostra código, não página)
- Documento na pasta DEPLOY / Bookmark — não vira site
- Esperar BOM completa automática com link `mouraenderson.github.io`

---

## Próximo passo único (ação sua)

1. Enviar ao admin: `BomAnalytics-3DSpace.zip` (gerar com comando em `DEPLOY-3DSPACE.md`)
2. Pedir publicação em `webapps/BomAnalytics`
3. Trocar URL do Web Page Reader para a URL **3DSpace**
4. Abrir Drone no Explorer → **Atualizar** no dashboard → validar árvore + KPIs

Quando isso estiver feito, o projeto cumpre o objetivo que você definiu no início.
