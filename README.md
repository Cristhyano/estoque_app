# Estoque API

API simples em Node.js para cadastro de produtos de estoque.

## Requisitos

- Node.js 18+

## Instalacao

```bash
npm install
```

## Executar

```bash
npm run dev
```

A API inicia em `http://localhost:3001`.

## Documentacao

Swagger em `http://localhost:3001/api-docs`.

## Endpoints

- `GET /products`
- `GET /products/:codigo`
- `GET /products/select`
- `POST /products`
- `PUT /products/:codigo`
- `DELETE /products/:codigo`

- `GET /config`
- `POST /config`
- `PUT /config`
- `DELETE /config`

- `POST /import/inventario`

- `GET /inventarios`
- `GET /inventarios/:id`
- `POST /inventarios`
- `PUT /inventarios/:id`
- `DELETE /inventarios/:id`

## Regras financeiras

- `preco_unitario` e salvo como inteiro.
- O fator de conversao fica em `/config` (padrao 100).
- Exemplo: `preco_unitario = 10000` e `fator_conversao = 100` representa 100,00.
- As respostas de produtos incluem `preco_decimal` calculado.
- A importacao usa `resources/inventario.csv`.

## Filtros na listagem

`GET /products` aceita filtros simples por query string:

- `codigo` (exato)
- `nome` (contém, case-insensitive)
- `quantidade_min`, `quantidade_max`
- `preco_min`, `preco_max` (inteiro armazenado)
- `preco_decimal_min`, `preco_decimal_max` (decimal convertido pelo fator)
- `page`, `limit` (paginacao opcional)

`GET /inventarios` tambem aceita `page` e `limit`.

### Exemplo de cadastro

```bash
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "P001",
    "nome": "Teclado",
    "quantidade": 10,
    "preco_unitario": 10000
  }'
```
