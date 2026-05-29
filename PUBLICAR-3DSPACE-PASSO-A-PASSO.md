# Passo C — Publicar no 3DSpace (guia para você)

## O que você vê hoje no Passo B

| Explorer (esquerda) | BOM Analytics (direita) |
|---------------------|-------------------------|
| **Mont10** (M1, M2…) | **01_SKA_Drone** com 19 itens |

Isso é **demonstração do Drone**, não leitura do Mont10.  
No **GitHub** o widget **não consegue** ler a árvore do Explorer.

**Passo C** coloca o HTML no **mesmo servidor** do Explorer → aí lê Mont10, Drone, etc.

---

## Eu não consigo entrar no seu 3DSpace

Não compartilhe senha aqui. O que ajuda:

1. Você (ou admin) publica o ZIP  
2. Você testa a URL no Chrome **logado**  
3. Me manda **print** da tela ou do erro (F12 → Console)

---

## O que fazer agora (15 minutos)

### 1. Gerar o pacote na sua máquina

Abra PowerShell:

```powershell
cd C:\Users\Enderson\Projects\3dx-product-explorer-bom-dashboard
powershell -File scripts\sync-webapps.ps1
Compress-Archive -Path webapps\BomAnalytics\* -DestinationPath BomAnalytics-3DSpace.zip -Force
```

Arquivo criado: `BomAnalytics-3DSpace.zip` (na pasta do projeto).

### 2. Enviar para quem administra o tenant

E-mail / ticket para TI ou admin 3DEXPERIENCE. **Copie e cole:**

```
Assunto: Publicar webapp BomAnalytics no 3DSpace

Tenant: R1132100929518
Collabspace: CS_IMPLANTACAO

Por favor extrair o anexo BomAnalytics-3DSpace.zip em:

  webapps/BomAnalytics/

no servidor 3DSpace (mesmo local dos webapps ENXScene / ENOVIA).

URL para testar (usuário logado):

https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html

É HTML estático (sem instalação Java). Usa a sessão 3DEXPERIENCE já existente.
```

Anexe: **BomAnalytics-3DSpace.zip**

### 3. Quando o admin disser “publicado”

No Chrome (logado no 3DEXPERIENCE), abra:

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

| Resultado | Significado |
|-----------|-------------|
| Abre dashboard com gráficos | Deploy OK |
| 404 / IP não encontrado | DNS ou caminho errado — teste URL ifwe abaixo |
| Página em branco | F12 → Console → print |

URL alternativa (se space não abrir):

```
https://r1132100929518-us1-ifwe.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

### 4. Colocar no dashboard LISTA 3DX

1. Aba **PRODUCTEXPLORE** (mesma do Explorer)  
2. **Remova** widget BOM antigo (GitHub)  
3. Adicione **Web Page Reader** ou **Additional App**  
4. URL = URL do **3DSpace** (passo 3), **não** github.io  
5. Salvar → Ctrl+F5  
6. Abra **Mont10** no Explorer → **↻ Sincronizar Explorer**

Deve mostrar **Mont10** no cabeçalho e itens da estrutura real.

---

## Se você é admin da plataforma

Platform Management → não publica webapp em pasta.

Precisa de acesso ao **servidor 3DSpace** ou pipeline de deploy que sua empresa usa para `webapps/ENXScene`.

---

## Enquanto não tem Passo C (GitHub)

1. No Explorer: clique com botão direito no **Mont10** → Propriedades / Informações → copie **ID físico** (32 caracteres hex)  
2. No BOM Analytics: cole no campo **Physical ID** → **Carregar**  
3. Ainda pode dar só 1 item no GitHub — BOM completa só no 3DSpace

---

## Checklist

- [ ] ZIP gerado  
- [ ] Enviado ao admin  
- [ ] URL 3DSpace abre no navegador  
- [ ] Widget no dashboard aponta para URL 3DSpace  
- [ ] Mont10 no Explorer + Sincronizar → nome Mont10 no BOM
