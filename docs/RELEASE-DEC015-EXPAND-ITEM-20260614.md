# Release DEC-015 — Expand Item Provider

**Data:** 2026-06-14  
**Build:** `bom20260614h`  
**Validado tenant:** `bom20260614g` (classificação **A**, 2026-06-12)  
**PR:** [#11](https://github.com/MouraEnderson/HTML-PRODUCT-EXPLORE/pull/11) — merged

---

## Widget URL (dashboard piloto)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614h
```

Atualize o Web Page Reader do dashboard piloto para esta URL (ou mantenha `14g` — funcionalmente equivalente; `14h` corrige apenas flag de relatório `forbiddenHeadersPresent`).

---

## O que entrou

- Expand Item (`dseng:EngItem/{id}/expand`) como fonte principal (`DATA_SOURCE=expand-item`)
- Validação automática no widget (`ExpandItemValidator`) — sem Console manual
- Gate **Atualizar estrutura** até classificação **A**
- Transporte: `GET /CSRF` + `ENO_CSRF_TOKEN` + POST host `*-space*` only
- Normalização por `Path` → KPI/tabela = `rows.length`

---

## Evidência tenant

Produto: **CJ MESA 4BCS VP TOP 3DX**

| Check | Resultado |
|-------|-----------|
| Validação | **A** |
| POST expand | 200 |
| Path count | 19 |
| Tabela | 25 linhas |
| KPI Total Peças | 25 |

---

## Fluxo operacional

1. Abrir widget no 3DDashboard  
2. **Avançado → Validar Expand Item** (classificação A)  
3. **Atualizar estrutura**  
4. Tabela + gráficos preenchidos  

Full BOM API: alternativo via `DATA_SOURCE=full-bom-api` — nunca fallback silencioso.

---

## Docs

- `docs/DEC-015-EXPAND-ITEM-PROVIDER.md`
- `docs/VALIDACAO-EXPAND-ITEM-AUTOMATICA.md`
