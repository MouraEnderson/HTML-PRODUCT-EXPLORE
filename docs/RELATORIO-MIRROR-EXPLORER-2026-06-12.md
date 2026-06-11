# Relatório técnico — Mirror Explorer vs Full BOM API

Data: 2026-06-12 · Atualizado: 2026-06-13  
Build de referência: `bom20260613a`

## Marco técnico (2026-06-13)

**Mirror Explorer via GitHub Pages encerrado como sprint ativo.** O produto opera em **Full BOM API** com mensagens DEC-014. Mirror Explorer fica no **roadmap**, dependente de contrato oficial Dassault/tenant (`ENOPSTR_*`) ou widget nativo mesma origem.

## Conclusão

Mirror Explorer **não é viável** em widget GitHub Pages no 3DDashboard: iframe irmão cross-origin + ausência de API pública para árvore expandida/carregada.

Full BOM API **é viável** via WAFData + backend + `dseng`/`EngInstance`, apresentado como **estrutura reconstruída via API ENOVIA** — independente do estado visual do Explorer.

## Roadmap Mirror Explorer

Para viabilizar mirror real: validar com Dassault/tenant contrato oficial ou API interna para nós expandidos/carregados. Sem contrato: widget nativo mesma origem com API oficial.

Ver `docs/DECISOES-TECNICAS.md` DEC-014.
