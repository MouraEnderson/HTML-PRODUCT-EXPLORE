# Widget BOM Analytics em branco

## 1. Typo na URL (causa mais comum)

**Errado:** `mouraanderson.github.io`  
**Certo:** `mouraenderson.github.io`

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html
```

Use **`widget-uwa.html`** no Additional App (template UWA exigido pela Dassault), não só `index.html`.

---

## 2. Teste em 2 passos

### Passo A — widget mínimo

No Additional App, URL temporária:

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-min.html
```

Salvar → F5 no dashboard.

| Resultado | Significado |
|-----------|-------------|
| Texto **"widget UWA OK"** | UWA funciona → vá para Passo B |
| Branco | URL errada, GitHub bloqueado, ou 3DDashboard não alcança github.io (TI) |

### Passo B — dashboard completo

URL definitiva:

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html
```

Deve carregar o dashboard dentro do iframe.

---

## 3. Formulário (editar aplicativo adicional)

| Campo | Valor |
|--------|--------|
| Tipo | Widget |
| Armazenamento | Externo |
| URL do código-fonte | `.../widget-uwa.html` |
| URL configuração | vazio |

---

## 4. index.html direto no Widget

O `index.html` não segue o template UWA (body vazio + `widget.onLoad`). Pode ficar branco no Additional App. Use **`widget-uwa.html`**.

---

## 5. Ainda branco

- Abra a URL numa aba: deve carregar (não 404).
- F12 → Console no widget.
- Peça à TI: servidor **3DDashboard** precisa acessar **github.io** (cloud DS).
