# PACCHETTO UNICO DA CARICARE SU GITHUB

Questa è la versione già compilata del sito.

## Su GitHub

Prima elimina TUTTO quello che c'è ora nel repository, soprattutto:

- src
- package.json
- package-lock.json
- vite.config.js
- render.yaml
- .nvmrc
- vecchi BUILD_LOG

Poi carica SOLO questi file/cartelle:

- index.html
- assets/
- README_CARICAMENTO.md

Non devi creare nessuna cartella manualmente se carichi anche la cartella assets.

## Su Render

Static Site:

- Build Command: lascia VUOTO
- Publish Directory: .

Non mettere:
npm install
npm run build
npm ci

## Supabase

Le credenziali Supabase sono già incorporate in questa build:
- progetto Supabase già collegato
- cloud attivo
- dati salvati nella tabella bilanci
