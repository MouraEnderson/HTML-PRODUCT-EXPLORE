# Erro: "Não foi possível encontrar o endereço IP" do 3DSpace

## O que significa

O widget **não consegue resolver DNS** de:

`r1132100929518-us1-space.3dexperience.3ds.com`

Isso **não é** erro do HTML. É rede / tenant / URL errada para o seu acesso.

O seu **dashboard** abre em:

`r1132100929518-us1-ifwe.3dexperience.3ds.com`  (**ifwe**)

Muitas empresas expõem só o **ifwe** no PC do usuário; o host **us1-space** só funciona na VPN ou no servidor.

---

## Teste 1 — No Chrome (logado na 3DX)

Abra em nova aba, um por vez:

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

```
https://r1132100929518-us1-ifwe.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

| Resultado | Ação |
|-----------|------|
| **space** = DNS não encontrado | Fale com TI — liberar DNS/VPN do `*-space.3dexperience.3ds.com` |
| **ifwe** abre página (ou login) | Use a URL **ifwe** no Web Page Reader (abaixo) |
| Ambos 404 | Admin ainda não publicou `BomAnalytics` |
| **space** abre o dashboard | Use URL **space** no widget |

---

## Teste 2 — Descobrir o host que o Explorer usa

1. Abra **Product Structure Explorer** (aba EXPLORE).
2. **F12** → aba **Rede (Network)**.
3. Filtre: `enovia` ou `space` ou `3dexperience`.
4. Veja o **domínio** das requisições que **funcionam** (status 200).
5. Monte a URL do widget:

```
https://<DOMINIO-QUE-APARECEU>/enovia/webapps/BomAnalytics/index.html
```

---

## URLs para testar no Web Page Reader

**Padrão (quando space resolve):**

```
https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

**Alternativa (quando só ifwe resolve na sua rede):**

```
https://r1132100929518-us1-ifwe.3dexperience.3ds.com/enovia/webapps/BomAnalytics/index.html
```

**Enquanto TI/admin não resolvem — só layout (sem BOM real):**

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html
```

---

## O que pedir ao admin / TI

1. Confirmar hostname oficial do **3DSpace** do tenant `R1132100929518`.
2. Publicar pasta `webapps/BomAnalytics` (zip em `DEPLOY-3DSPACE.md`).
3. Garantir que usuários resolvem DNS do host onde o webapp foi publicado.

Texto pronto para e-mail: final de `DEPLOY-3DSPACE.md`.
