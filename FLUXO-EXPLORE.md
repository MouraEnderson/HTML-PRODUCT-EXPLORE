# Fluxo EXPLORE + PRODUCTEXPLORE

## O que você quer

1. **Aba EXPLORE** → Product Structure Explorer → você carrega o produto (ex.: Drone)
2. **Aba PRODUCTEXPLORE** → Web Page Reader (HTML GitHub) → mostra dashboards desse mesmo produto

## Limitação técnica (importante)

O HTML no **GitHub** roda em outro domínio (`github.io`). O navegador **bloqueia** leitura automática do widget Explorer na outra aba.

Por isso o botão **Buscar** não lista itens como o Pesquisar nativo — são sistemas diferentes.

## O que funciona hoje

| Passo | Ação |
|-------|------|
| 1 | Carregue o produto na aba **EXPLORE** |
| 2 | Aba **PRODUCTEXPLORE** → **Sincronizar com Explorer** (se o tenant enviar evento) |
| 3 | Se não sincronizar: copie **Physical ID** do Explorer → cole no campo → **Carregar objeto** |
| 4 | Clique **Atualizar** no HTML |

## Melhor configuração (recomendado)

Coloque na **mesma aba** do dashboard:

- Widget **Product Structure Explorer**
- Widget **Web Page Reader** (mesmo HTML)

Assim a plataforma costuma compartilhar seleção entre widgets.

## Solução definitiva (BOM completa automática)

Publicar o HTML no **3DSpace** (`us1-space`), não só GitHub — mesmo domínio = APIs ENOVIA + estrutura filha.
