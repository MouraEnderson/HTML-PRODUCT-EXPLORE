# Por que não funcionou (Bookmark DEPLOY + Web Page Reader)

## O que você fez

Na pasta **DEPLOY** existem documentos ENOVIA:

- `3dx product-explorer bom dashboard`
- `index`

Tipo: **Documento** (arquivo no cofre ENOVIA).

## O que o Web Page Reader espera

Uma **URL de site** que o navegador abre e mostra HTML, por exemplo:

```
https://...../enovia/webapps/BomAnalytics/index.html
```

## Por que não combina

| Documento ENOVIA (Bookmark) | Web Page Reader |
|---------------------------|-----------------|
| Arquivo guardado no PLM | Pede endereço web (http/https) |
| Abre no Editor / download | Precisa renderizar página no iframe |
| Objeto com revisão, maturidade | Não expõe `index.html` como site |

Colocar `index` na pasta DEPLOY **não gera** link utilizável no widget — por isso **não deu certo**, mesmo com tudo na mesma aba.

## O que funciona hoje (sem admin)

### 1. GitHub ou jsDelivr no widget

URL:

```
https://cdn.jsdelivr.net/gh/MouraEnderson/HTML-PRODUCT-EXPLORE@main/index.html
```

Limitação: sem BOM automática; use **Physical ID** manual.

### 2. Fluxo manual (Drone)

1. Explorer: carregar `01_SKA_Drone Assembly`
2. Copiar **Physical ID**: `132FB3CE26D70E006A18D1870000316D`
3. Widget HTML → colar ID → **Carregar objeto** → **Atualizar**

## O que resolve de verdade (com admin)

Publicar pasta `webapps/BomAnalytics` no servidor **3DSpace** — ver `DEPLOY-3DSPACE.md`.

## Teste rápido (você pode fazer)

1. Abra o documento **index** no Bookmark Editor.
2. Menu **Propriedades** / **Informações** → copie **ID físico** ou **URL**.
3. Cole essa URL no navegador (logado).

Se baixar arquivo ou abrir tela ENOVIA → **não serve** para Web Page Reader.  
Se abrir página HTML cheia → envie a URL para analisarmos.
