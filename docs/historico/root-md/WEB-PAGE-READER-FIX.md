# Web Page Reader mostra código HTML (corrigido)

## Causa

O link **jsDelivr** devolve o arquivo como:

`Content-Type: text/plain`

O widget **Web Page Reader** trata como **texto** e mostra o código-fonte (`<!DOCTYPE html>...`), **não** como site.

## NÃO use no Web Page Reader

```
https://cdn.jsdelivr.net/gh/MouraEnderson/HTML-PRODUCT-EXPLORE@main/index.html
```

(jsDelivr = text/plain para HTML)

## USE este link (GitHub Pages = text/html)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html?physicalid=132FB3CE26D70E006A18D1870000316D&displayName=01_SKA_Drone%20Assembly_130520206
```

## Se GitHub Pages der 404

1. https://github.com/MouraEnderson/HTML-PRODUCT-EXPLORE/settings/pages  
2. Source: branch **gh-pages** ou **main** → pasta **/ (root)**  
3. Save → aguarde 5 min  

## Alternativa (preview)

```
https://htmlpreview.github.io/?https://github.com/MouraEnderson/HTML-PRODUCT-EXPLORE/blob/main/index.html
```

## Solução definitiva

URL 3DSpace (admin): ver `DEPLOY-3DSPACE.md`
