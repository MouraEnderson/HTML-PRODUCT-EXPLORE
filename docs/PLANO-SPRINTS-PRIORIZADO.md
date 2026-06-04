# Plano de Sprints Priorizado

Data: 2026-06-04

Este plano define a ordem de execucao apos a auditoria. Cada sprint deve resolver um problema claro, documentar o que foi alterado e passar por testes objetivos antes da proxima sprint.

## Regra de avanco entre sprints

Uma sprint so pode ser considerada concluida quando:

- o problema declarado foi resolvido ou reclassificado com evidencia;
- a documentacao foi atualizada;
- os testes de aceite foram executados e registrados;
- nao houve regressao nos quatro casos reais: 1 item com 2 corpos, 3 itens, 20 itens e 79 itens;
- qualquer fallback usado ficou identificado como contingencia, nao como fluxo principal;
- o console/network nao apresentou ruido novo sem explicacao.

Se um teste falhar, a sprint nao avanca. O resultado deve virar item de correcao ou decisao tecnica documentada.

## Prioridade 0 - Congelar arquitetura e limpar direcao

Problema que resolve:

O codigo atual tem caminhos concorrentes para carregar ou alterar a estrutura. Antes de corrigir API, 3D ou performance, precisamos congelar o que e produto, o que e fallback e o que e legado.

Etapas:

1. Concluir auditoria arquivo por arquivo.
2. Confirmar matriz `manter / revisar / isolar / remover depois`.
3. Definir fluxo alvo unico:

```text
Additional App -> contexto do Explorer -> 3DSpace REST/dseng -> normalizador unico -> store E-BOM -> UI -> viewer 3D
```

4. Definir fluxo manual de contingencia:

```text
Ctrl+A/Ctrl+C/Ctrl+V -> parser manual -> mesmo normalizador unico -> store E-BOM
```

5. Marcar Web Page Reader, deploy admin e 3DPlay como fora do produto.
6. Registrar riscos de arquivos grandes e bundles gerados.

Teste para avancar:

- Documento de auditoria atualizado.
- Matriz por arquivo registrada.
- Nenhuma alteracao de runtime feita nesta prioridade.
- Confirmacao de que o repositorio correto e `MouraEnderson/HTML-PRODUCT-EXPLORE`.

Status atual:

Em andamento/concluido parcialmente. Auditoria e matriz ja foram registradas em `docs/AUDITORIA-CODIGO.md`.

## Prioridade 1 - Diagnostico API isolado

Problema que resolve:

Hoje os erros 404/406 ficam misturados com fallback TSV, paste, DOM, miniatura e 3DPlay. Precisamos provar quais endpoints funcionam no tenant real antes de reescrever a carga automatica.

Etapas:

1. Criar ou ajustar diagnostico isolado de plataforma.
2. Registrar URL efetiva de `3DSpace` resolvida por `i3DXCompassServices.getServiceUrl('3DSpace', x3dPlatformId)`.
3. Confirmar que IFWE nao esta sendo usado como 3DSpace.
4. Testar CSRF via `WAFData`.
5. Testar raiz por `dseng:EngItem`.
6. Testar filhos por `dseng:EngInstance` com `$skip` e `$top`.
7. Registrar payloads reais ou formato resumido seguro, sem credenciais.
8. Separar erros de estrutura de erros de thumbnail/getpicture.

Teste para avancar:

- Para cada um dos quatro casos, registrar:
  - raiz detectada;
  - ID usado;
  - endpoint chamado;
  - status HTTP;
  - quantidade de filhos retornada na primeira pagina;
  - se existe proxima pagina.
- Network filtrado por `dseng` deve mostrar chamadas reais ou erro unico explicavel.
- Nao pode haver cascata de endpoints incompatíveis tentando esconder falha.

## Prioridade 2 - Carga E-BOM API-first

Problema que resolve:

O app precisa ler automaticamente a estrutura aberta, sem depender de Ctrl+A/Ctrl+C. O fluxo principal deve carregar E-BOM por API com pais e filhos.

Etapas:

1. Ajustar resolucao de contexto do Product Structure Explorer.
2. Resolver raiz real: EngItem/Physical Product conforme retorno validado no diagnostico.
3. Carregar filhos por EngInstance com paginacao real.
4. Preservar hierarquia pai/filho.
5. Preservar metadados por item: titulo, descricao, revisao, proprietario, tipo, maturidade e IDs.
6. Remover cascata de fallbacks dentro do fluxo principal.
7. Transformar Ctrl+A/Ctrl+C em fallback manual explicito.
8. Documentar diferenca entre dado vindo da API e dado vindo do fallback.

Teste para avancar:

- Caso 1 item com 2 corpos carrega sem quebrar estrutura.
- Caso 3 itens carrega 3/3.
- Caso 20 itens carrega incluindo pai e filhos.
- Caso 79 itens carrega incluindo raiz/pais/filhos e nao vira parcial silencioso.
- Colunas da E-BOM devem bater com Product Structure Explorer para os campos validados.
- Console nao deve mostrar 404/406 em cascata para estrutura.

## Prioridade 3 - Normalizador unico e fallback controlado

Problema que resolve:

Atualmente TSV/paste/snapshot podem criar raiz sintetica, alterar level e preencher metadados por regras paralelas. Isso causou pai sem revisao/proprietario e contagens inconsistentes.

Etapas:

1. Centralizar normalizacao em `bom-normalizer`.
2. Fazer API e fallback manual alimentarem o mesmo normalizador.
3. Remover decisoes de raiz de `FileImportService`, `BomSnapshot` e loaders.
4. Criar fixtures dos quatro casos reais.
5. Criar testes para:
  - raiz preservada;
  - filhos preservados;
  - revisao/proprietario do pai;
  - descricoes e tipos;
  - IDs sinteticos versus IDs reais.
6. Definir mensagens claras quando fallback manual nao contem ID real para 3D.

Teste para avancar:

- Fallback manual pode carregar os quatro casos sem alterar raiz/metadados.
- API e fallback produzem modelo normalizado com o mesmo contrato.
- O app identifica visualmente quando a origem e fallback.
- Nenhum modulo fora do normalizador decide sozinho inserir pai ou mover filhos.

## Prioridade 4 - Escala e UI para estruturas grandes

Problema que resolve:

O requisito e nao haver limite funcional de itens. O codigo atual possui limite de store e UI que nao foi desenhada para centenas de milhares de linhas.

Etapas:

1. Remover conceito de limite funcional fixo como criterio de sucesso.
2. Implementar paginação/lazy loading no store.
3. Implementar tabela virtualizada.
4. Controlar concorrencia de chamadas REST.
5. Adicionar cache por objeto e por relacao pai/filho.
6. Ignorar/cancelar resultados obsoletos quando usuario troca selecao.
7. Definir KPIs progressivos para estruturas grandes.

Teste para avancar:

- Os quatro casos reais continuam passando.
- Teste sintetico grande nao trava a UI.
- O app consegue mostrar estado progressivo: carregando, parcial controlado, completo, erro.
- Nenhuma carga grande deve congelar o dashboard.

## Prioridade 5 - 3DView proprio

Problema que resolve:

Selecionar item na E-BOM precisa mostrar 3D dentro da aplicacao. O caminho atual e 3DPlay/2D e nao atende o produto.

Etapas:

1. Separar painel de preview de `3DPlay`.
2. Criar pipeline de resolucao:

```text
linha E-BOM -> objeto real -> representation/3DShape/CAD Representation -> derived output/arquivo -> ticket/download -> viewer proprio
```

3. Pesquisar endpoints/documentacao para representation, derived output, tickets/FCS e formatos suportados.
4. Definir viewer Three.js ou alternativa conforme formato disponivel.
5. Criar cache por ID.
6. Criar estados UX:
  - nada selecionado;
  - resolvendo;
  - baixando;
  - renderizando;
  - sem geometria;
  - sem permissao;
  - erro.
7. Garantir que getpicture/thumbnail nao participa da carga E-BOM.

Teste para avancar:

- Clique em item com geometria mostra 3D real.
- Clique em item sem geometria mostra estado claro.
- Clique em item sem permissao mostra estado claro.
- Viewer nao depende do widget 3DPlay.
- Trocar selecao rapidamente nao mistura modelos.

## Prioridade 6 - Organizacao do repositorio e publicacao

Problema que resolve:

O repositorio precisa ficar menor, previsivel e facil de manter/publicar. Bundles gerados e arquivos legados dificultam revisao.

Etapas:

1. Definir politica de arquivos fonte versus bundle gerado.
2. Isolar historico/legado.
3. Remover caminhos fora do produto somente apos substituicao validada.
4. Atualizar README de publicacao GitHub Pages.
5. Criar checklist de teste antes de publicar.
6. Documentar troubleshooting de 3DX: WAFData, Compass, 3DSpace, dseng, permissao e CORS.

Teste para avancar:

- Build/publicacao reproduzivel.
- README orienta o uso como Additional App.
- Arquivos legados nao confundem o fluxo principal.
- GitHub Pages carrega a versao correta.

## Ordem recomendada

1. Prioridade 0 - congelar arquitetura e matriz.
2. Prioridade 1 - diagnostico API isolado.
3. Prioridade 2 - carga E-BOM API-first.
4. Prioridade 3 - normalizador unico e fallback controlado.
5. Prioridade 4 - escala e UI para estruturas grandes.
6. Prioridade 5 - 3DView proprio.
7. Prioridade 6 - organizacao/publicacao.

Motivo da ordem:

O 3DView depende de E-BOM confiavel e IDs reais. A escala depende de API paginada. A organizacao final depende de saber o que sera mantido. Portanto, a primeira entrega tecnica precisa ser diagnostico API isolado e carga E-BOM API-first, sem novos atalhos.
