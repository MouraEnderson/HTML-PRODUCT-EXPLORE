# Selection Resolver — PR #24

**Data:** 2026-06-11  
**Branch:** `hotfix/resolve-pse-prd-name-label-via-dseng-search`  
**Build frontend:** `bom20260617d` (sem novo build — apenas mensagens de diagnostics no hotfix)  
**Backend:** extensão de `POST /api/3dx/bom/resolve-selection`

---

## 1. Problema real no 3DEXPERIENCE

O Product Structure Explorer pode entregar:

| Campo | Exemplo |
|-------|---------|
| name / physicalId visual | `prd-R1132100929518-01103695` |
| title | `CJ MESA 4BCS VP TOP 3DX` |

**Isso não é EngItem ID direto.**

```
GET /dseng:EngItem/prd-R1132100929518-01103695 → 404
```

Caminho comprovado no tenant:

1. `GET .../dseng:EngItem/search?$searchStr=name:prd-R1132100929518-01103695`
2. `GET .../dseng:EngItem/search?$searchStr=label:"CJ MESA 4BCS VP TOP 3DX"`
3. Member retorna `id = 63FC553465A62400699E0792000086AB`
4. `GET .../dseng:EngItem/63FC553465A62400699E0792000086AB` → 200
5. `GET .../dseng:EngInstance` → estrutura

**CJ MESA é caso de teste, não hardcode.** A lógica é genérica para qualquer `prd-*` / `bfa-*` / title resolvível.

---

## 2. Solução

### Backend

| Componente | Função |
|------------|--------|
| `ThreeDxDsengClient.searchEngItems()` | GET oficial `dseng:EngItem/search` |
| `threeDxBomService.searchEngItems()` | Wrapper exportado |
| `selectionResolver.js` | Estratégias ordenadas + match exato único |

### Ordem de resolução

1. **manual-root** — hex Avançado
2. **direct-engitem** — hex 24–32 no contexto
3. **search-name-prd** — `name:prd-*` (nunca GET direto em prd)
4. **search-title-label** — `label:"title"`
5. **search-fallback-safe** — busca simples só se match exato único por name ou title

### Regras de match (`selectUniqueExactMatch`)

| Matches | Resultado |
|---------|-----------|
| 0 | NOT_FOUND |
| 1 exato | RESOLVED |
| 2+ exato | AMBIGUOUS — **não escolhe no chute** |

### Erros

| Código | HTTP | Mensagem |
|--------|------|----------|
| `SELECTION_NOT_RESOLVED` | 422 | Contexto não resolvido |
| `SELECTION_AMBIGUOUS` | 422 | Contexto ambíguo |

`/api/3dx/bom/structure` permanece intacto (Avançado).

---

## 3. Frontend (bom20260617d)

Sem mudança de fluxo:

- **Sincronizar** → `/resolve-selection`
- **Testar Root ID / Avançado** → `/structure`

Ajustes em diagnostics:

- `resolution.strategy`, `rootName`, `rootTitle`, `attempts`
- Mensagens amigáveis para AMBIGUOUS / NOT_RESOLVED
- Empty state preservado (sem gráfico 1)

---

## 4. Testes

```bash
cd backend && npm test   # 14/14
```

### Render pós-deploy

**Payload name prd:**

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST \
  https://bom-resolver.onrender.com/api/3dx/bom/resolve-selection \
  -H "Content-Type: application/json" \
  -d '{"selection":{"normalized":{"name":"prd-R1132100929518-01103695","title":"CJ MESA 4BCS VP TOP 3DX"}},"depth":1,"includeRoot":true,"mode":"dseng-official"}'
```

Esperado: `strategy: search-name-prd`, `rootId` hex, `rows.length: 5`.

**Payload title:**

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST \
  https://bom-resolver.onrender.com/api/3dx/bom/resolve-selection \
  -H "Content-Type: application/json" \
  -d '{"selection":{"normalized":{"title":"CJ MESA 4BCS VP TOP 3DX"}},"depth":1,"includeRoot":true,"mode":"dseng-official"}'
```

Esperado: `strategy: search-title-label`.

---

## 5. Limitações

- Ambiguidade bloqueia — usuário usa Avançado ou refine seleção
- Title-only sem match no dseng search → NOT_RESOLVED honesto
- Sem busca ampla perigosa sem match exato único
- Sem DOM/clipboard/TSV/Mirror/Expand

---

## 6. Critério de aceite

1. PSE entrega `prd-*` / title
2. Backend resolve via dseng search
3. Converte para ID hexadecimal
4. Carrega EngItem/EngInstance
5. Dashboard renderiza BOM
6. Funciona para CJ MESA (teste)
7. Genérico para outras estruturas com name/title resolvível
8. Ambiguidade bloqueada
9. Sem dado falso
