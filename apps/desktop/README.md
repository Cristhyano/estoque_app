# Estoque Desktop

Wrapper desktop do front-end usando Electron. O backend continua rodando na API existente.

## Desenvolvimento

1) Inicie a API (porta 3001).
2) Inicie o front:

```bash
npm --prefix ../web run dev
```

3) Rode o Electron apontando para o Vite:

```bash
npm install
npm run dev
```

## Build/Distribuicao

1) Gere o build do front:

```bash
npm --prefix ../web run build
```

2) Gere o instalador (Windows):

```bash
npm install
npm run dist
```

O instalador sera gerado em `release/`.
