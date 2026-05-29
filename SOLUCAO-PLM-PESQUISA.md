# O que a documentação DS diz (e o que seus amigos provavelmente fizeram)

Fontes: [PLM Coach – Widget Dashboard Integration](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm), [WAFData / HTTP](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSWS/CAAWebAppsTaDataAccess.htm), [3DSwym – deep link](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/link-directly-to-an-object-in-3ddashboard_PzA_WXcdSd6imG-ShMU1qQ), [ds-3dx-custom-widget-samples](https://github.com/3ds-cpe-emed/ds-3dx-custom-widget-samples), [ws3dx dseng](https://github.com/3ds-cpe-emed/ws3dx-dotnet).

---

## Três formas de colocar HTML no 3DDashboard (oficial DS)

| Forma | Acessa 3DSpace / ENOVIA? | Comunica com Explorer? | GitHub como URL? |
|-------|--------------------------|----------------------|------------------|
| **Additional App** (app adicional) | **Sim** (domínio confiável injetado) | **Sim** (pub/sub, eventos UWA) | **Sim** (URL aponta para GitHub) |
| **Run Your App** | **Não** (domínio não confiável) | Parcial | Sim |
| **Web Page Reader** | **Não** (página stand-alone) | **Não** | Sim, mas sem APIs |

Conclusão: quem integra BOM + Explorer de verdade usa **Additional App** registrado pelo **admin da plataforma**, não Web Page Reader.

---

## O que os amigos provavelmente fizeram (sem falar)

1. **Platform Manager** → **Additional App** (não Web Page Reader).
2. URL do código: GitHub ou intranet — o 3DDashboard **injeta** a página no domínio **confiável**.
3. No widget: `require(['DS/WAFData/WAFData', ...])` + `authenticatedRequest` para:
   - `GET .../resources/v1/application/CSRF`
   - `GET .../resources/v1/modeler/dseng/dseng:EngItem/{physicalId}?$expand=...`
   - filhos: `dseng:EngInstance`
4. Physical ID vem de:
   - seleção global / `DS/PlatformAPI/PlatformAPI`
   - deep link `#dashboard/app:.../content:X3DContentId=...`
   - ou pub/sub entre widgets (`UWA/Utils/InterCom`)
5. **Não** “varrem” o DOM do iframe do Explorer — leem **REST** no 3DSpace.

Publicar pasta em `/enovia/webapps/` é **alternativa** (mesmo efeito de API), não a única.

---

## Por que você vê Drone + 19 itens (e não Mont10)

| Sintoma | Causa |
|---------|--------|
| Título Drone no BOM | Fallback **demo** ou cache de bundle antigo |
| Explorer Mont10 à esquerda | Explorer é app nativo ENOVIA — funciona |
| Sincronizar / Physical ID | UI antiga ou modo Web Page Reader |
| Varrer não acha árvore | Sem API + sem Ctrl+C na grade |

---

## O que você deve criar (checklist admin)

- [ ] **Compass** → Gestão da plataforma → **Additional App** (não “página web”).
- [ ] URL: `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html`
- [ ] Tipo objeto: `VPMReference` (e afins).
- [ ] Quadrante do Compass liberado para usuários.
- [ ] Dashboard LISTA 3DX: **remover Web Page Reader** → arrastar **BOM Analytics** (Additional App).
- [ ] Ctrl+F5 no dashboard.

Barra de status esperada: **Modo: Additional App — API ENOVIA ativa**.

---

## APIs para varrer a estrutura (automático)

Base (após login no widget confiável):

```
https://{space}/enovia/resources/v1/modeler/dseng/dseng:EngItem/{physicalId}?$expand=dseng:EngInstance
```

Header: `SecurityContext: ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO`

Documentação: Developer Assistance → **3DSpace** → **Engineering Web Services (dseng)**.

---

## Se Additional App ainda falhar

1. **Ctrl+C** na grade → **Varrer** (lê clipboard) — já implementado.
2. Serviço **.NET/Java** com 3DPassport (padrão COE / ws3dx) — fase 2.
3. Publicar `webapps/BomAnalytics` no 3DSpace — mesma API, outro host.

---

## Links úteis

- Widget integration: https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSRoot/CAAWebAppsTaWidgetIntegration.htm
- WAFData: https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSWS/CAAWebAppsTaDataAccess.htm
- Exemplos DS: https://github.com/3ds-cpe-emed/ds-3dx-custom-widget-samples
- Guia admin (você): `GUIA-ADMIN-ADDITIONAL-APP.md`
