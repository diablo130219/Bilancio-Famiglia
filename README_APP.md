# Bilancio Famiglia — APP V1

Questa versione mantiene integralmente il design e la logica della V18 e aggiunge:

- PWA installabile da browser
- icona e modalità standalone
- service worker per la shell dell'app
- supporto safe-area per iPhone
- configurazione Capacitor per Android e iOS
- Supabase invariato

## Deploy web / PWA

Usa esattamente lo stesso deploy Render già configurato:

```bash
npm install
npm run build
```

Publish directory:

```text
dist
```

Dopo il deploy, da Android puoi usare **Installa app / Aggiungi a schermata Home**.
Su iPhone: Safari → Condividi → **Aggiungi alla schermata Home**.

## Android con Capacitor

Su un PC con Node.js + Android Studio:

```bash
npm install
npm run build
npm run cap:add:android
npm run cap:sync
npm run cap:open:android
```

Dopo la prima creazione della cartella Android, per gli aggiornamenti:

```bash
npm run build
npx cap sync android
npx cap open android
```

## iOS con Capacitor

Serve macOS + Xcode:

```bash
npm install
npm run build
npm run cap:add:ios
npm run cap:sync
npm run cap:open:ios
```

## Variabili Supabase

Mantieni su Render / ambiente locale:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Non inserire chiavi service-role nel frontend.
