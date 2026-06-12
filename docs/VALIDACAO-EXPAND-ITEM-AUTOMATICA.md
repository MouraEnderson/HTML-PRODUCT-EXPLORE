# Validação automática Expand Item (DEC-015)

**Build:** `bom20260614g`  
**PR:** #11 (draft — sem merge até classificação **A** no tenant)

---

## Como usar (sem Console manual)

1. Abra o dashboard piloto no 3DDashboard com Product Structure Explorer carregado.
2. Widget: `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614g`
3. No widget, abra **Avançado**.
4. Clique **Validar Expand Item**.
5. Leia o painel **Validação Expand Item** (zona central, abaixo do banner).
6. Clique **Copiar relatório técnico** e cole no chat/time.

**Não** é necessário:

- abrir DevTools;
- escolher iframe;
- colar scripts;
- rodar `__expandItemProbe`.

---

## O que a validação executa

Ordem automática (host **`*-space`** apenas):

1. WAFData + SecurityContext + 3DSpace URL  
2. `GET /resources/v1/application/CSRF` → `ENO_CSRF_TOKEN`  
3. Resolver e validar `rootId` (Explorer → UQL → fallback conhecido com log)  
4. `POST .../dseng:EngItem/{rootId}/expand` com body dseng_v1  
5. `normalizeExpandItemPayload()`  
6. Classificação **A/B/C/D/E/F** + decisão técnica  

---

## Classificações

| Classe | Significado | Ação |
|--------|-------------|------|
| **A** | API OK — 200 + Path + rows | **Atualizar estrutura** liberado |
| **B** | Permissão/auth — 403 CSRF/SecurityContext/role | Checklist admin; widget bloqueado |
| **C** | RootId — 404 ou root inacessível | Revalidar id 32 hex |
| **D** | URL/método — 405 | Confirmar POST em `*-space*`; **nunca ifwe** |
| **E** | Body/Content-Type — 400/415 ou member vazio | Ajustar schema dseng_v1 |
| **F** | Transporte/CORS — ResponseCode 0, WAF ausente | Additional App trusted ou backend-auth |

---

## Gate Atualizar estrutura

Enquanto a última validação **não** for **A**:

- **Atualizar estrutura** exibe:  
  `Expand Item ainda não validado. Rode Validação Expand Item.`
- Tabela **não** é preenchida com fallback.
- Full BOM API **não** é chamada silenciosamente.

---

## Auto validar ao abrir

```javascript
APP_CONFIG.AUTO_VALIDATE_EXPAND_ITEM = true  // opcional
```

Build `14f` padrão: **`false`**.

---

## Por que não Console manual

- Web Page Reader / iframe exige zero fricção para o usuário piloto.
- Relatório padronizado JSON (`__lastExpandItemValidationReport`) para decisão A–F.
- Mesmo fluxo que Postman (CSRF + ENO_CSRF_TOKEN + SecurityContext).

---

## Por que ifwe é inválido

Endpoints **dseng** vivem no **3DSpace** (`*-space.3dexperience.3ds.com/enovia`).  
Host **ifwe** é dashboard — POST expand retorna **405** (confirmado em `bom20260614e`).

---

## Por que Full BOM API não é fallback

DEC-015: Expand Item é fonte principal. Full BOM API só como modo alternativo explícito (`DATA_SOURCE=full-bom-api`), nunca silencioso.

---

## Critérios merge PR #11

- [ ] Botão **Validar Expand Item** visível e funcional  
- [ ] Relatório em tela + copiar JSON  
- [ ] Classificação **A** no tenant real  
- [ ] `Atualizar estrutura` → tabela = `rows.length`  
- [ ] KPI Total Peças = `rows.length`  

---

## Playwright local (opcional)

```bash
node scripts/run-expand-item-validation-local.mjs
```

Sem sessão 3DEXPERIENCE autenticada, o script registra bloqueio de auth — **não** conta como falha do produto.
