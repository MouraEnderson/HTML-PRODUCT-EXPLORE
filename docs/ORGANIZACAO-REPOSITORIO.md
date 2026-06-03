# Organizacao do Repositorio

Data: 2026-06-03

## Objetivo

Reduzir ruido, peso e duplicidade do repositorio sem quebrar o fluxo atual do Additional App.

Esta organizacao deve acontecer em ondas pequenas. A primeira onda deve preservar os arquivos que o loader atual usa em producao.

## Fluxo ativo identificado

O fluxo atual mais provavel do GitHub Pages e:

```text
widget-boot.html
  -> widget-v3.html
    -> assets/js/build-id.js
    -> assets/js/bom-bundle-bom20260606f.js
    -> assets/vendor/chart.umd.min.js
    -> assets/css/dashboard.css
```

Enquanto esse fluxo estiver ativo, estes arquivos devem ser preservados.

## Arquivos ativos

Entradas e runtime:

- `widget-boot.html`
- `widget-v3.html`
- `assets/js/build-id.js`
- `assets/js/bom-bundle.js`
- `assets/js/bom-bundle-bom20260606f.js`
- `assets/css/dashboard.css`
- `assets/vendor/chart.umd.min.js`

Fonte modular:

- `assets/js/config.js`
- `assets/js/platform/`
- `assets/js/integration/`
- `assets/js/services/`
- `assets/js/processing/`
- `assets/js/ui/`
- `assets/js/app.js`

Build e testes:

- `scripts/build-bundle-node.js`
- `scripts/build-bundle.ps1`
- scripts de teste que ainda forem usados como regressao.

## Candidatos a legado

HTMLs antigos ou experimentais:

- `widget-v2.html`
- `widget-uwa.html`
- `widget-owa.html`
- `widget-min.html`
- `widget-bom.html`
- `ABRA-ESTE-LINK.html`
- `teste-link.html`
- `teste-url.html`
- `collect.html`
- `importar.html`

Deploy/admin que saiu do escopo:

- `webapps/BomAnalytics/`
- `scripts/sync-webapps.ps1`
- `scripts/criar-zip-3dspace.ps1`
- documentos de deploy 3DSpace/admin devem ir para historico, nao para caminho principal.

Bundles historicos:

- Existem 79 bundles em `assets/js/bom-bundle*.js`.
- Manter inicialmente apenas `bom-bundle.js` e `bom-bundle-bom20260606f.js`.
- Os 77 bundles antigos somam aproximadamente 26,7 MB.

## Estrutura alvo sugerida

```text
/
  README.md
  index.html
  widget-boot.html
  widget-v3.html
  .nojekyll
  assets/
    css/
    js/
      platform/
      integration/
      services/
      processing/
      ui/
    vendor/
  scripts/
  data/
  fixtures/
  docs/
    levantamento/
    arquitetura/
    decisoes/
    operacao/
    historico/
```

## Ondas de organizacao

### Onda 1 - Documentar e preservar

- Criar `docs/`.
- Registrar plano tecnico e mapa de arquivos.
- Nao mover entradas do app.
- Nao apagar bundles ainda sem aprovacao.

Status: concluida em 2026-06-03.

### Onda 2 - Reduzir peso obvio

- Remover bundles antigos, preservando o build atual.
- Atualizar documentacao para apontar somente para `widget-boot.html`.
- Manter `widget-v3.html` como entrada real.

Status: concluida em 2026-06-03.

Resultado:

- Removidos 77 bundles historicos de `assets/js`.
- Preservados `assets/js/bom-bundle.js` e `assets/js/bom-bundle-bom20260606f.js`.
- Reducao aproximada: 26,7 MB.
- Loaders legados que apontavam para builds antigos foram alinhados para `bom20260606f`.

### Onda 3 - Arquivar legado

- Mover HTMLs antigos para `docs/historico/html/` ou remover apos aprovacao.
- Mover docs antigas para `docs/historico/`.
- Remover ou arquivar `webapps/BomAnalytics/` apos confirmacao final.

Status: concluida em 2026-06-03.

Resultado:

- Documentos historicos da raiz movidos para `docs/historico/root-md/`.
- Arquivos TXT historicos da raiz movidos para `docs/historico/root-txt/`.
- HTMLs experimentais/legados movidos para `docs/historico/html/`.
- Removido `webapps/BomAnalytics/`, pois deploy admin/webapps saiu do escopo.
- Removido diretorio `webapps/` vazio.
- Removidos scripts especificos de webapps/admin: `scripts/sync-webapps.ps1` e `scripts/criar-zip-3dspace.ps1`.
- Mantidos na raiz `index.html`, `widget-boot.html`, `widget-v3.html` e `widget-v2.html` como compatibilidade.

### Onda 4 - Normalizar build

- Revisar scripts de build/deploy.
- Garantir que o build gere somente os artefatos necessarios.
- Definir regra clara para cache/versionamento de bundle.

## Regras para nao quebrar

- Nao atualizar dependencias nesta fase.
- Nao alterar logica de API nesta fase.
- Nao remover `bom-bundle-bom20260606f.js` enquanto `build-id.js` apontar para ele.
- Nao remover `widget-boot.html` nem `widget-v3.html`.
- Nao apagar documentacao historica sem revisao.
