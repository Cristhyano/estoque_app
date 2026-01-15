# Estoque Monorepo

Single repo with a shared frontend for web and desktop targets.

## Structure

- apps/web: Vite + React frontend (source of truth)
- apps/desktop: Electron wrapper
- apps/api: backend API

## Dev

- npm run dev:web
- npm run dev:desktop
- npm run dev:api

## Build

- npm run build:web
- npm run build:desktop

Desktop dev uses the Vite dev server. Production loads apps/web/dist.
