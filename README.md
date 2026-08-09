# Bilancio Famiglia — versione zero-based

Questa versione parte da zero ogni mese.

## Flusso
1. Inserisci i fondi disponibili (es. Giulia, Extra, Residuo banca).
2. Inserisci le spese/st laterali del mese e assegna ognuna a un fondo.
3. Registra i pagamenti: il saldo reale del fondo scala automaticamente.
4. La disponibilità libera mostra ciò che rimane dopo aver coperto tutte le spese previste.
5. A fine mese puoi portare i residui reali al mese successivo senza copiare le spese.

I dati vengono salvati nel browser con una nuova chiave locale, separata dalle versioni precedenti.


## Chiusura mese reversibile (V6)
La chiusura mensile salva uno snapshot del mese di destinazione prima del trasferimento. Se la chiusura viene eseguita per errore, il pulsante “Annulla chiusura” ripristina il mese successivo allo stato precedente. Lo stato di chiusura e lo snapshot vengono sincronizzati tramite lo stesso store Supabase.
