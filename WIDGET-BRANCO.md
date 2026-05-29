# Widget BOM Analytics em branco

## Causa (corrigida no GitHub)

No **Additional App**, o HTML roda no domínio **3DEXPERIENCE** (`*.3dexperience.3ds.com`), mas CSS/JS estavam em caminhos relativos `assets/` **só no GitHub** → página branca.

Correção: `<base href="https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/">` quando não está em `github.io`.

---

## O que fazer agora

1. Aguarde **1–2 min** após o push no GitHub (Pages).
2. No dashboard: **F5** ou feche e reabra o widget **BOM Analytics**.
3. Deve aparecer o cabeçalho azul **BOM Analytics Dashboard** e barra **Inicializando...**.

---

## Se continuar branco

### A) Conferir URL no app (Platform Management → Members → editar)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html
```

Sem espaço no final. Deve abrir o dashboard numa aba do navegador (logado na 3DX).

### B) F12 no widget

Clique no widget → **F12** → aba **Console** → erros 404 em `assets/` = cache antigo → **Ctrl+F5**.

### C) Preferências do widget no dashboard

Editar widget → URL do código-fonte = mesma URL acima.

### D) Testar URL UWA

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html
```

---

## Branco total (sem texto)

URL vazia no cadastro do widget → edite o **Additional App** e cole a URL completa.
