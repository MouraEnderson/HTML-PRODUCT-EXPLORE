# Analise docs dseng x caso 50 itens

Data: 2026-06-05

Build analisado: `bom20260606zc`

Caso real: `CJ MESA 4BCS VP TOP 3DX`

## Resultado atual do teste

- Product Structure Explorer mostra `50 objetos`.
- Widget carrega `API 37/50`.
- `WAFData`, `SecurityContext`, `platformId`, `Compass getServiceUrl(3DSpace)` e `CSRF` estao OK.
- `3DSpace` correto:
  - `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia`
- `GET dseng:EngItem/prd-R1132100929518-01103695` retorna `404`.
- Busca UQL por `name:prd-R1132100929518-01103695` encontra o `VPMReference` real:
  - `63FC553465A62400699E0792000086AB`
- `GET dseng:EngItem/{id32}/dseng:EngInstance` retorna instancias diretas.
- Mesmo com `$expand=dseng:EngItem` e `$expand=dseng:referencedObject`, o payload de `EngInstance` continua mostrando a propria `VPMInstance`, sem o filho referenciado embutido.
- O app resolve cada `VPMInstance` pesquisando por label (`Tampo`, `Manipulo`, `Queimador`, etc.).
- Labels repetidos retornam varios `VPMReference` candidatos, tornando a resolucao ambigua.

## O que a documentacao/publicacoes confirmam

### 1. O caminho dseng e valido para Cloud

O material publico da DS CPE EMED lista `Engineering Web Services` / `ws3dx.dseng` com cobertura para `2024x FD02 (1.3.0)` e versoes posteriores. Isso confirma que `dseng` e a familia correta para Engineering Items em Cloud.

Impacto no projeto:

- A direcao `Additional App + WAFData + 3DSpace REST + dseng` continua correta.
- O problema atual nao parece ser "API inexistente"; e de identificador, mascara/expand ou endpoint de relacao.

### 2. A documentacao publica requer login 3DEXPERIENCE ID

O repositorio DS CPE EMED observa que a documentacao publica dos web services 3DEXPERIENCE requer `3DEXPERIENCE ID`.

Impacto no projeto:

- Algumas paginas FD02 nao sao totalmente acessiveis por busca publica.
- Para fechar contrato de endpoint, precisamos validar dentro da sessao logada e registrar a evidencia no nosso diagnostico.

### 3. Respostas de web services retornam colecoes em `member`

O material do SDK exemplifica `GET /resources/v1/modeler/dseng/dseng:EngItem/{ID}` retornando um objeto com `totalItems`, `member` e `nlsLabel`.

Impacto no projeto:

- Nosso parser `extractMembers()` esta alinhado com esse contrato.
- A presenca de `member` nao garante que a resposta trouxe o filho referenciado; pode trazer apenas a entidade pedida.

### 4. Mascara/atributos importam

O material do SDK destaca o conceito de `mask`: dependendo da mascara, a mesma chamada pode retornar atributos diferentes. Tambem informa limitacoes publicas em `$fields` e `$include` no SDK.

Impacto no projeto:

- Nossa tentativa de `$expand=dseng:EngItem` pode estar incompleta ou nao suportada nesse recurso.
- O fato de `EngInstance` nao embutir o filho pode ser comportamento esperado sem mascara/endpoint adequado.
- A proxima investigacao deve testar `mask`, `fields`, `include` ou o endpoint de expand especifico, nao continuar escolhendo candidatos por heuristica.

### 5. WAFData e o caminho correto no widget

Os exemplos publicos de custom widgets da DS CPE EMED mostram `WAFData.authenticatedRequest` para chamadas autenticadas a servicos 3DEXPERIENCE, e `proxifiedRequest` para cenarios de CORS contra backends externos.

Impacto no projeto:

- O uso de `WAFData.authenticatedRequest` esta correto.
- Os erros CORS de chamadas diretas com headers inadequados nao devem contaminar o fluxo principal.
- O app deve evitar header manual `x-csrf-token` em GET cross-origin se isso dispara preflight bloqueado.

## Matriz problema x documentacao x decisao

| Problema observado | Evidencia real | O que a documentacao/material sugere | Decisao tecnica |
|---|---|---|---|
| `prd-R...` direto retorna 404 em `dseng:EngItem/{ID}` | Direct GET falha, UQL `name:prd-R...` acha `id32` | `{ID}` do endpoint parece ser o ID interno do recurso, nao necessariamente o `name` cloud | Resolver raiz por UQL `name:prd-R...` e usar `id32` para chamadas de recurso |
| `EngInstance` retorna instancias, mas nao filho embutido | Payload de expand continua `VPMInstance` | Retorno `member` pode representar a entidade pedida; mascara/expand controla atributos | Nao assumir filho embutido. Testar masks/includes/endpoint expand |
| Loader usa busca por label para resolver filho | `Tampo`, `Manipulo`, `Queimador` retornam varios candidatos | Search retorna colecao; label nao e identidade unica | Marcar como fragilidade critica. Substituir por endpoint relacional ou criterio provado por diagnostico |
| Caso 20 funciona, caso 50 fica 37/50 | 20/20 e 37/50 | Estruturas simples toleram heuristica; estruturas com labels repetidos quebram | Nao usar sucesso do 20 como prova de arquitetura |
| Priorizar `prd-R...` nao alterou 37/50 | Build `zc` manteve parcial | O problema nao e apenas ranking global do candidato | Parar ranking por tentativa; medir arvore por candidato raiz e estrategia |
| Diagnostico mostra 404/400 de chamadas experimentais | Varios FAIL em endpoints diretos | Nem todo endpoint/probe e caminho suportado | Classificar falhas esperadas x bloqueadoras |
| 3DView nao funciona | IDs e relacoes ainda instaveis | 3D depende de resolver item real/representacao/derived output | Nao iniciar viewer 3D antes de E-BOM confiavel |

## Conclusao tecnica

O gargalo atual nao e mais `baseUrl`, `CSRF`, `WAFData`, nem limite de linhas.

O gargalo e relacional:

1. O Explorer conhece a relacao pai-filho real.
2. `dseng:EngInstance` retorna a instancia, mas nao esta entregando o filho referenciado no payload atual.
3. O app tenta reconstruir o filho por `label`.
4. Em estruturas com nomes repetidos, essa reconstrucao e ambigua e perde parte da arvore.

Portanto, insistir em:

- mudar peso de ranking,
- preservar duplicata,
- DOM fallback,
- ou auto-sync

nao resolve o problema central.

## Proximo diagnostico recomendado

Antes de alterar o loader principal, criar um diagnostico controlado para:

1. Coletar os candidatos raiz encontrados:
   - `63FC553465A62400699E0792000086AB`
   - `061FE4A5671C4C09835083EC53811400`
   - `8EA67E9CABA9488CB7BC423D41548B3B`
2. Para cada candidato, executar contagem recursiva limitada e paginada por `dseng:EngInstance`.
3. Para cada `VPMInstance`, testar estrategias de resolucao:
   - sem resolver filho, contar ocorrencia;
   - resolver por label;
   - resolver por label + `cestamp`;
   - resolver por label + melhor contagem de filhos;
   - testar endpoint `expand` se disponivel.
4. Registrar:
   - total de linhas por candidato;
   - filhos diretos;
   - quantidade de labels ambiguos;
   - ids escolhidos por estrategia;
   - onde a contagem deixa de bater com o Explorer.

## Criterio para voltar a implementar

So alterar o loader principal quando o diagnostico provar uma destas teses:

- um candidato raiz especifico reproduz os `50 objetos`;
- um endpoint/mask/expand retorna o filho real de cada `EngInstance`;
- a contagem do Explorer inclui objetos que nao sao `EngItem` e precisam ser buscados por outra familia, como representacoes/CAD/derived outputs.

Sem uma dessas provas, novas mudancas tendem a ser chute.
