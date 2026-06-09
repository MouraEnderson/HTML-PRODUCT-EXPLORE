# BOM Resolver Backend

Backend Node.js para resolver estruturas E-BOM do 3DEXPERIENCE/ENOVIA fora do HTML do widget.

## Objetivo

O widget continua sendo front-end. Este serviço passa a ser o motor de resolução da BOM:

- resolve `prd-R...` para `VPMReference` navegável;
- busca `dseng:EngInstance` com paginação;
- preserva ocorrência/hierarquia;
- resolve filhos `dsxcad:Product` / `dsxcad:Part` quando possível;
- valida `actualCount` contra `expectedCount` do Product Explorer;
- retorna JSON limpo para a E-BOM.

## Endpoints

### Health

```http
GET /health
```

### Resolver BOM

```http
POST /api/bom/resolve
Content-Type: application/json
```

Exemplo:

```json
{
  "spaceUrl": "https://r1132100929518-us1-space.3dexperience.3ds.com/enovia",
  "securityContext": "ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO",
  "csrfToken": "...",
  "cookie": "...",
  "physicalId": "prd-R1132100929518-00662677",
  "rootName": "SKA_ENDERSW-BES-00009887",
  "expectedCount": 607
}
```

Resposta resumida:

```json
{
  "ok": false,
  "status": "partial",
  "source": "backend-api-resolver",
  "expectedCount": 607,
  "actualCount": 524,
  "root": {
    "physicalId": "prd-R1132100929518-00662677",
    "resolvedId": "0A558407DC10060066C734B7000022CF"
  },
  "items": []
}
```

`ok` só será `true` quando `actualCount === expectedCount`.

## Render

Este repositório tem `render.yaml` na raiz. No Render:

1. Conecte o repo `MouraEnderson/HTML-PRODUCT-EXPLORE`.
2. Use Blueprint ou crie Web Service manual.
3. Configure `rootDir` como `backend`.
4. Build command: `npm install`.
5. Start command: `npm start`.
6. Configure variáveis sensíveis:
   - `ENOVIA_BEARER_TOKEN` ou
   - `ENO_CSRF_TOKEN` + `ENOVIA_COOKIE`.

## Variáveis

Veja `.env.example`.

## Importante

GitHub Pages não executa backend. Este serviço precisa rodar no Render, Railway, Vercel, servidor interno ou similar.
