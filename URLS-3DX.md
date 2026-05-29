# URLs corretas — BOM Analytics

## Additional App (3DDashboard) — use esta

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html
```

Tipo: **Widget** | Armazenamento: **Externo**

## Teste no Chrome (página renderizada, não código)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/teste-url.html
```

Depois:

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html
```

Deve ver botão verde **Varrer**, não lista de código XML/HTML.

## Não usar para abrir no Chrome

| URL | Por quê |
|-----|---------|
| `cdn.jsdelivr.net/gh/.../widget-uwa.html` | Chrome mostra **só o código-fonte** |
| `raw.githubusercontent.com/...` | Mesmo problema |
| `github.com/.../blob/...` | Página do GitHub, não o widget |

No **3DDashboard** o iframe pode tolerar CDN, mas o padrão DS e MIME correto é **github.io**.

## Se github.io ainda der 404

Settings → Pages → confirme URL publicada na tela (verde). Aguarde 10 min após Save.

Build: Actions → **Deploy GitHub Pages** → último run verde.
