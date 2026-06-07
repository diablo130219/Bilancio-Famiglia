# Bilancio Famiglia - Render Fix

Questa versione è la V12.5 originale corretta SOLO per il deploy Render.

## Render

Static Site:

- Root Directory: vuoto
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

## Environment

Rimuovi:
- NODE_VERSION

Non serve `.nvmrc`.
Non serve `package-lock.json`.

## Importante

Questa versione mantiene la struttura React/Vite normale.
Non è una versione single-file.
