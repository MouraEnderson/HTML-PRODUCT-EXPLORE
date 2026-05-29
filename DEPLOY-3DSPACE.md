# Caminho C — Publicar HTML no 3DSpace (mesmo domínio do Explorer)

## Por que o Caminho C?

| Onde o HTML roda | APIs ENOVIA | Lê seleção do Explorer |
|------------------|-------------|------------------------|
| GitHub (`github.io`) | Bloqueado | Não (cross-origin) |
| **3DSpace** (`us1-space`) | Funciona (`WAFData`) | Sim (`require`, eventos) |

Com o HTML no **mesmo domínio** do Product Explorer, o dashboard passa a carregar BOM, KPIs e colunas reais.

---

## O que você precisa (perfil / acesso)

Peça ao **administrador 3DEXPERIENCE / ENOVIA** (ou equipe que mantém o tenant):

1. Permissão para **publicar webapp** em `3DSpace` **ou**  
2. Que **eles** façam o deploy da pasta `webapps/BomAnalytics/` (este projeto)  
3. Liberar URL no widget **Web Page Reader** apontando para o 3DSpace  

**Você não precisa** colocar senha no HTML. O login continua sendo o da plataforma.

---

## URLs do seu tenant

| Serviço | Host |
|---------|------|
| Dashboard (IFWE) | `r1132100929518-us1-ifwe.3dexperience.3ds.com` |
| 3DSpace / ENOVIA | `r1132100929518-us1-space.3dexperience.3ds.com` |
| Product Explorer (referência) | `.../enovia/webapps/ENXScene/ENXScene.html` |

**URL alvo do seu dashboard (após deploy):**

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

No widget **Web Page Reader**, use essa URL — **não** use mais `github.io`.

---

## Opção 1 — Admin faz deploy (mais comum em cloud)

### Passo 1: Gerar pacote

Na sua máquina:

```powershell
cd C:\Users\Enderson\Projects\3dx-product-explorer-bom-dashboard
Compress-Archive -Path webapps\BomAnalytics\* -DestinationPath BomAnalytics-3DSpace.zip -Force
```

Envie `BomAnalytics-3DSpace.zip` ao administrador.

### Passo 2: Admin instala no servidor 3DSpace

Destino típico (on-prem ou cloud gerenciado):

```
<3DSpace>/webapps/BomAnalytics/
  index.html
  assets/...
```

Reinício ou refresh do serviço 3DSpace conforme procedimento do tenant.

### Passo 3: Testar no navegador (logado)

Abra a URL alvo acima. Deve abrir o dashboard **sem** erro de `require` / cross-origin.

### Passo 4: Widget no 3DDashboard

1. Aba **PRODUCTEXPLORE** (ou mesma aba do Explorer)  
2. Editar **Web Page Reader**  
3. **URL da Web:** URL do 3DSpace (não GitHub)  
4. Salvar → F5  

---

## Opção 2 — Você tem acesso ao repositório / deploy ENOVIA

Se sua empresa usa pipeline para webapps ENOVIA:

1. Copie a pasta `webapps/BomAnalytics` para o projeto de webapps do 3DSpace  
2. Siga o processo interno (build, deploy, validação)  
3. Valide a URL no browser autenticado  

---

## Opção 3 — Widget UWA nativo (avançado)

Criar widget oficial no 3DDashboard que embute o mesmo JS (sem Web Page Reader externo).  
Requer **Widget Development** / Compass — escopo maior; use Opção 1 primeiro.

---

## Depois do deploy — fluxo de uso

1. Mesma aba: **Product Structure Explorer** + **Web Page Reader** (URL 3DSpace)  
2. Carregue o Physical Product no Explorer (ex.: Drone)  
3. No HTML: **Atualizar** — deve carregar BOM e KPIs via API  
4. Busca interna no HTML também passa a funcionar (mesmo domínio)  

---

## Checklist para enviar ao admin (copiar/colar)

```
Projeto: BOM Analytics Dashboard para 3DDashboard
Tenant: R1132100929518
Collab space: CS_IMPLANTACAO

Solicitação:
- Publicar webapp estático "BomAnalytics" em:
  /enovia/webapps/BomAnalytics/
- URL final:
  https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
- Conteúdo: pasta BomAnalytics do zip anexo (HTML + JS + CSS)
- Sem credenciais no código; usa sessão 3DEXPERIENCE (WAFData)

Motivo:
- Web Page Reader com GitHub é bloqueado por cross-origin
- Mesmo domínio 3DSpace necessário para APIs ENOVIA e seleção Product Explorer
```

---

## Se o admin disser que não pode publicar webapp

Alternativas:

1. **Proxy corporativo** — URL interna `https://intranet/.../BomAnalytics` no mesmo SSO  
2. **Widget nativo** ENOVIA (desenvolvimento custom)  
3. **Manter GitHub** só para protótipo + ID manual (limitado)  

---

## Você já subiu no Bookmark Editor (pasta DEPLOY)

Se carregou o `.7z` em **EXPLORE → DEPLOY** como Documento, isso **armazena** o pacote no ENOVIA, mas **não** ativa o site automaticamente. Siga: [DEPLOY-PASTA-DEPLOY.md](DEPLOY-PASTA-DEPLOY.md)

---

## Suporte

Após deploy, se der erro, envie print do **F12 → Console** com a URL 3DSpace aberta (não GitHub).
