# Estoque Desktop

Wrapper desktop do front-end usando Electron. O backend roda localmente ao abrir o app.

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

Se quiser impedir o Electron de iniciar a API automaticamente:

```bash
set START_LOCAL_API=0
npm run dev
```

Para testar usando o build (sem Vite):

```bash
npm --prefix ../web run build
npm run start
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
