# Guia para você (admin da plataforma) — sem publicar no 3DSpace

**Resumo em 1 página:** leia primeiro `PASSO-UNICO-ADMIN.md`.

Você disse que só usa **Web Page Reader** hoje. Como **administrador da instância**, você pode registrar o **mesmo HTML** como **Additional App** — isso é o recurso certo para ler **E-BOM e APIs ENOVIA**, sem mexer no servidor 3DSpace.

Documentação DS (PLM Coach / CAA): [Widget Dashboard Integration](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm)

| Recurso | Acessa 3DSpace / WAFData? | Quem cria |
|---------|---------------------------|-----------|
| **Web Page Reader** | **Não** | Qualquer usuário no dashboard |
| **Additional App** | **Sim** (widget confiável) | **Só admin da plataforma** |
| Publicar em `/webapps/` | **Sim** | Admin de servidor (você não quer) |

---

## O que vai mudar para o usuário

- Continua o dashboard **LISTA 3DX**.
- Em vez do widget **Web Page Reader** (GitHub), usa o app **BOM Analytics** no Compass (Additional App).
- Mesmo código no GitHub — **não precisa** publicar pasta no 3DSpace.

---

## Passo a passo (admin)

### 1. Abrir gestão da plataforma

1. Entre no **3DEXPERIENCE** (3DDashboard).
2. Abra o **Compass** (menu de apps).
3. Procure **Platform Management** / **Gestão da plataforma** / **Administração da instância**  
   (nome pode variar: ícone de engrenagem, “Platform Manager”, “Instance Management”).

### 2. Criar Additional App

1. Seção **Additional Apps** / **Apps adicionais** / **Third Party Apps**.
2. **Create** / **Criar**.
3. Preencha:

| Campo | Valor |
|-------|--------|
| **Short name** | `BOM Analytics` |
| **Source code URL** | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html` |
| **Configuration file URL** | (deixe vazio) |

URL alternativa (template UWA): `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html`

4. Salve.

**Importante:** a URL deve abrir o dashboard no navegador (não código-fonte). Teste em aba anônima logada na 3DX se necessário.

### 3. Liberar o app no Compass

1. Na mesma tela de Additional App, conceda acesso:
   - **Todos os usuários** da instância, ou
   - O **papel / grupo** que usa o dashboard LISTA 3DX.
2. Escolha o **quadrante** do Compass (ex.: Leste) onde o app aparece.

### 4. Montar o dashboard LISTA 3DX

1. Abra ou edite o dashboard **LISTA 3DX**.
2. **Remova** ou deixe de lado o widget **Web Page Reader** (GitHub).
3. No Compass, arraste **BOM Analytics** (Additional App) para a aba **PRODUCTEXPLORE** (ou mesma aba do Explorer).
4. **Mesma aba:** deixe **Product Structure Explorer** + **BOM Analytics** lado a lado.
5. Salve o dashboard.

### 5. Testar

1. Aba **EXPLORE** → abra o Drone (`01_SKA_Drone Assembly`).
2. No widget **BOM Analytics** → **Atualizar** ou **Sincronizar com Explorer**.
3. Deve carregar **vários itens** na árvore e KPIs (via API `dseng`).

Se a barra de status mostrar **“Modo: Additional App / APIs ativas”**, o caminho está certo.

---

## Se não achar “Additional Apps”

- Confirme que seu usuário é **Platform Manager** / **Administrator** da instância `R1132100929518`.
- Em cloud, às vezes o menu fica em: **https://{ifwe-host}/** → avatar → **Platform Management**.
- Peça à Dassault / parceiro o papel **Platform Manager** se só tiver “Dashboard Creator”.

---

## Se o app criar mas BOM não carregar

1. **F12 → Console** no widget e envie erros.
2. Confirme que usou **Additional App**, não Web Page Reader.
3. Confirme **GitHub Pages** ativo (Settings → Pages → branch `main`).
4. Teste URL com Drone:  
   `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html?physicalid=132FB3CE26D70E006A18D1870000316D`

---

## Se você **tiver** que manter só Web Page Reader

Limite técnico (documentado pela DS): sem APIs ENOVIA.

Fluxo máximo possível:

1. URL GitHub no Web Page Reader.
2. Mesma aba: Explorer + Reader.
3. **Physical ID** manual ou arrastar produto → **Importar** (preview).
4. Para BOM real: alguém com acesso ao **servidor** publica `webapps/BomAnalytics` **ou** você cria **Additional App** (acima).

---

## Resumo

- Você **não precisa** saber deploy em 3DSpace para o objetivo principal.
- Você **precisa** criar **Additional App** uma vez (5–10 min como admin).
- **Web Page Reader** não substitui Additional App para integração PLM.
