# Bilancio Famiglia Premium V11.2

Versione pulita per Render.

## Render

Static Site:

- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Root Directory: vuoto

## Environment Variables

Aggiungi su Render:

- `NODE_VERSION` = `22`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Nota importante

Non usare `npm ci` con questa versione.
Non caricare `package-lock.json`.
Render deve installare da zero con `npm install`.
