# 3DX Dashboard — Visual aprovado (Web Page Reader)

**Data de aceite visual:** 2026-06-17  
**Status:** ✅ **Visual OK** (aprovado pelo usuário piloto)  
**Build:** `bom20260617d`  
**Widget oficial:** `widget-v3-08i.html`  
**Commit de referência (layout final):** `abf29bc` (`main`)

---

## 1. Link oficial (não alterar)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617d&t=3dx&probe=f5df3e3
```

**Backend SKA:** `https://bom-resolver.onrender.com`  
**Tenant piloto:** `R1132100929518`  
**Dashboard piloto:** `#dashboard:e9bdf50c-6377-4956-b931-b5566a8e9e97/tabId:AMzDJUOA09wQHOdVtHHY`

---

## 2. O que foi aprovado (UX visual)

Layout operacional em **4 quadrantes** no Web Page Reader:

```
┌──────────────────────────────────────────────────────────────┐
│ TOPBAR — Sincronizar · Atualizar · badge SKA/dseng · relógio │
├───────────────────────────────┬──────────────────────────────┤
│ FILTRO — diagnóstico compacto │ GRAFICO — maturidade +       │
│ + filtros (Maturidade, Tipo,  │ proprietários                │
│ Aprovação, Buscar)            │                              │
├───────────────────────────────┼──────────────────────────────┤
│ EBOM — tabela principal       │ 3DVIEW — preview + metadados │
│ (altura máxima, scroll)       │ (rodapé alinhado com EBOM)   │
└───────────────────────────────┴──────────────────────────────┘
```

| Item visual | Status |
|-------------|--------|
| EBOM sobe e preenche espaço abaixo dos filtros | ✅ |
| Gráfico Saúde da Maturidade sem corte superior/inferior | ✅ |
| Legendas dos gráficos com espaço abaixo do donut | ✅ |
| 3DVIEW estendido até alinhar base com EBOM | ✅ |
| Coluna direita legível (`minmax(280px, 38%)`) | ✅ |
| Gráficos e preview sempre visíveis | ✅ |
| Botão **Painel** removido | ✅ |
| **Avançado** oculto do usuário final | ✅ |
| Linha KPI Root/Total/Referências removida da área principal | ✅ |
| Diagnóstico compacto (`#skaBomDiagnostics`) | ✅ |

---

## 3. O que **não** faz parte deste aceite visual

| Tópico | Situação |
|--------|----------|
| Contagem Explorer (ex.: 11 objetos) vs dashboard (ex.: 5 linhas depth=1) | **Escopo funcional separado** — ver §5 |
| `selected-branch` ao vivo no PSE | Pendente validação de API oficial |
| Backend Render / credenciais | Fora do escopo UX |

---

## 4. Cadeia de carregamento (produção)

```
widget-v3-08i.html
  → assets/js/widget-runtime-bom20260617d.js
  → assets/css/dashboard.css
  → assets/vendor/chart.umd.min.js
  → assets/js/bom-bundle-bom20260607a.js
  → assets/js/integration/product-explorer-sync-provider.js
  → assets/js/bom-ska-service-hotfix-20260617d.js
```

### Arquivos que governam o layout aprovado

| Arquivo | Responsabilidade |
|---------|------------------|
| `assets/css/dashboard.css` | Grid 3DX, quadrantes, chart/preview sizing |
| `assets/js/bom-ska-service-hotfix-20260617d.js` | `apply3dxProductDashboardLayout()`, `neutralizeLayoutFitFor3dx()`, `hideEndUserChrome()`, footer SKA |
| `assets/js/ui/layout-fit.js` | **Neutralizado** para `.bom-3dx-product-dashboard` (não sobrescreve grid) |

### Decisões técnicas de layout (2026-06-17)

1. **Grid de 2 linhas** (`header` + `body`) com zonas 2–5 na mesma linha de corpo.
2. **FILTRO** (`bom-zone-2`) flutuando no topo da coluna esquerda (`z-index: 4`).
3. **EBOM** (`bom-zone-4`) na mesma coluna com `padding-top` = altura medida do bloco FILTRO.
4. **GRAFICO** (`bom-zone-3`) no topo da coluna direita; **3DVIEW** (`bom-zone-5`) com `padding-top` = altura dos gráficos e altura igual à coluna EBOM.
5. **LayoutFit** do bundle não aplica mais alturas fixas que empurravam EBOM para baixo.
6. Mensagens legadas do bundle (`Snapshot: …`, `Exibindo X de Y linhas`) suprimidas quando SKA está ativo.

---

## 5. Contagem Explorer × Dashboard (contexto, não bloqueia aceite visual)

- **Product Explorer** mostra objetos **visualmente expandidos** na árvore (ex.: 11 objetos).
- **Dashboard** mostra linhas carregadas pela API dseng no recorte atual (ex.: 5 linhas em `modo: root`, depth=1).
- Isso pode ser **esperado** até seleção oficial (`selected-branch`) ou maior profundidade/expansão por linha.
- Diagnóstico compacto e footer SKA devem deixar explícito: `estrutura parcial`, `modo root`, etc.

---

## 6. Histórico de PRs / commits (UX 3DX)

| Referência | Conteúdo |
|------------|----------|
| PR #22 | Layout inicial 3DX (`bom20260617c`) — ver `docs/3DX-DASHBOARD-UX-PR22.md` |
| PR #23 | Selection resolver + hotfix `17d` |
| PR #33 | ExpandItem backend |
| PR #36 | Remove Painel/KPI, grid vermelho, diagnóstico contagem |
| `d451852` | Remove Painel, oculta KPI, diagnóstico modo |
| `49bf326` | Oculta Avançado, grid 4 zonas |
| `4b5568f` | Neutraliza LayoutFit, bloqueia footer Snapshot do bundle |
| `57271c4` | EBOM sobe, gráficos sem corte, 3DVIEW alinhado |
| `abf29bc` | CSS diagnóstico deduplicado |

---

## 7. Regressão visual — checklist rápido

No Web Page Reader, após hard refresh:

- [ ] Sem botão Painel nem Avançado visíveis
- [ ] FILTRO compacto no topo-esquerda
- [ ] EBOM imediatamente abaixo dos filtros (sem faixa cinza vazia)
- [ ] Donut maturidade completo + legenda abaixo
- [ ] Preview 3D com base alinhada ao rodapé da tabela EBOM
- [ ] Footer SKA (não `Exibindo X de Y linhas` do bundle legado)

---

## 8. Documentos relacionados

- [3DX Dashboard UX — PR #22](3DX-DASHBOARD-UX-PR22.md) — base histórica
- [Selection Resolver — PR #23](SELECTION-RESOLVER-PR23.md)
- [Runtime Stabilization — PR #21](RUNTIME-STABILIZATION-PR21.md)
- [DEC-018 Render BOM Service](DEC-018-RENDER-BOM-SERVICE-ARCHITECTURE.md)
