# Fase 0 e Fase 1 — BOM Analytics (GitHub + Additional App)

## Fase 0 — Diagnóstico (você, ~10 min)

### 1. URL do Additional App

Use **esta URL** (nova — evita cache do texto antigo):

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-bom.html
```

| Campo | Valor |
|-------|--------|
| Tipo | **Widget** |
| Armazenamento | **Externo** |
| Objetos | `VPMReference, VPMRepReference, VPMPart` |

### 2. No 3DDashboard

1. Espere **3 min** após push no GitHub.
2. **Remova** o widget BOM da aba PRODUCTEXPLORE.
3. Arraste de novo **BOM Analytics**.
4. **Ctrl+F5** na aba.
5. No widget: **⋮ → Atualizar**.

### 3. Critério Fase 0 — PASSOU se ver:

- Linha verde: **`BOM Analytics — build bom20260529a (Fase 1 UWA)`**
- Botão verde **Varrer estrutura Explorer**
- Status azul (não painel branco, não só "widget UWA OK" antigo)

Se ainda aparecer só **"widget UWA OK"** → cache do dashboard. Peça ao admin **desativar cache de widget** (formação DS) ou troque só o nome do app no Compass.

### 4. F12 (uma vez)

Na página do **3DDashboard** (não no Chrome solto):

1. Clique dentro do painel BOM Analytics.
2. **F12** → aba **Console**.
3. Se houver linhas **vermelhas**, copie as 3 primeiras.

---

## Fase 1 — O que foi implementado

| Item | Detalhe |
|------|---------|
| Arquivo | `widget-bom.html` — XHTML 1.0 Strict, padrão DS |
| `widget` | **Só** no script inline do `<head>` |
| UI | Montada em `widget.body` + `window.__3DX_UI_ROOT__` |
| Bundle | Um arquivo: `bom-bundle.js` (sem `widget` no JS externo) |
| API | `require` WAFData + REST dseng após carregar bundle |

---

## Fase 2 — Teste Mont10 (após Fase 0 OK)

1. Abra **Mont10** no Product Structure Explorer (mesma aba).
2. Clique **Varrer estrutura Explorer**.
3. Resultado esperado na faixa de status:
   - **Varredura concluída: N itens — Mont10...**  
   - ou **Varredura falhou: …** (copie a mensagem)

4. KPIs, gráficos e tabela devem preencher.

---

## URLs

| Uso | URL |
|-----|-----|
| **Produção (Additional App)** | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-bom.html` |
| Teste Pages | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/teste-url.html` |
| Não usar | `widget-min.html`, `widget-uwa.html`, jsDelivr |

Referência técnica: `REFERENCIA-3DX-PLM.md`
