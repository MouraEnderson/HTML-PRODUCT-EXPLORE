# HTML Product Explore

Aplicacao HTML/JS para analise de E-BOM dentro do 3DEXPERIENCE, executada como Additional App no 3DDashboard e publicada via GitHub Pages.

## Direcao atual

O produto segue este escopo:

- Runtime: 3DDashboard Additional App.
- Publicacao: GitHub Pages.
- Acesso autenticado: WAFData.
- Dados PLM: 3DSpace REST resolvido via i3DXCompassServices.
- Estrutura: E-BOM API-first, com fallback manual apenas como contingencia.
- Visualizacao: viewer 3D proprio dentro da aplicacao.

Fora do escopo:

- Web Page Reader.
- Deploy admin em `webapps` da plataforma 3DX.
- Widget 3DPlay como solucao final.
- Ctrl+A/Ctrl+C como fluxo principal.

## Entrada do app

Use esta URL no Additional App:

```text
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-boot.html
```

Fluxo atual identificado:

```text
widget-boot.html
  -> widget-v3.html
    -> assets/js/build-id.js
    -> assets/js/bom-bundle-bom20260606f.js
    -> assets/vendor/chart.umd.min.js
    -> assets/css/dashboard.css
```

## Documentacao principal

- [Plano tecnico - Fase 0](docs/PLANO-TECNICO-FASE-0.md)
- [Decisoes tecnicas](docs/DECISOES-TECNICAS.md)
- [Organizacao do repositorio](docs/ORGANIZACAO-REPOSITORIO.md)
- [Backlog inicial por sprints](docs/BACKLOG-SPRINTS.md)
- [Levantamento atual 3DX](docs/levantamento/LEVANTAMENTO-ATUAL-3DX.md)

## Areas do codigo

```text
assets/
  css/                 Estilos do dashboard
  js/
    platform/          Runtime 3DX, WAFData, Compass, contexto
    integration/       APIs ENOVIA, Product Explorer, bridges
    services/          Carga BOM, atributos, fallback, snapshots
    processing/        Normalizacao, metricas, anomalias
    ui/                Tabela, filtros, graficos, preview
  vendor/              Bibliotecas estaticas vendorizadas
scripts/               Build e testes auxiliares
docs/                  Direcionamento tecnico e historico
```

## Build

O bundle atual e gerado pelos scripts em `scripts/`. Nesta fase, dependencias nao devem ser atualizadas sem aprovacao.

## Criterios iniciais de aceite

- Estrutura com 79 itens carrega completa ou reporta falha real, sem parcial silencioso.
- Estrutura com 20 itens carrega completa.
- Estrutura com 3 itens carrega completa.
- Estrutura com 1 item e 2 corpos representa corretamente corpos/representacoes.
- `getpicture` nao bloqueia E-BOM nem gera tempestade de erro.
- Clique em item da E-BOM prepara o pipeline para viewer 3D proprio.
