# Validação automática Expand Item (DEC-015)

**Build release:** `bom20260614h`  
**Validado tenant:** `bom20260614g` — classificação **A** (2026-06-12)  
**PR:** #11 merged

---

## Widget piloto (URL fixa)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614h
```

Dashboard piloto: `#dashboard:e9bdf50c-6377-4956-b931-b5566a8e9e97/tabId:AMzDJUOA09wQHOdVtHHY`

---

## Como usar (sem Console manual)

1. Abra o dashboard piloto no 3DDashboard com Product Structure Explorer carregado.
2. No widget BOM Analytics, abra **Avançado**.
3. Clique **Validar Expand Item**.
4. Confirme classificação **A** no painel central.
5. Clique **Atualizar estrutura** — tabela e KPI = `rows.length`.
6. Opcional: **Copiar relatório técnico** para auditoria.

---

## Resultado tenant piloto (A)

| Métrica | Valor |
|---------|-------|
| Root | CJ MESA 4BCS VP TOP 3DX |
| POST expand | 200 |
| Path count | 19 |
| Linhas tabela | 25 |
| KPI Total Peças | 25 |
| Explorer ref (parcial) | 7 |

---

## Classificações

| Classe | Significado | Ação |
|--------|-------------|------|
| **A** | API OK — 200 + Path + rows | **Atualizar estrutura** liberado |
| **B** | Permissão/auth — 403 | Checklist admin SecurityContext/role |
| **C** | RootId — 404 | Revalidar id 32 hex |
| **D** | URL/método — 405 | POST somente em `*-space*` |
| **E** | Body/Content-Type — 400/415 | Ajustar schema dseng_v1 |
| **F** | Transporte/CORS — ResponseCode 0 | WAFData / Additional App |

---

## Critérios merge PR #11

- [x] Botão **Validar Expand Item** visível e funcional  
- [x] Relatório em tela + copiar JSON  
- [x] Classificação **A** no tenant real  
- [x] `Atualizar estrutura` → tabela = `rows.length`  
- [x] KPI Total Peças = `rows.length`  

---

## Playwright local (opcional)

```bash
node scripts/run-expand-item-validation-local.mjs
```

Sem sessão 3DEXPERIENCE autenticada, o script registra bloqueio de auth — **não** conta como falha do produto.
