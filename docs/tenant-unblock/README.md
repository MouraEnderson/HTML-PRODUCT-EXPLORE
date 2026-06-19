# Tenant unblock — BOM Analytics 3DEXPERIENCE

Pacote técnico para desbloquear **3D real** (sem 3DPlay) e **maturidade real** no tenant piloto.

## Documentos

| Arquivo | Conteúdo |
|---------|----------|
| [3d-representation-evidence.md](./3d-representation-evidence.md) | Evidências e bloqueio 3D |
| [lifecycle-maturity-evidence.md](./lifecycle-maturity-evidence.md) | Evidências e bloqueio maturidade |
| [admin-dassault-checklist.md](./admin-dassault-checklist.md) | Checklist para enviar ao admin/Dassault |
| [dashboard-root-resolution.md](./dashboard-root-resolution.md) | RootResolver, lastGoodContext e E-BOM estável |

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

## Status atual (última execução)

- **3D real:** FAIL — tenant sem Derived Output web
- **Maturidade real:** FAIL — invoke lifecycle 404/500
- **Widget / E-BOM / regressão CJ MESA:** OK

Commit de referência: `dfbcf15` (main).
