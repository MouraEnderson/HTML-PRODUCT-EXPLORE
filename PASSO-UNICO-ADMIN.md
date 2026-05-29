# Um único passo que desbloqueia tudo (você é admin)

O **Web Page Reader** com GitHub **não pode** chamar APIs ENOVIA (E-BOM real). Isso é limitação da Dassault, não do código.

**Solução:** registrar o mesmo HTML como **Additional App** (5 minutos, uma vez).

---

## Faça isto agora

1. **3DDashboard** → **Compass** → **Platform Management** (Gestão da plataforma).
2. **Additional Apps** → **Create**.
3. Preencha:
   - **Nome:** `BOM Analytics`
   - **Source code URL:**  
     `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html`
4. **Salvar** e liberar o app para seu usuário / grupo.
5. No dashboard **LISTA 3DX**:
   - **Remova** o widget **Web Page Reader** (GitHub).
   - Arraste **BOM Analytics** (Additional App) para a **mesma aba** do **Product Structure Explorer**.
   - Salve.

---

## Como saber que funcionou

Abra o widget **BOM Analytics** no dashboard:

| Status na barra inferior | Significado |
|--------------------------|-------------|
| Barra mostra **v20260528** e **Carregando E-BOM…** / **N itens carregados** | Correto — versão nova, API ativa |
| **Inicializando…** (sem v20260528) | Cache antigo — remova widget, Ctrl+F5, recrie |
| **Web Page Reader: sem API ENOVIA** | Ainda está no Reader — troque pelo Additional App |

Com Additional App, o Drone (`01_SKA_Drone Assembly`) deve carregar na árvore ao abrir ou ao clicar **Atualizar**, sem CSV, sem publicar no 3DSpace.

---

## URL alternativa (se o admin pedir template UWA)

`https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html`

---

## Se não achar “Additional Apps”

O menu **não aparece** na edição do dashboard. Procure o app **Platform Management** no **Compass** (pode chamar **Third Party Apps**).

Se **não existir de jeito nenhum** → leia **`SEM-ADDITIONAL-APP.md`** (Caminho C: publicar no 3DSpace).

Detalhes: `GUIA-ADMIN-ADDITIONAL-APP.md`
