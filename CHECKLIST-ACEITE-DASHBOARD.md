# Checklist de aceite — BOM Analytics no 3DDashboard

Documento para validar com você, com admin 3DX ou suporte Dassault **antes** de considerar o dashboard “pronto para uso diário”.

**Norte (uma frase):** o widget **BOM Analytics** ao lado do **Product Structure Explorer** mostra a **mesma E-BOM aberta no Explorer**, atualizada de forma **automática e confiável**, **sem** copiar/colar a grade.

---

## Contexto fixo do seu ambiente

| Item | Valor |
|------|--------|
| Dashboard | LISTA 3DX — aba PRODUCTEXPLORE |
| Widget oficial | ENOVIA — Product Structure Explorer (ex.: Mont10) |
| Widget custom | BOM Analytics — **Additional App** |
| URL do app | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?v=bom20260605g` |
| Tenant | `R1132100929518` — space `r1132100929518-us1-space.3dexperience.3ds.com` |
| Collab / contexto | `CS_IMPLANTACAO` (security context no config) |
| Deploy 3DSpace | **Não** disponível (`/webapps/BomAnalytics/` = 404) |

**Fora de escopo como solução principal:** Excel/CSV upload, Web Page Reader sem API, fluxo “cole na caixa azul” como único caminho.

---

## Critérios de aceite (marque ✅ quando passar)

### 1. Integração no dashboard (infra)

- [x] Additional App registrado com URL **mouraenderson** (não moura**and**erson). *(confirmado piloto LISTA 3DX)*
- [x] Widget BOM Analytics abre no 3DDashboard com build identificável — pill **`bom20260605g`** (Sprint 2.5).
- [x] Widget roda **ao lado** do Explorer na mesma aba, sem abrir Chrome externo para o usuário final.

**Falha típica:** página branca, build antigo em cache, URL errada.

---

### 2. Fonte de dados = Explorer (sem clipboard obrigatório)

- [x] Fluxo principal documentado: **Atualizar estrutura** → API / TSV / cola / DOM fallback (`BomOrchestrator`).
- [x] Cola manual é **fallback** explícito (banner Cola/DOM); não é passo 1 na UI Sprint 2.5.
- [ ] **Validação live Mont10** sem colar — confirmar banner `3/3` no piloto *(T1 piloto pendente)*.

**Falha típica:** KPIs mudam só após colar; “Enderson Moura” ou JSON de avatar no título; 3 itens fixos com seleção diferente na grade.

---

### 3. Raiz dinâmica + hierarquia pai/filho (não só Mont10)

- [x] **`ExplorerContext`** — `physicalId`, `productName`, `expectedCount` dinâmicos (sem hardcode Mont10 em código de produção).
- [x] Mont10 permanece só **fixture de teste** (`data/mont10.json`, fallback piloto).
- [ ] Analytics mostra nome da raiz atual após sync live *(validar no piloto)*.
- [ ] Filhos em árvore com níveis corretos em sync live *(T1/T2 piloto)*.

**Falha típica:** título = proprietário; só 3 itens fixos; ignorar filhos quando a BOM tem 1 000+ linhas.

### 3b. Escala (BOM grande)

- [x] **`ApiBomLoader`** lazy + `BOM_MAX_NODES` + banner truncado/Parcial.
- [x] `FAST_TSV_MAX: 500` — acima disso orchestrator evita TSV primary.
- [ ] Estrutura 79+ peças validada no piloto *(T3)*.

**Falha típica:** expandir tudo de uma vez; widget congela; usuário pensa que faltou item na seleção.

---

### 4. Contagem e hierarquia corretas

- [x] Snapshot Mont10 validado: **3/3** — Mont10, M1, M2, rev 1.1 (`node scripts/test-acceptance-sprint25.js`).
- [ ] Sync live Mont10 **3/3** no dashboard *(T1 piloto)*.
- [ ] Drone **20/20** no dashboard *(T2 piloto)*.
- [ ] Seleção M2 isolada altera contagem após novo sync *(piloto)*.

**Falha típica:** sempre “3 itens” ou “1 item”; dados de sessão anterior.

---

### 5. Maturidade e aprovação alinhadas ao Explorer

- [x] Mapeamento PT-BR (`MATURITY_STATES`, painel de regras) e gráfico **Saúde da Maturidade** em UTF-8.
- [ ] KPIs Mont10 live batem com Explorer *(piloto T1)*.

**Falha típica:** estado PT-BR “Aprovado” não mapeado; só primeira linha importada.

---

### 6. API ENOVIA no Additional App (técnico)

- [x] Runtime 3DDashboard: `CAN_USE_ENOVIA_API` ativo no host `3dexperience.3ds.com`; GitHub cross-origin desligado por defeito.
- [x] Erro 406 multi-URL tratado em `enovia-api.js`; timeout configurável (`SCAN_TIMEOUT_MS`).
- [ ] REST expand retorna filhos para Mont10/Drone/SKA no piloto *(validar F12 — T1–T3)*.

**Falha típica:** timeout infinito; fallback silencioso para demo ou cola.

---

### 7. Experiência do usuário e mensagens

- [x] Botão **Atualizar estrutura**; status **Processando…** / banner sync por modo (API/TSV/Cola/DOM).
- [x] **`AUTO_SYNC_EXPLORER_MS: 0`** — sem loop/piscar agressivo.
- [x] UTF-8 completo no widget (`bom20260605g`) — validado GitHub Pages + teste auto.
- [ ] Feedback &lt; 15 s em sync live *(observar no piloto)*.

**Falha típica:** botão travado; sucesso falso com dados fixos.

---

## Teste mínimo recomendado (roteiro 5 min)

1. Abrir dashboard PRODUCTEXPLORE com Explorer **Mont10** (M1, M2 visíveis).
2. **Sem colar nada** → clicar **Varrer estrutura Explorer**.
3. Verificar critérios **3, 4 e 5**.
4. Selecionar só **M2** no Explorer → Varrer de novo → verificar que resultado **muda**.
5. F12 → Console: sem `TypeError` bloqueando; sem loop de rede falhando sem mensagem na UI.

---

## Fases (alinhamento com o projeto)

| Fase | O que valida | Clipboard |
|------|----------------|-----------|
| **Fase 0** | Widget carrega, botão verde, build visível | Pode existir |
| **Fase 1** | Varredura traz N itens coerentes | Aceito só para prova |
| **Fase 2 (seu alvo)** | Critérios 2–7 acima no dashboard | Apenas fallback |

**Hoje (pós Sprint 2.5):** Fase **1+** — arquitetura loaders + deploy `bom20260605g`; validação live T1–T3 no piloto antes de Fase 2 plena. **Meta:** Fase 2 após sign-off piloto.

---

## Perguntas para admin / Dassault (se API continuar falhando)

1. Additional App em `github.io` pode usar `WAFData` + REST 3DSpace no nosso release?
2. Qual API oficial para **seleção** do Product Structure Explorer para outro widget no mesmo dashboard?
3. Existe **physicalId** no contexto do widget quando o usuário abre Mont10 no Explorer?
4. Alternativa suportada sem `/webapps` no space (só Compass + URL externa trusted)?

---

## Referências no repo

- `OBJETIVO-PROJETO.md` — norte do produto  
- `REFERENCIA-3DX-PLM.md` — REST / widget / Additional App  
- `FASE-0-E-1.md` — passos operacionais  
- `URLS-3DX.md` — tenant e URLs  

---

*Última revisão: alinhado à conversa — necessidade = automático, sem Ctrl+C; cola = risco operacional.*

---

## Sprint 2.5 — testes T1 a T4 (build `bom20260605g`)

| Caso | Critério | Repo auto | Piloto 3DDashboard |
|------|----------|-----------|-------------------|
| **T1** Mont10 | 3/3, colunas, owner | ✅ snapshot | [ ] |
| **T2** Drone | 20/20 TSV ou API | ⚠️ snapshot 11/20 | [ ] |
| **T3** SKA | 79/79 ou msg clara | ✅ política API | [ ] |
| **T4** UX | UTF-8, build, sem piscar | ✅ + GitHub Pages | ✅ visual GitHub |

**Automatizado:** `node scripts/test-acceptance-sprint25.js`  
**Roteiro completo:** `TESTE-SPRINT-25-T1-T4.md`

---

## Aceite Sprint 2.5 — item 9 (registro formal)

| Campo | Valor |
|-------|--------|
| **Build** | `bom20260605g` |
| **Commit deploy** | `19d4c29` (itens 6–7) + commit deste aceite (itens 8–9) |
| **Widget** | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?v=bom20260605g` |
| **Data aceite técnico** | 2026-05-28 |
| **Escopo aceite** | Entregáveis E1–E10 (código + docs + testes auto T1/T3/T4) |
| **Fora do aceite** | T1/T2/T3 **live** no 3DDashboard — follow-up primeira sessão piloto |

### Entregáveis E1–E10

| # | Entregável | Status |
|---|------------|--------|
| E1 | `BomOrchestrator` | ✅ |
| E2 | `ExplorerContext` | ✅ |
| E3 | `ApiBomLoader` + lazy | ✅ |
| E4 | `TsvBomLoader` ≤500 | ✅ |
| E5 | `PasteBomLoader` | ✅ |
| E6 | DOM não primary | ✅ |
| E7 | Sync banner honesto | ✅ |
| E8 | Auto-sync conservador (`AUTO_SYNC=0`) | ✅ |
| E9 | UTF-8 UI | ✅ |
| E10 | Build + entrada checklist | ✅ |

### Assinatura

| Papel | Nome | Data | Observação |
|-------|------|------|------------|
| **Aceite técnico (repo + GitHub Pages)** | Enderson Moura / agente sprint | 2026-05-28 | Testes auto 10 pass / 1 warn; T4 visual OK |
| **Aceite operador piloto (T1–T3 live)** | *(pendente)* | — | Marcar após sessão LISTA 3DX / PRODUCTEXPLORE |

**Comando de regressão:** `node scripts/test-acceptance-sprint25.js` — deve terminar exit 0 (T2 warn esperado até snapshot 20 peças ou piloto).
