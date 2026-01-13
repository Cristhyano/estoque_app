# AGENTS.md

## Contexto da conversa
- Objetivo: organizar o front, componentizar tabela, adicionar filtros/paginacao e integrar importacao; API refatorada em arquitetura minima.
- Preferencia do usuario: componentes da tabela separados, mas em um unico arquivo (nao em varios arquivos).
- Status: dialog de importacao com upload e feedback; tabela com coluna de codigo_barras; API separada em routes/controllers/utils/services.

## Estrutura atual relevante
- `src/components/Table.tsx`: contem todos os componentes de tabela (Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell).
- `src/templates/ProductTable.tsx`: tabela que consome a API e renderiza os produtos.
- `src/pages/ProductList.tsx`: pagina com formulario de filtros e controles de paginacao.
- `src/components/Input.tsx` e `src/components/Divider.tsx`: componentes base.
- `..\estoque_api\server.js`: wiring da API.
- `..\estoque_api\routes/`: declaracao das rotas.
- `..\estoque_api\controllers/`: handlers das rotas.
- `..\estoque_api\utils/`: validacoes, filtros, parsing, persistencia.
- `..\estoque_api\services/`: importacao (PDF/CSV).
- `..\estoque_api\swagger/`: setup do Swagger.

## API e filtros disponiveis
Endpoint: `GET /products`
Filtros via query string:
- `codigo` (exato)
- `codigo_barras` (exato)
- `nome` (cont?m, case-insensitive)
- `quantidade_min`, `quantidade_max`
- `preco_min`, `preco_max` (inteiro armazenado)
- `preco_decimal_min`, `preco_decimal_max` (decimal convertido pelo fator)
Paginacao via query:
- `page` (inteiro)
- `limit` (inteiro)

Importacao:
- `POST /import` recebe PDF/CSV e decide o tipo automaticamente.
- `POST /import/produtos` e `POST /import/inventario` continuam validos.
- Regra de codigo: se `codigo` tiver mais de 5 caracteres vai para `codigo_barras`; `codigo` curto fica em `codigo`.
- PDF: codigo do produto vem do inicio do nome (ate 5 digitos); barcode vai para `codigo_barras`.
- CSV: codigo vem da coluna do arquivo; nome nao e usado para extrair codigo.
 - Upsert: cruza por nome normalizado (remove digitos iniciais) antes de `codigo`/`codigo_barras`.

## Implementacoes feitas
- Formulario completo de filtros ligado ao estado em `src/pages/ProductList.tsx`.
- Reset de pagina ao alterar filtros/limit.
- Controles de paginacao (Anterior/Proxima + inputs de page/limit).
- Query monta URL com todos os filtros e paginacao em `src/templates/ProductTable.tsx`.
- React Query configurado em `src/App.tsx`.
- Componentes de tabela consolidados em um unico arquivo.
- Dialog de importacao (Radix) com upload, feedback e bloqueio de fechamento durante importacao.
- Tabela com colunas separadas para `codigo` e `codigo_barras`.
- API refatorada para arquitetura minima com `routes/`, `controllers/`, `utils/`, `services/` e `swagger/`.

## Decisoes/importantes
- Evitar caracteres nao ASCII sempre que possivel.
- Sem dividir componentes de tabela em varios arquivos (pedido do usuario).

## Commit
- `feat(ui): add product filters and pagination` (repo `estoque_ui`).
- `feat(ui): import dialog and table updates` (repo `estoque_ui`).

## Possiveis proximos passos
- Ajustar layout dos filtros/paginacao em grid.
- Tipar retorno do endpoint (remover `any`).
- Adicionar UX (botao limpar filtros, estados vazios, etc.).
