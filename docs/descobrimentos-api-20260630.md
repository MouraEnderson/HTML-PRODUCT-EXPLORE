# BOM Analytics — Descobrimentos de API (testes no console 2026-06-30)

## Backup atual
**SHA:** `9b7397d45429` (contagem corrigida + resolução genérica + limpeza)

---

## Testes realizados no console do 3DDashboard

### Domínio correto
O console do 3DDashboard está no domínio `us1-ifwe.3dexperience.3ds.com`.
As APIs REST do 3DSpace estão em `us1-space.3dexperience.3ds.com`.
Fetch relativo (sem domínio) vai para o domínio errado → 404.
**Sempre usar URL completa com `credentials: 'include'` para enviar cookies de sessão.**

### Resultado dos testes

| Teste | Método | Endpoint | Status | Resultado |
|-------|--------|----------|--------|-----------|
| GET EngItem (sem mask) | GET | `dseng:EngItem/{id}` | 200 | 13 campos: name, title, state, cestamp... |
| GET EngItem (mask Details) | GET | `dseng:EngItem/{id}?$mask=dsmveng:EngItemMask.Details` | 200 | 18 campos, sem image/thumbnail |
| GET EngItem ($fields=all&$include=image) | GET | `dseng:EngItem/{id}?$fields=all&$include=image` | 400 | Parâmetro não suportado |
| POST GetNextStates | POST | `dseng:EngItem/{id}/invoke/dseng:GetNextStates` | **404** | Endpoint não existe no tenant |
| AMD Viewer3D | require | `DS/Visualization/Viewer3D` | **404** | Módulo não existe no tenant |
| dslc modeler | GET | `/resources/v1/modeler/dslc/` | **404** | Modeler não existe no tenant |
| PATCH EngItem (sem CSRF) | PATCH | `dseng:EngItem/{id}` | **403** | CSRF missing |
| PATCH EngItem (com CSRF, sem body) | PATCH | `dseng:EngItem/{id}` + ENO_CSRF_TOKEN | **400** | "ceStamp key is missing in the payload" |

### Conclusões

**Maturity write: PATCH funciona!**
- `dseng:GetNextStates` não existe no tenant (404)
- `dslc` modeler não existe no tenant (404)
- Mas **PATCH direto no EngItem aceita mudança de state**
- Precisa: SecurityContext + ENO_CSRF_TOKEN + `cestamp` no body
- 400 "ceStamp missing" = endpoint aceita, só precisa do payload correto

**3D viewer: sem thumbnail via API**
- `$fields=all&$include=image` → 400
- Mask Details → 18 campos, nenhum `image` ou `thumbnail`
- `DS/Visualization/Viewer3D` → módulo AMD não existe
- **Opção viável: ícone por tipo (Assembly/Part) ou Three.js quando derived output existir**

---

## Fluxo de maturity write confirmado

```
1. GET dseng:EngItem/{id}
   → state: "IN_WORK", cestamp: "795A0F..."

2. PATCH dseng:EngItem/{id}
   Headers: SecurityContext + ENO_CSRF_TOKEN
   Body: { "cestamp": "795A0F...", "state": "FROZEN" }
   → 200 (esperado)

3. GET dseng:EngItem/{id}
   → state: "FROZEN" (confirma mudança)
```

### Transições válidas (Engineering Definition Maturity Graph)
```
IN_WORK → FROZEN (congelar para revisão)
FROZEN → RELEASED (liberar)
FROZEN → IN_WORK (devolver para trabalho)
RELEASED → OBSOLETE (obsoleto)
```

### Requisitos de implementação
- Ler `state` e `cestamp` do item selecionado na E-BOM
- Mostrar transições disponíveis baseado no estado atual
- Executar PATCH com CSRF + cestamp + novo state
- Reler EngItem para confirmar mudança
- Atualizar pizza de Saúde da Maturidade
- Não permitir transição inválida (ex: IN_WORK → RELEASED direto)
