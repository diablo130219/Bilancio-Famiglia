# V12.5.4 Contascatti - Consumo giornaliero

Correzioni:
- nello storico il consumo mostra il consumo della giornata
- aggiunta colonna Totale progressivo
- il riepilogo usa l'ultima lettura salvata se Lettura attuale è 0

Esempio:
- iniziale 20
- 03/06 lettura 39 => consumo giorno 19
- 04/06 lettura 49,70 => consumo giorno 10,70
- 05/06 lettura 62,50 => consumo giorno 12,80
- 06/06 lettura 74 => consumo giorno 11,50

Render:
- Build Command: npm install && npm run build
- Publish Directory: dist
- Root Directory: vuoto
