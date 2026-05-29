# Não existe “Additional App” no menu — o que fazer

Na documentação Dassault o nome oficial é **Additional App**, mas na tela pode aparecer como:

| Nome na UI (varia por tenant/idioma) |
|-------------------------------------|
| **Third Party App** |
| **Apps de terceiros** |
| **Create Additional App** |
| **Gestão de aplicativos** / **Application Management** |

Fonte: [Widget Dashboard Integration (CAA)](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm)

---

## Onde NÃO procurar

| Lugar | Por quê |
|-------|---------|
| Editar dashboard → adicionar widget | Só mostra apps **já registrados** (Web Page Reader, Run Your App, Explorer…) |
| 3DDrive / Bookmark DEPLOY | Guarda arquivo; **não** cria app confiável |
| Compass só como usuário comum | Sem papel **Platform Manager** não aparece criação de app |

---

## Onde procurar (admin)

Você já abriu **3DDashboard Platform Management** (correto).

### Aba errada (seu print)

Na aba **Content** / **Conteúdo** aparecem:

- Collaborative Spaces Configuration Center  
- Gerenciamento de atributos (`Structure_Opening`, `DELSBOMAggregatedComponentReference`, …)

Isso é **modelo de dados ENOVIA**, **não** é cadastro de widget.

### Aba certa

1. No topo do Platform Management, clique na aba **Members** / **Membros** (não Content).
2. **Role a página até o final** da aba Members.
3. Procure o botão **Create Additional App** / **Criar app adicional**.

4. Preencha:

| Campo | Valor |
|-------|--------|
| Short name | `BOM Analytics` |
| Long name (opcional) | `BOM Analytics Dashboard` |
| Compass Quadrant | Leste (ou o que preferir) |
| Source code URL | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html` |

5. **Save** → o app aparece no **Compass** para arrastar ao dashboard LISTA 3DX.

Referência: [Technia – 3DDashboard embedding](https://products.technia.com/app/docs/tvc-helium-documentation-2021.5.0/helium/admin/embedding/embedding3DDashboard.html) (Members → Create Additional App).

### Tipo **Rede** virou app, não widget

| Tipo no formulário | Comportamento |
|--------------------|---------------|
| **Rede** | **App** no Compass — abre em janela; **não** fixa na aba do dashboard |
| **Widget** + **Externo** | **Widget** — seta no canto; arrasta para LISTA 3DX ao lado do Explorer |

Recrie com a tela **Widget** / **URL do código-fonte** / **Armazenamento: Externo** (não use Rede para o LISTA 3DX).

### Se Members não tiver o botão

- Teste a aba **Dashboards**.
- Confirme papel **Platform Manager** (não só “admin de collab space”).

Se **não existir nenhum** desses apps no Compass, seu login **não é Platform Manager** nesta instância — peça o papel à TI ou à Dassault/parceiro.

---

## O que existe para qualquer usuário (e o que cada um faz)

| Widget no dashboard | E-BOM real (API 3DSpace) | Quem configura |
|---------------------|--------------------------|----------------|
| **Web Page Reader** | **Não** | Você (URL GitHub) |
| **Run Your App** | **Não** (domínio *untrusted*) | Você (URL do widget) |
| **Additional App** | **Sim** (domínio *trusted*) | Só Platform Manager |
| **HTML no 3DSpace** + Web Page Reader | **Sim** | Admin servidor ENOVIA |

**Run Your App** parece “app customizado”, mas pela DS **não acessa** 3DSpace/WAFData — não substitui Additional App.

---

## Se realmente não tiver Additional App no tenant

Único caminho industrial **sem** Platform Manager criando app:

### Caminho C — Publicar no 3DSpace (webapp)

1. Admin ENOVIA publica `webapps/BomAnalytics/` no servidor **3DSpace**.
2. No **Web Page Reader**, URL:

   ```
   https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
   ```

3. Mesma aba: Product Explorer + Web Page Reader.

Detalhes: **`DEPLOY-3DSPACE.md`**

**Nota:** na sua rede o host `*-space.*` já deu **DNS** — alguém com acesso ao servidor ou VPN corporativa precisa validar essa URL.

---

## Enquanto isso (só Web Page Reader + GitHub)

O código no GitHub funciona em modo limitado:

- Physical ID manual + **Carregar Drone**
- Demo / import (não substitui Explorer)

**Não** é possível forçar API ENOVIA só mudando HTML no GitHub.

---

## Perguntas para TI (copiar e colar)

1. Meu usuário tem papel **Platform Manager** na instância `R1132100929518`?
2. O tenant cloud permite **Additional Apps / Third Party Apps**?
3. Quem pode publicar em `3DSpace` → `/enovia/webapps/BomAnalytics/`?
4. A URL `https://r1132100929518-us1-space.3dexperience.3ds.com/...` resolve na rede corporativa?

---

## Resumo

| Situação | Ação |
|----------|------|
| Acha só Web Page Reader / Run Your App | Normal para usuário sem Platform Manager |
| É admin mas não acha menu | Pedir **Platform Manager** + abrir **Platform Management** no Compass |
| Tenant não oferece Additional App | **Deploy 3DSpace** (`DEPLOY-3DSPACE.md`) |
| DNS space não resolve | TI publica webapp **e** corrige rede/DNS |
