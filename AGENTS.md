# AGENTS.md

## Contexto da conversa
- Objetivo: reorganizar o front, componentizar a tabela de produtos, adicionar filtros completos da API e implementar paginacao; refatorar a API em arquitetura minima.
- Preferencia do usuario: componentes da tabela separados, mas em um unico arquivo (nao em varios arquivos).
- Status: filtros/paginacao e importacao via dialog implementados; API com upload e regra de codigo/codigo_barras.

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

## Implementacoes feitas
- Formulario completo de filtros ligado ao estado em `src/pages/ProductList.tsx`.
- Reset de pagina ao alterar filtros/limit.
- Controles de paginacao (Anterior/Proxima + inputs de page/limit).
- Query monta URL com todos os filtros e paginacao em `src/templates/ProductTable.tsx`.
- React Query configurado em `src/App.tsx`.
- Componentes de tabela consolidados em um unico arquivo.
- API refatorada para arquitetura minima com `routes/`, `controllers/`, `utils/`, `services/` e `swagger/`.

## Decisoes/importantes
- Evitar caracteres nao ASCII sempre que possivel.
- Sem dividir componentes de tabela em varios arquivos (pedido do usuario).

## Commit
- `feat(ui): add product filters and pagination` (repo `estoque_ui`).

## Possiveis proximos passos
- Ajustar layout dos filtros/paginacao em grid.
- Tipar retorno do endpoint (remover `any`).
- Adicionar UX (botao limpar filtros, estados vazios, etc.).
