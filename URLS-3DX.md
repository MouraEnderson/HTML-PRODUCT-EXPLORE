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

No **3DDashboard** só aparece `widget.body` — a UI tem de ser montada lá (não no `body` da página).

Se o Chrome mostra o widget mas o Additional App fica **branco**: remova o widget, adicione de novo, Ctrl+F5, URL **github.io** acima.

## Se github.io ainda der 404

Settings → Pages → confirme URL publicada na tela (verde). Aguarde 10 min após Save.

Build: Actions → **Deploy GitHub Pages** → último run verde.
