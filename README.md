# Grow Your Tree v2

This is a ready-to-run React + Vite + Tailwind project scaffold for the "Grow Your Tree" habit tracker.
Features included:
- Onboarding collects weight, height, age, sex, activity and computes BMR/TDEE and targets.
- Offline food DB for quick macros; add foods with grams to compute totals.
- Firebase config placeholder (fill `src/firebaseConfig.js` to enable Auth & Firestore).
- PWA-ready build not included, but can be added.

## Run locally
1. Install Node.js (v18+ recommended)
2. Run:
```
npm install
npm run dev
```
3. Open http://localhost:5173

## Deploy to Netlify
- Push repo to GitHub and connect in Netlify. Set build command `npm run build` and publish directory `dist`.
- Make sure to add `FIREBASE_CONFIG` or replace `src/firebaseConfig.js` with real config before enabling Firebase features.

