# O que fazer agora (quando “nada funciona”)

## Verdade direta

No **Web Page Reader** com link **GitHub**, estas coisas **nunca** vão funcionar:

- Sincronizar com Product Explorer
- Buscar na plataforma
- BOM automática pela API
- Arrastar a árvore direto do Explorer para o HTML

Isso **não é bug seu** — é limite de segurança do navegador (outro domínio).

---

## Teste em 2 minutos (sem Explorer)

1. No widget, use **só** esta URL (sem jsDelivr):

   ```
   https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/importar.html
   ```

2. Clique **Testar com exemplo**.

3. Se aparecer tabela + árvore → o widget **funciona**. O problema era CDN ou formato do arquivo.

Se **importar.html** também ficar em branco → GitHub Pages não está ativo ou a empresa bloqueia `github.io`.

---

## URL do dashboard completo

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html
```

1. **Ctrl+F5**
2. Clique **Testar com exemplo CSV**
3. Deve mostrar KPIs e tabela

Se der erro “XLSX não carregou” → salve o Excel como **CSV** e arraste, ou use **importar.html**.

---

## Com estrutura real do Drone

1. Product Explorer → estrutura aberta
2. Exportar / Excel (ou copiar grid)
3. No Excel: **Salvar como → CSV (ponto e vírgula)**
4. Arrastar o **.csv** na zona de drop (ou em importar.html)

**Não use** URL `cdn.jsdelivr.net/.../index.html` — mostra código, não página.

---

## GitHub Pages desligado?

Repositório → **Settings** → **Pages** → Source: branch **main** ou **gh-pages** → Save.

Teste no Chrome (fora do 3DX): abrir a URL acima. Se 404, Pages não está publicado.

---

## Única forma de BOM automática

Admin publica `webapps/BomAnalytics` no **3DSpace** (ver `DEPLOY-3DSPACE.md`).

URL definitiva:

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

---

## Me diga qual caso é o seu

| O que você vê | Significado |
|---------------|-------------|
| Página em branco / só “Inicializando” | Scripts bloqueados → use **importar.html** |
| Código HTML na tela | URL errada (jsDelivr) |
| 404 no navegador | GitHub Pages off |
| Dashboard abre, import não faz nada | Excel sem coluna Nome → use **CSV** |
| Só 1 item ao “Carregar objeto” | Normal no GitHub (sem API) |
| importar.html + exemplo funciona | Próximo passo: CSV exportado do Explorer |
