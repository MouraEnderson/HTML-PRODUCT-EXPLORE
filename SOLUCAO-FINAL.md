# O que funciona no seu tenant (sem adivinhação)

## Por que GitHub “não funciona”

No **3DDashboard**, muitos tenants **bloqueiam** `github.io` na rede ou no iframe.  
O widget tenta baixar **20+ arquivos** — se um falha, tudo quebra.

**BOM real (API ENOVIA + Explorer)** só funciona com HTML no **mesmo domínio do 3DSpace**, não no GitHub.

---

## Teste 1 — Abra no Chrome (fora do 3DX)

Cole no navegador (logado na rede da empresa):

```
https://cdn.jsdelivr.net/gh/MouraEnderson/HTML-PRODUCT-EXPLORE@main/widget-min.html
```

| Resultado | Significado |
|-----------|-------------|
| Página com texto **“BOM Analytics — widget UWA OK”** | Internet OK; problema é só política do dashboard |
| Não abre / timeout | Rede bloqueia CDN — só 3DSpace resolve |

---

## Teste 2 — Additional App (se Teste 1 abriu)

**Platform Management → Additional App → Create**

| Campo | Valor |
|-------|--------|
| Source code URL | `https://cdn.jsdelivr.net/gh/MouraEnderson/HTML-PRODUCT-EXPLORE@main/widget-uwa.html` |

Ou (GitHub direto):

`https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html`

Remova o widget antigo, adicione o novo, **Ctrl+F5**.

Barra deve mostrar **bundle-main** e depois **Carregando E-BOM…**

---

## Solução definitiva — 3DSpace (recomendado)

### URL no Web Page Reader ou Additional App

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

Se der erro de DNS no `space`, teste:

```
https://r1132100929518-us1-ifwe.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

### Pacote para o admin

Na sua máquina:

```powershell
cd C:\Users\Enderson\Projects\3dx-product-explorer-bom-dashboard
powershell -File scripts\sync-webapps.ps1
Compress-Archive -Path webapps\BomAnalytics\* -DestinationPath BomAnalytics-3DSpace.zip -Force
```

Envie **BomAnalytics-3DSpace.zip** ao admin ENOVIA.  
Destino no servidor: `webapps/BomAnalytics/` (mesmo nível do ENXScene).

---

## O que NÃO funciona

| Tentativa | Por quê |
|-----------|---------|
| Documento ENOVIA na pasta DEPLOY | Não é URL web |
| Web Page Reader só com GitHub | Sem API ENOVIA |
| URL com typo `mouraanderson` / `3dexerience` | DNS/404 |

---

## Physical ID do Drone (referência)

`132FB3CE26D70E006A18D1870000316D`

---

## Se ainda falhar

Envie **print** ou texto exato de:

1. Teste 1 no Chrome (abriu ou não?)
2. URL que colocou no widget
3. Texto da barra azul do BOM Analytics
