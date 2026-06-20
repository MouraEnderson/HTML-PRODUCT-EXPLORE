# Tenant unblock — BOM Analytics 3DEXPERIENCE

Pacote técnico para desbloquear **3D real** (sem 3DPlay) e **maturidade real** no tenant piloto.

## Documentos

| Arquivo | Conteúdo |
|---------|----------|
| [3d-representation-evidence.md](./3d-representation-evidence.md) | Evidências e bloqueio 3D |
| [lifecycle-maturity-evidence.md](./lifecycle-maturity-evidence.md) | Evidências e bloqueio maturidade |
| [admin-dassault-checklist.md](./admin-dassault-checklist.md) | Checklist para enviar ao admin/Dassault |
| [dashboard-root-resolution.md](./dashboard-root-resolution.md) | RootResolver, lastGoodContext e E-BOM estável |
| [../STATUS-CAS-AUTH-E-BOM-20260619.md](../STATUS-CAS-AUTH-E-BOM-20260619.md) | **Status CAS Auth + E-BOM** — o que funciona, erros, pendências |

## Probe reexecutável

Com credenciais no `backend/.env` (ou variáveis no Render):

```bash
cd backend
npm run probe:tenant -- 63FC553465A62400699E0792000086AB 63FC553465A62400699DB56700005253
```

Teste destrutivo de maturidade (somente ambiente seguro):

```bash
npm run probe:tenant -- 63FC553465A62400699E0792000086AB 63FC553465A62400699DB56700005253 --change --target FROZEN
```

Saídas sanitizadas em `backend/probe-output/` (não versionadas).

## Validação rápida pós-configuração tenant

```bash
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/visualization/resolve \
  -H "Content-Type: application/json" \
  -d '{"referenceId":"63FC553465A62400699DB56700005253","title":"Tampo","mode":"dseng-official"}'

curl -s -X POST https://bom-resolver.onrender.com/api/3dx/lifecycle/transitions \
  -H "Content-Type: application/json" \
  -d '{"referenceId":"63FC553465A62400699DB56700005253","mode":"dseng-official"}'
```

Aceite 3D: `ok:true`, `format` ∈ glb/gltf/obj/stl, `modelUrl` presente.  
Aceite maturidade: `ok:true`, `transitions` não vazio.

## Status atual (última execução — 2026-06-19)

| Área | Status | Detalhe |
|------|--------|---------|
| **CAS Auth Render → 3DSpace** | ❌ FAIL | Passport OK (`ticketOk`); CSRF 401: `tenant 'r1132100929518' does not exist` |
| **E-BOM `/structure` (CJ MESA)** | ❌ FAIL | Bloqueado por auth upstream (`UPSTREAM_AUTH_FAILED`) |
| **Frontend root resolution** | ✅ OK | `bom20260617d`, lastGoodContext, boot auto-load |
| **Backend código + testes** | ✅ OK | 43/43 PASS; fluxo CAS alinhado Postman Primer |
| **3D real** | ❌ FAIL | Tenant sem Derived Output web |
| **Maturidade real** | ❌ FAIL | invoke lifecycle 404/500 |

Commit Render (deploy): `19919c5`. Documentação completa: [STATUS-CAS-AUTH-E-BOM-20260619.md](../STATUS-CAS-AUTH-E-BOM-20260619.md).

### Validação CAS (Render)

```bash
curl -s https://bom-resolver.onrender.com/api/3dx/bom/health/authcheck
```

Esperado após desbloqueio: `casLoginOk: true`, `canReadKnownRoot: true`.

### Teste decisivo (PC local — Postman ou probe)

```powershell
cd backend
$env:THREEDX_USERNAME = "enderson.moura@ska.com.br"
$env:THREEDX_PASSWORD = "..."
npm run probe:postman-cas
```

Collection: `postman/CAS-Login-Tenant-R1132100929518.postman_collection.json`
