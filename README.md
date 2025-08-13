# Grow Your Tree — PWA Habit & Health Tracker

A responsive React + Vite + Tailwind app that tracks:
- Meals + nutrition (protein, carbs, fat, calories) from a built-in offline food DB for chicken, eggs, nuts, dates, raisins, chana, peanuts.
- Water intake (3.5L goal, quick add buttons).
- Steps (10,000 goal).
- Workout (evening) — warm-up, main, cool down.
- Study sessions — AI & AWS.
- Daily journal + picture of the day.
- Gamified plant growth (seed → sprout → small plant → bush → tree). Completing all tasks in a day grows the plant; missing a day resets.

## Quick Start
```bash
npm install
npm run dev
```
Then open the URL shown (usually http://localhost:5173).

## Build
```bash
npm run build
npm run preview
```

## Notes
- All data is saved in `localStorage` automatically. Login just stores your name and keeps state.
- Click **Next Day** in the header to advance a day. If all daily goals are complete, the plant grows; otherwise, it resets.
- Tailwind is preconfigured.
- No external APIs needed — runs entirely offline.
