# Deploy via 3DDrive (pasta Deploy)

Você subiu o projeto no **3DDrive → Meus Arquivos → Deploy**. Estrutura correta:

```
Deploy/
  index.html
  assets/
  webapps/
```

## NÃO use link do tipo 3DDrive / Compass (não funciona no Web Page Reader)

O link que a plataforma gera costuma ser assim:

```
https://...ifwe.3dexperience.3ds.com/#app:X3DDRIV_AP/content:driveId=...&contentId=...
```

Isso abre o **aplicativo 3DDrive** (navegação interna). O **Web Page Reader não aceita** esse formato — ele precisa de URL **direta para uma página web**.

| Tipo de link | Web Page Reader |
|--------------|-----------------|
| `#app:X3DDRIV_AP/content:...` | Não aceita / não carrega |
| `github.io/.../index.html` | Aceita (sem API ENOVIA) |
| `.../enovia/webapps/BomAnalytics/index.html` | Aceita (ideal) |

---

## Passo 1 — Obter link do index.html (se existir link “direto”)

1. No **3DDRIVE**, abra a pasta **Deploy**.
2. Clique com o botão direito em **index.html** (ou menu ⋮).
3. Procure: **Compartilhar**, **Copiar link**, **Abrir em nova guia**, **Obter URL**.
4. Copie o link completo (`https://...3dexperience...`).

**Teste:** se a URL contém `#app:X3DDRIV_AP` → **não use** no Web Page Reader.

## Passo 2 — Testar no navegador (logado)

1. Cole o link em uma **nova aba** (com você logado no 3DEXPERIENCE).
2. **Deve aparecer o dashboard** (título BOM Analytics, campos, botões).
3. Se **baixar** o arquivo ou mostrar só texto → o link **não serve** no Web Page Reader.
4. Se a página abrir **sem CSS** → o link não inclui a pasta `assets/` no mesmo caminho; use link da pasta Deploy, não só do arquivo isolado.

## Passo 3 — Widget Web Page Reader

1. Aba **PRODUCTEXPLORE** → editar **Web Page Reader**.
2. **URL da Web:** cole o link do **index.html** do 3DDrive (não GitHub).
3. Salvar → **Ctrl+F5** no dashboard.

## Passo 4 — Usar com Product Explorer

1. Mesma aba: **Product Explorer** + **Web Page Reader** (URL 3DDrive).
2. Carregue o produto no Explorer.
3. No HTML: **Sincronizar** ou cole **Physical ID** → **Carregar objeto** → **Atualizar**.

Se a URL for do domínio `*.3dexperience.3ds.com`, as APIs **podem** funcionar melhor que GitHub.

---

## Limpeza (opcional)

Pode apagar do 3DDrive (não precisa no widget):

- pasta `.git`
- `README.md`, `DEPLOY-*.md` (documentação)
- pasta `github` se for cópia extra

**Mantenha:** `index.html`, `assets/`, opcional `webapps/`.

---

## Se não abrir como página

3DDrive às vezes só permite **download**, não hospedar site. Nesse caso:

- Continue 3DDrive como **backup** para o admin
- Admin publica em **webapps/BomAnalytics** no 3DSpace (`DEPLOY-3DSPACE.md`)

---

## Link alternativo (se 3DDrive falhar)

```
https://cdn.jsdelivr.net/gh/MouraEnderson/HTML-PRODUCT-EXPLORE@main/index.html
```
