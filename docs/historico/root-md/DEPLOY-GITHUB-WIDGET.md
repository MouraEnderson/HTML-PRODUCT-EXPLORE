# Publicar no GitHub e usar no widget 3DEXPERIENCE

## 1. Criar repositório no GitHub

1. GitHub → **New repository** → nome sugerido: `3dx-product-explorer-bom-dashboard`
2. Repositório: **https://github.com/MouraEnderson/HTML-PRODUCT-EXPLORE**

Público ou privado (o widget precisa conseguir abrir a URL HTTPS)

## 2. Enviar o código

```powershell
cd C:\Users\Enderson\Projects\3dx-product-explorer-bom-dashboard
git init
git add .
git commit -m "Dashboard BOM + busca Physical Product para widget 3DDashboard"
git branch -M main
git remote add origin https://github.com/MouraEnderson/HTML-PRODUCT-EXPLORE.git
git push -u origin main
```

## 3. Ativar GitHub Pages (evitar erro 404)

O 404 significa que o Pages **ainda não está publicado**. Faça **uma** das opções:

### Opção A — GitHub Actions (recomendado)

1. Repositório → **Settings** → **Pages**
2. **Build and deployment** → **Source:** `GitHub Actions`
3. Aba **Actions** → workflow **Deploy GitHub Pages** → aguarde ficar verde
4. Volte em **Settings → Pages** e confira a URL exibida

### Opção B — Branch main

1. **Settings** → **Pages**
2. **Source:** Deploy from branch → **main** → **/ (root)** → Save
3. Aguarde 2–5 minutos

### URL correta do widget

`https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html`

**Não use:** link com `.git` no final.

Se ainda der 404: repo precisa ser **público** (ou Pages habilitado em repo privado com plano que inclua Pages).

## 4. Configurar widget no 3DDashboard

1. Abra o **3DDashboard** (logado na plataforma)
2. Adicione widget de conteúdo externo (ex.: *Custom Widget*, *Web Page*, *URL*)
3. Cole a URL do GitHub Pages (passo 3)
4. Salve o dashboard

**Importante:** não coloque usuário/senha no HTML. O login é da sessão 3DEXPERIENCE; o widget usa `WAFData` automaticamente.

## 5. Como usar no dia a dia

1. Abra o dashboard com o widget carregado
2. No topo: **Buscar Physical Product na 3DEXPERIENCE**
3. Digite parte do nome (ex.: `Drone`, `SKA`)
4. Clique no resultado → carrega E-BOM, KPIs, gráficos e tabela com **colunas do Product Explorer**
5. Opcional: seleção no Product Explorer do mesmo dashboard também atualiza o HTML (via eventos da plataforma)

## 6. Domínio confiável (se o widget não carregar)

Na administração 3DEXPERIENCE, inclua `*.github.io` (ou seu proxy corporativo) em domínios permitidos para widgets externos.

## 7. Teste local antes do GitHub

```powershell
Set-Location C:\Users\Enderson\Projects\3dx-product-explorer-bom-dashboard
python -m http.server 8765
```

Abra: `http://localhost:8765/index.html?demo=true` (busca e BOM simulados).

## 8. Ajuste fino do tenant

Se a busca retornar vazio no ambiente real, abra **F12 → Network**, copie a URL de uma busca do Product Explorer e envie para ajuste em `search-api.js`.

Security context padrão do seu tenant já está em `config.js` (`CS_IMPLANTACAO`).
