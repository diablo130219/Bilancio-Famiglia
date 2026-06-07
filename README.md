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


## V12.1 Fix calcoli e cloud

- Il riquadro a destra non mostra più -82 se la disponibilità reale è 180.
- "Disponibilità dopo tutto" usa la stessa logica della disponibilità reale.
- Stato Supabase visibile anche in alto.
- Cloud card mostra lo stato reale: Cloud attivo / Salvataggio cloud / Errore cloud.


## V12.2 Centro controllo

- Il riquadro grande in alto mostra "Centro controllo mese".
- Il valore principale è la disponibilità dopo tutti gli impegni.
- Le uscite già fatte restano visibili come dato secondario nella griglia.


## V12.3 Rifiniture finali

- Tolto doppione: la card alta ora mostra il centro controllo, la card piccola mostra il saldo fondi attuale.
- Pannello destro rinominato in Margine gestibile.
- Card Cloud più utile: mostra anche quante voci sono salvate.
- Mese migliore mostra mese + anno.
- Glow dinamico sul riquadro principale in base alla situazione.
