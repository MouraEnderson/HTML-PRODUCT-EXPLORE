# Passo A e B — corrigido

## Passo A (Chrome) — use ESTE link

**Não use jsDelivr** — no Chrome aparece código XML (comportamento normal do CDN).

Abra:

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/teste-link.html
```

Deve aparecer uma **página verde** com o texto **"BOM Analytics — link OK"**.

Alternativa UWA:

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-min.html
```

Deve aparecer **"BOM Analytics — widget UWA OK"** (não XML cru).

---

## Passo B (3DDashboard) — use SÓ GitHub Pages

**Additional App → Source code URL:**

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html
```

| URL | Resultado |
|-----|-----------|
| `cdn.jsdelivr.net/gh/...` | **404** no 3DDashboard (servidor DS não acha a página) |
| `mouraenderson.github.io/...` | Correto para widget externo |

Depois: remover widget antigo → adicionar de novo → **Ctrl+F5**.

Barra deve mostrar **ghpages** e depois **Carregando E-BOM…**.

Se ainda der **404** com github.io → o servidor **3DDashboard da empresa não alcança GitHub**. Aí só **Passo C (3DSpace)**.

---

## Passo C — 3DSpace (definitivo)

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

Admin instala `BomAnalytics-3DSpace.zip` (ver `DEPLOY-3DSPACE.md`).

```powershell
cd C:\Users\Enderson\Projects\3dx-product-explorer-bom-dashboard
powershell -File scripts\sync-webapps.ps1
Compress-Archive -Path webapps\BomAnalytics\* -DestinationPath BomAnalytics-3DSpace.zip -Force
```
