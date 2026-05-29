# Continuação — Documento na pasta DEPLOY (Bookmark Editor)

Você já fez:

- Pasta: **Enderson Testes → EXPLORE → DEPLOY**
- Objeto: **3dx-product-explorer-bom-dashboard** (Documento, Rev. A, In Work)
- Arquivo: **.7z** com o dashboard

Isso guarda o projeto **dentro do ENOVIA**. Ainda falta um passo para o **Web Page Reader** abrir o HTML como site.

---

## Importante: Documento ENOVIA ≠ site webapp

| O que você fez | O que o widget precisa |
|----------------|------------------------|
| Documento na pasta DEPLOY | URL **HTTP** que abre `index.html` no navegador |
| Arquivo .7z anexado | Página servida pelo **3DSpace** (como ENXScene) |

O Web Page Reader não executa um .7z nem abre Documento como página web direto.

---

## Não funciona colocar só "index" como Documento

Ver explicação: [POR-QUE-NAO-FUNCIONA.md](POR-QUE-NAO-FUNCIONA.md)

Os itens `index` e `3dx product-explorer bom dashboard` na pasta DEPLOY **não substituem** a URL do webapp.

---

## Próximos passos (escolha um)

### Opção 1 — Admin publica no 3DSpace (recomendado)

1. **Baixe** o documento que você carregou (ícone download no Bookmark Editor).
2. **Extraia** o .7z no PC — deve aparecer `index.html` + pasta `assets/`.
3. Envie ao admin o ZIP da pasta `webapps/BomAnalytics` (ou os arquivos extraídos).
4. Admin instala em:  
   `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html`
5. No widget, troque GitHub por essa URL.

### Opção 2 — Você testa se o tenant expõe o arquivo

1. Abra o documento **3dx-product-explorer-bom-dashboard** no Bookmark Editor.
2. Veja se existe **Abrir / Download / Copiar link** que gere URL `https://...3dexperience...`.
3. Se o link for só download do .7z → ainda precisa Opção 1.
4. Se existir visualizador HTML com URL estável → teste no Web Page Reader (raro para .7z).

### Opção 3 — 3DDrive (se sua empresa usar)

1. Extraia o .7z localmente.
2. Suba **index.html** e pasta **assets** no **3DDrive** (não como .7z).
3. Gere link de compartilhamento / embed.
4. Teste no Web Page Reader — **pode** ainda ter limite cross-origin; 3DSpace é melhor.

---

## Conteúdo correto do .7z

Dentro do arquivo deve estar (igual ao GitHub):

```
index.html
assets/
  css/dashboard.css
  js/...
```

Se você zipou a pasta inteira do projeto com `.git`, remova e gere de novo só com:

`webapps/BomAnalytics/` do repositório.

Comando:

```powershell
cd C:\Users\Enderson\Projects\3dx-product-explorer-bom-dashboard
Compress-Archive -Path webapps\BomAnalytics\* -DestinationPath BomAnalytics-deploy.7z -Force
```

Carregue de novo no DEPLOY se quiser versão limpa.

---

## Depois que tiver URL 3DSpace

1. **PRODUCTEXPLORE** → editar Web Page Reader  
2. URL: `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html`  
3. Mesma aba: Product Explorer + Web Page Reader  
4. Carregar Drone no Explorer → **Atualizar** no HTML  

---

## Mensagem curta para o admin (com seu documento DEPLOY)

```
Subi o pacote BOM Analytics no ENOVIA (pasta DEPLOY, documento 3dx-product-explorer-bom-dashboard).
Preciso que o conteúdo (index.html + assets) seja publicado como webapp em:

/enovia/webapps/BomAnalytics/

URL final para o 3DDashboard:
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html

Posso enviar o .7z ou arquivos extraídos.
```
