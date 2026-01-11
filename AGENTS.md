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
