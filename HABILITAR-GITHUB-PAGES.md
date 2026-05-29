# GitHub Pages retorna 404 — como corrigir (5 min)

O código está no GitHub, mas o **site** só funciona depois de ativar Pages no repositório.

## Passo 1 — Abrir configuração

1. Acesse: https://github.com/MouraEnderson/HTML-PRODUCT-EXPLORE  
2. **Settings** (Configurações)  
3. Menu esquerdo: **Pages**

## Passo 2 — Ativar origem

Em **Build and deployment** → **Source**, escolha **uma** opção:

### Opção A (recomendada após push do workflow novo)

- **Source:** `GitHub Actions`  
- Salve. O workflow **Deploy GitHub Pages** publica automaticamente a cada push em `main`.

### Opção B (manual)

- **Source:** `Deploy from a branch`  
- **Branch:** `gh-pages`  
- **Folder:** `/ (root)`  
- **Save**

Aguarde **2–10 minutos**. A página mostra a URL do site, algo como:

`https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/`

## Passo 3 — Testar

| Teste | URL |
|-------|-----|
| Diagnóstico | https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/teste-url.html |
| Widget | https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html |

Se ainda der 404, use a **URL alternativa** (não precisa de Pages):

```
https://cdn.jsdelivr.net/gh/MouraEnderson/HTML-PRODUCT-EXPLORE@main/widget-uwa.html
```

Coloque esta URL no **Additional App** até o GitHub Pages ficar verde.

## Erros de digitação (404 falso)

| Errado | Certo |
|--------|--------|
| moura**a**nderson | moura**e**nderson |
| HTML-Product-Explore | HTML-PRODUCT-EXPLORE |
| widget-**owa** | widget-**uwa** |

## Additional App

**URL do código-fonte** (jsDelivr se Pages 404):

```
https://cdn.jsdelivr.net/gh/MouraEnderson/HTML-PRODUCT-EXPLORE@main/widget-uwa.html
```

Tipo: **Widget** | Armazenamento: **Externo**
