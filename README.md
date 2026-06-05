# Bilancio Famiglia React V2

Versione migliorata:
- tutti gli importi partono da zero
- tutte le spese sono modificabili
- salvataggio automatico
- mesi indipendenti
- avviso se una spesa/rata pagata non ha fonte
- stati colorati

## Render

Static Site:
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`


## V6.1
Correzione stabilità: compatibile con dati salvati dalle versioni precedenti nel browser.


## Supabase cloud

Su Render aggiungi queste variabili ambiente:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

La tabella richiesta è `bilanci`.
Se il salvataggio cloud dà errore, esegui in Supabase SQL Editor:

```sql
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.bilanci to anon, authenticated;
```


## V8 Cloud Plus

Migliorie:
- Cloud Supabase già supportato
- pannello cloud e backup JSON
- riepilogo annuale sintetico
- storico mesi leggibile
- UI più professionale
- preparazione per login futuro

Variabili Render:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY


## V9 REALE

Modifiche visibili:
- nuovo Centro controllo mese
- rimosso blocco "Salvataggio automatico" inutile
- budget strip con spese variabili e residuo
- analisi finanziaria con consiglio del mese
- riepilogo annuale compatto solo sui mesi usati
- backup sempre disponibile


## V10 NO DUPLICATI
- Rimosso badge Cloud attivo sovrapposto ad Azzera mese
- Pannello destro trasformato in Analisi del mese
- Eliminati doppioni con dashboard alta
- Margine finale previsto, categoria più usata, fondo più usato, budget usato e tasso libertà
