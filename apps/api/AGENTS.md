# Backend Agent

## Escopo

- Manter e evoluir a API de estoque (Node/Express).
- Garantir validacoes, consistencia de dados e documentacao.
- Preservar compatibilidade dos endpoints existentes.

## Padroes

- Respostas JSON consistentes.
- Validar entrada e retornar erros claros.
- Preferir numeros inteiros para valores financeiros.
- Separar responsabilidades quando o arquivo crescer (rotas/servicos/utils).

## Checklist rapido

- Atualizar Swagger e README ao adicionar endpoints.
- Adicionar validacoes de entrada e casos de erro.
- Atualizar dados de exemplo/seed quando necessario.

## Execucao local

```bash
cd estoque_api
npm install
npm run dev
```

## Testes

- Sem suite automatizada no momento.
- Validar manualmente via Swagger em `/api-docs`.

## Arquitetura minima

- `server.js`: wiring da API (middlewares + routers).
- `routes/`: declaracao das rotas.
- `controllers/`: handlers das rotas.
- `utils/`: validacoes, filtros, parsing e persistencia em JSON.
- `services/`: logica de importacao.
- `swagger/`: setup e schemas do Swagger.

## Estado atual da API

- Base: Node/Express com Swagger e CORS para `http://localhost:5173`.
- Persistencia em JSON: `data/products.json`, `data/config.json`, `data/inventarios.json`, `data/produto_inventario.json`.
- Financeiro: `preco_unitario` e inteiro; respostas incluem `preco_decimal` (calculado por `fator_conversao`).
- Configuracoes: CRUD em `/config` (padrao `fator_conversao = 100`).
- Importacao: `POST /import` detecta PDF/CSV e faz upsert; `/import/produtos` e `/import/inventario` continuam.
- Regra de codigo: se `codigo` tiver mais de 6 caracteres, entra em `codigo_barras`; `codigo` curto fica em `codigo`.
- PDF: codigo do produto e extraido do inicio do nome (ate 6 digitos); barcode usa o campo de codigo do PDF quando tiver mais de 6.
- CSV: codigo vem da coluna do arquivo; nome nao e usado para extrair codigo.
- Upsert: tenta casar por nome (normalizado, removendo digitos iniciais) antes de `codigo`/`codigo_barras`.
- Importacao usa `multer` em memoria e `pdf-parse` para PDF.
- Produtos: CRUD em `/products`; filtro por `codigo`, `codigo_barras`, `nome`, `quantidade_min/max`, `preco_min/max`, `preco_decimal_min/max`.
- Paginacao opcional: `page` e `limit` em `/products` e `/inventarios`.
- Select: `GET /products/select?codigo=...` retorna `codigo` e `nome`.
- Inventarios (conferencia): CRUD em `/inventarios` com `inicio`, `fim`, `status`.
- Inventarios: `PATCH /inventarios/aberto/fechar` finaliza o inventario aberto.
- ProdutoInventario: `GET /produto-inventario/aberto` lista itens do inventario aberto; `POST /produto-inventario` incrementa quantidade usando codigo ou codigo_barras.
- Relacionamentos persistem em `data/produto_inventario.json` e inventario aberto e criado automaticamente.
- Seed: arquivo `seed.json` com 100 produtos de teste.
