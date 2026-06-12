# Validação automática Expand Item (DEC-015)

**Build release:** `bom20260614i`  
**Validado tenant:** `bom20260614g` / `14h` — classificação **A**  
**PR:** #11 merged

---

## Widget piloto (URL fixa)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614i
```

Dashboard piloto: `#dashboard:e9bdf50c-6377-4956-b931-b5566a8e9e97/tabId:AMzDJUOA09wQHOdVtHHY`

---

## Como usar (sem Console manual)

1. Abra o dashboard piloto no 3DDashboard com Product Structure Explorer carregado.
2. Clique **Atualizar estrutura** (único botão principal).
3. O widget valida automaticamente (CSRF → root → POST expand) e, se **A**, carrega tabela/KPI/gráficos com o **mesmo payload** (sem segundo POST).
4. Opcional (Avançado): **Diagnóstico técnico Expand Item** + **Copiar relatório técnico**.

---

## Resultado tenant piloto (A)

| Métrica | Valor |
|---------|-------|
| Root | CJ MESA 4BCS VP TOP 3DX |
| POST expand | 200 |
| Path count | 19 |
| Linhas tabela | 24 (após fix contagem `14i`) |
| KPI Total Peças | = `rows.length` |
| Referência visual Explorer (parcial) | 5–7 |

---

## Classificações

| Classe | Significado | Ação |
|--------|-------------|------|
| **A** | API OK — 200 + Path + rows | EBOM carregada automaticamente |
| **B** | Permissão/auth — 403 | Checklist admin SecurityContext/role |
| **C** | RootId — 404 | Revalidar id 32 hex |
| **D** | URL/método — 405 | POST somente em `*-space*` |
| **E** | Body/Content-Type — 400/415 | Ajustar schema dseng_v1 |
| **F** | Transporte/CORS — ResponseCode 0 | WAFData / Additional App |

---

## Contagem unificada (`14i`)

- `Total Peças` = `rows.length` = linhas na tabela
- `visualRowsCount` = `includesRoot` + paths normalizados
- Relatório técnico: `validationRows`, `importRows`, `tableRows`, `kpiTotalPecas`
- Nota UX: EBOM API pode ter mais linhas que Explorer colapsado

---

## Playwright local (opcional)

```bash
node scripts/run-expand-item-validation-local.mjs
```

Sem sessão 3DEXPERIENCE autenticada, o script registra bloqueio de auth — **não** conta como falha do produto.
