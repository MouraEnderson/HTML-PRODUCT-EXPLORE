# 3DEXPERIENCE Product Explorer — BOM Analytics Dashboard

Dashboard corporativo HTML para widget **3DDashboard**, consumindo estrutura E-BOM e atributos ENOVIA via contexto autenticado da plataforma.

## Arquitetura

```
index.html
└── assets/
    ├── css/dashboard.css
    └── js/
        ├── config.js                 # Configuração e constantes ENOVIA
        ├── app.js                    # Bootstrap e orquestração
        ├── platform/
        │   ├── context.js            # Security context, tenant, CSRF
        │   ├── compass.js            # Resolução 3DSpace / serviços
        │   └── waf-client.js         # WAFData authenticated REST
        ├── integration/
        │   ├── enovia-api.js         # Endpoints REST modelers
        │   └── product-explorer-bridge.js  # Seleção Product Explorer
        ├── services/
        │   ├── bom-service.js        # Hierarquia BOM lazy/paginada
        │   ├── attribute-service.js  # Atributos e engenharia
        │   └── physical-product-service.js
        ├── processing/
        │   ├── bom-normalizer.js     # Modelo interno unificado
        │   ├── metrics-engine.js     # KPIs e agregações
        │   └── anomaly-detector.js   # Inconsistências / gaps
        └── ui/
            ├── kpi-cards.js
            ├── charts-manager.js
            ├── data-table.js
            ├── bom-tree.js
            └── filters.js
```

## Camadas

| Camada | Responsabilidade |
|--------|------------------|
| **Platform** | Autenticação, tenant, 3DSpace URL, CSRF |
| **Integration** | APIs ENOVIA + bridge Product Explorer |
| **Services** | Fetch BOM, atributos, Physical Products |
| **Processing** | Normalização, métricas, anomalias |
| **UI** | KPIs, gráficos, tabela, árvore, filtros |

## Busca Physical Product (novo)

No topo do dashboard: campo **Buscar Physical Product na 3DEXPERIENCE**.

- Usa API federada do 3DSpace (`/resources/v1/modeler/search`)
- Filtra **VPMReference / Physical Product**
- Ao clicar no resultado, carrega BOM + colunas Product Explorer

Guia passo a passo: [DEPLOY-GITHUB-WIDGET.md](DEPLOY-GITHUB-WIDGET.md)

## Deploy GitHub Pages

1. Crie repositório `3dx-product-explorer-bom-dashboard` no GitHub.
2. Push desta pasta para `main`.
3. **Settings → Pages → Source**: branch `main`, folder `/ (root)`.
4. URL do widget: `https://<org>.github.io/3dx-product-explorer-bom-dashboard/index.html`

Para desenvolvimento local com dados mock: abra `index.html?demo=true`.

## Widget 3DDashboard

1. **Compass** → **3DDashboard** → criar dashboard.
2. Adicionar widget **Custom** / **External Content** (conforme versão).
3. URL: GitHub Pages ou raw (preferir Pages para HTTPS e cache).
4. Habilitar **Same Origin** / domínio confiável na administração 3DEXPERIENCE se exigido.
5. Opcional: publicar widget com `x3dPlatformId` e `collabspace` nos metadados.

## Product Explorer — conexão

O dashboard escuta:

- `postMessage` do Product Explorer / widget pai (`3DX_SELECTION`, `selectionChanged`).
- API `require('DS/PlatformAPI/PlatformAPI')` quando disponível no iframe.
- Parâmetro URL `?physicalid=<id>&type=VPMReference` para deep-link.

## APIs ENOVIA utilizadas

- `dseng:EngItem` — Engineering Item + expand BOM
- `dseng:EngInstance` — instâncias na estrutura
- `dspfl:PhysicalProduct` — produtos físicos
- `dseng:EngItem/dseng:EngInstance` — filhos diretos (lazy)
- Security context no header `SecurityContext`

Consulte documentação REST da sua release (R2022x–R2025x) para paths exatos do tenant.

## Performance

- Expansão lazy por nível (config `BOM_LAZY_BATCH_SIZE`).
- Índice em memória por `physicalid` para filtros O(1).
- Tabela e árvore com renderização por janela (virtual scroll).
- Limite configurável `BOM_MAX_NODES` para proteção.

## Licença

Uso interno corporativo — ajuste conforme política da sua organização.
