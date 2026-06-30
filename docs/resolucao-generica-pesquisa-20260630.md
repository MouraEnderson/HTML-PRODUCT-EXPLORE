# BOM Analytics — Resolução Genérica, Limpeza e Pesquisa 3D/Maturity

**Data:** 2026-06-30
**Backup anterior:** `9b7397d45429` (contagem corrigida)

---

## 1. Resolução genérica prd-R → dseng (implementado)

### Problema
Widget funcionava apenas com CJ MESA (mapeamento hardcoded no registry). Outros projetos (SKA, Drone, Mont10, Starret) davam `ROOT_UNRESOLVED`.

### Solução
O `waf3dx-client` já tinha `resolveEngItemRootId` implementado — faz UQL query `name:prd-R...` ou `label:título` para resolver qualquer prd-R para dseng real.

O que faltava: `bootLoadFromContextOrPersisted` não disparava o auto-load quando `ctx.physicalId` era um `prd-R`. Adicionada uma verificação:

```js
/* Auto-load prd-R generico: UQL resolve qualquer projeto automaticamente */
if (ctx && ctx.physicalId && /^prd-/i.test(s(ctx.physicalId))) {
    refreshBom();
    return;
}
```

### Fluxo completo agora
```
PSE abre qualquer projeto
  → ExplorerContext detecta prd-R via ProductExplorerBridge
  → sync-provider verifica registry:
    → CJ MESA: registry match → rootId dseng direto (rápido)
    → Outros: registry miss → ctx.physicalId = prd-R
  → bootLoadFromContextOrPersisted detecta prd-R → chama refreshBom()
  → refreshBom() → loadBomWithRootResolution → needsWafUqlResolve = true
  → resolveEngItemRootId faz UQL: name:prd-R ou label:título
  → UQL retorna dseng hexId real
  → loadBomViaStructureWithRoot carrega E-BOM
```

**Commit:** `956692b3`

---

## 2. Limpeza do repositório (executada)

**79 arquivos órfãos deletados, 19.4MB removidos.**

Incluía: 35 bundles antigos (`bom-bundle-bom20260606f` até `zm`), hotfixes antigos, runtimes antigos (`-r2`, `-fixed`), módulos descontinuados (finalizers, orchestrators, validators, mirrors, stabilizers).

**Arquivos ativos restantes:**
```
widget-v3.html
assets/css/dashboard.css
assets/js/widget-runtime-bom20260617d.js
assets/js/bom-bundle-bom20260607a.js
assets/js/bom-ska-service-hotfix-20260617d.js
assets/js/waf3dx-client-bom20260617d.js
assets/js/wafdata-probe-bom20260617d.js
assets/js/integration/explorer-context.js
assets/js/integration/product-explorer-sync-provider.js
assets/js/integration/expand-item-provider.js
docs/  (documentação)
```

---

## 3. Pesquisa: dificuldades do 3D Viewer

### Situação atual
- 3DShape representation **existe** no servidor (probe retorna 200)
- dsdo DerivedOutputs/Locate retorna `fileCount=0` (sem formato web)
- Derived output configurado no tenant (STEP_AP214/AP242/XCV) mas conversão não gerou formato web (GLB/OBJ/STL)
- O waf3dx-client já tem funções de probe, locate e download implementadas

### Dificuldades identificadas

**Dificuldade 1 — Formatos proprietários**
A geometria no 3DEXPERIENCE é armazenada em formato CGR (Catia Graphical Representation) ou 3DXML. Ambos são formatos proprietários da DS. Não existe parser open-source confiável para CGR. O Three.js não suporta CGR nativamente.

**Dificuldade 2 — Derived output não gerado**
O tenant tem regras de conversão configuradas (STEP_AP214, AP242, XCV) mas essas regras geram formatos CAD (STEP), não formatos web (GLB/OBJ/STL). A conversão para formato web precisa de uma regra adicional que pode não estar disponível no tenant cloud.

**Dificuldade 3 — FCS download requer checkout ticket**
Para baixar a representação 3DShape, é necessário obter um checkout ticket via FCS (File Content Server). Isso envolve: GET ticket → download binário → parse do formato. A autenticação FCS funciona via WAFData.authenticatedRequest mas o formato baixado é CGR (não renderizável no browser).

**Dificuldade 4 — 3DPlay é a solução oficial mas rejeitada nas premissas**
A DS usa 3DPlay (ou 3D Navigate) como viewer padrão. Widgets publicam seleção via `DS/Selection` e o 3DPlay renderiza. Isso funciona mas depende de ter o 3DPlay como widget separado no dashboard — rejeitado nas premissas do projeto.

### Opções viáveis

| Opção | Complexidade | Resultado | Status |
|-------|-------------|-----------|--------|
| **Thumbnail** | Baixa | Imagem 2D da peça | Viável agora |
| **Forçar conversão GLB** | Média | 3D interativo | Precisa investigar API no tenant |
| **Módulo AMD DS nativo** | Média | 3D nativo da plataforma | Precisa verificar disponibilidade |
| **STEP download + Three.js** | Alta | 3D interativo após parse | Three.js suporta STEP via loaders |

**Recomendação:**
1. **Imediato:** implementar thumbnail — GET EngItem retorna campo `image` ou usar API `/resources/v1/modeler/dseng/dseng:EngItem/{id}?$include=image`
2. **Investigar:** testar se `require(['DS/Visualization/Viewer3D'])` ou módulo equivalente está disponível no tenant via AMD
3. **Investigar:** testar POST para forçar conversão derived output para GLB

---

## 4. Pesquisa: dificuldades da Maturity Write

### Situação atual
- `dseng:GetNextStates` retorna **404** no tenant
- Maturity read funciona (lê estado atual: "Em Trabalho", "IN_WORK")
- Código implementado no hotfix (read → list transitions → write → reread)

### Dificuldades identificadas

**Dificuldade 1 — Endpoint GetNextStates retorna 404**
O endpoint `POST /resources/v1/modeler/dseng/dseng:EngItem/{id}/invoke/dseng:GetNextStates` retorna 404. Possíveis causas:
- Endpoint não habilitado na versão do tenant (cloud vs on-premise)
- O path da API pode ser diferente na versão R2026x
- O Security Context pode não ter permissão lifecycle

**Dificuldade 2 — Lifecycle controlado por Change Action**
Na documentação oficial DS, a promoção de maturity é tipicamente feita via **Change Action (CA)**, não via API direta. A Change Action:
- Registra quem solicitou, implementou e aprovou
- Segue workflow de aprovação configurado
- Pode gerar nova revisão automaticamente
- É o fluxo "correto" do ponto de vista PLM

Promover maturity diretamente via API (sem CA) pode violar regras de negócio configuradas no tenant.

**Dificuldade 3 — Permissões por Collaborative Space role**
A capacidade de promover/demover depende do role do usuário no Collaborative Space:
- `VPLMProjectLeader` deveria ter permissão de promote
- Mas o tenant pode ter regras adicionais (approval workflow, CA obrigatória)
- O Security Context `CS_IMPLANTACAO` pode ter restrições específicas

### Alternativas de API para maturity

| Endpoint | Propósito | Status no tenant |
|----------|-----------|-----------------|
| `dseng:GetNextStates` | Listar transições disponíveis | 404 |
| `dseng:ChangeState` | Executar transição | Não testado (depende de GetNextStates) |
| `dseng:Promote` | Promover um nível | Não testado |
| `dslc:changeState` (dslc modeler) | API de lifecycle genérica | Não testado |
| Change Action via API | Fluxo completo com aprovação | Não investigado |

### Próximos passos para maturity
1. **Testar endpoint alternativo:** `dslc:changeState` em vez de `dseng:GetNextStates`
2. **Testar com outro item:** pode ser que CJ MESA root tenha restrição específica
3. **Verificar com admin do tenant:** confirmar se promote via API está habilitado
4. **Investigar Change Action via API:** pode ser o fluxo correto para o tenant

---

## 5. Resumo do estado atual

### Funciona ✅
| Item | Detalhe |
|------|---------|
| Widget carrega no F5 | UWA lifecycle |
| E-BOM com dados reais | Profundidade 20, sem limite de linhas |
| Gráficos pizza | Saúde Maturidade + Proprietários |
| IDs reais no clique | Reference ID, Instance ID |
| Resolução CJ MESA | Via registry (instantâneo) |
| Resolução genérica prd-R | Via UQL (qualquer projeto) |
| Repositório limpo | 10 arquivos ativos, zero órfãos |

### Pendente ❌
| Item | Bloqueio | Próximo passo |
|------|----------|---------------|
| 3D viewer | fileCount=0, formato proprietário | Implementar thumbnail + investigar módulo AMD |
| Maturity write | GetNextStates 404 | Testar dslc:changeState + verificar permissões |
