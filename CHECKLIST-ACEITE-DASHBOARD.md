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
| URL do app | `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html` (ou sucessor) |
| Tenant | `R1132100929518` — space `r1132100929518-us1-space.3dexperience.3ds.com` |
| Collab / contexto | `CS_IMPLANTACAO` (security context no config) |
| Deploy 3DSpace | **Não** disponível (`/webapps/BomAnalytics/` = 404) |

**Fora de escopo como solução principal:** Excel/CSV upload, Web Page Reader sem API, fluxo “cole na caixa azul” como único caminho.

---

## Critérios de aceite (marque ✅ quando passar)

### 1. Integração no dashboard (infra)

- [ ] Additional App registrado com URL **mouraenderson** (não moura**and**erson).
- [ ] Widget BOM Analytics abre no 3DDashboard com build identificável (ex.: faixa `BOM v2 SOLO — bom…`).
- [ ] Widget roda **ao lado** do Explorer na mesma aba, sem abrir Chrome externo para o usuário final.

**Falha típica:** página branca, build antigo em cache, URL errada.

---

### 2. Fonte de dados = Explorer (sem clipboard obrigatório)

- [ ] Usuário **não precisa** de Ctrl+C / Ctrl+V na caixa azul para ver a BOM do Mont10 (ou raiz aberta).
- [ ] Botão **Varrer** (ou sync automático) lê a estrutura **atual** do Explorer / ENOVIA — não texto colado ontem.
- [ ] Se a caixa de cola existir, ela é só **fallback** (suporte), não documentada como fluxo principal.

**Falha típica:** KPIs mudam só após colar; “Enderson Moura” ou JSON de avatar no título; 3 itens fixos com seleção diferente na grade.

---

### 3. Raiz dinâmica + hierarquia pai/filho (não só Mont10)

- [ ] **Mont10** serve só para **teste**; o app funciona com **qualquer** estrutura aberta no Explorer.
- [ ] Analytics mostra **Estrutura: &lt;nome da raiz atual&gt;** (o assembly aberto no Explorer).
- [ ] `physicalId` da **raiz** vem de seleção/contexto/API — **sem** hardcode de Mont10 em produção.
- [ ] Filhos carregados em **árvore** (pai → filho), níveis corretos — não lista plana de células coladas.

**Falha típica:** título = proprietário; só 3 itens fixos; ignorar filhos quando a BOM tem 1 000+ linhas.

### 3b. Escala (BOM grande)

- [ ] Estrutura com **muitos itens** (ex. 1 000+) carrega sem travar o browser (lazy load / limite configurável + mensagem clara).
- [ ] KPIs e tabela refletem **contagem real** da hierarquia varrida (ou amostra documentada se houver limite).

**Falha típica:** expandir tudo de uma vez; widget congela; usuário pensa que faltou item na seleção.

---

### 4. Contagem e hierarquia corretas

- [ ] Para Mont10 + M1 + M2 na grade Explorer: status **≥ 3 itens** (raiz + filhos, conforme regra do tenant).
- [ ] Tabela lista **Mont10, M1, M2** com revisão **1.1** (ou valores reais do tenant).
- [ ] Alterar seleção no Explorer (ex.: só M2) e varrer de novo → contagem/nomes **mudam** (não ficam fixos).

**Falha típica:** sempre “3 itens” ou “1 item”; dados de sessão anterior.

---

### 5. Maturidade e aprovação alinhadas ao Explorer

- [ ] Itens **Aprovado** no Explorer aparecem como aprovados/released nos KPIs (não “0 aprovados / 1 sem aprovação” com tudo verde no Explorer).
- [ ] Gráficos de maturidade/tipo/refletem os 3 itens (não vazios ou incoerentes).

**Falha típica:** estado PT-BR “Aprovado” não mapeado; só primeira linha importada.

---

### 6. API ENOVIA no Additional App (técnico)

- [ ] No 3DDashboard, `WAFData` carrega (sem erro fatal `getSecurityContext` no Console).
- [ ] Chamada REST `dseng` / expand BOM retorna filhos ou mensagem de erro **clara** (não “Varrendo…” > 10 s).
- [ ] Security context do tenant aplicado (`CS_IMPLANTACAO` ou o do usuário logado).

**Falha típica:** timeout infinito; fallback silencioso para demo ou cola.

---

### 7. Experiência do usuário e mensagens

- [ ] Estados visíveis: **Varrendo…** → **Varredura concluída: N itens — &lt;nome&gt;** ou **Varredura falhou: &lt;motivo acionável&gt;**.
- [ ] Botão **não** fica em “Varrendo…” mais de ~15 s sem feedback.
- [ ] Instrução principal na UI fala de **Explorer + Varrer**, não de “cole na caixa” como passo 1.

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

**Hoje:** Fase 0/1 parcial (cola funciona no Chrome; dashboard instável; API/seleção não confiáveis). **Meta:** Fase 2.

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
