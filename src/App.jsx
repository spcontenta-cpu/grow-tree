import React, { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import clsx from "clsx";

/**
 * Simple nutrition DB (per 100g unless noted)
 * Values are approximate to enable offline calculation.
 */
const FOODS = {
  "chicken_breast_cooked": { label: "Chicken (cooked)", protein: 31, carbs: 0, fat: 3.6, kcal: 165, unit: "g" },
  "egg_boiled": { label: "Egg (boiled)", protein: 13, carbs: 1, fat: 11, kcal: 155, unit: "g" }, // 100g ≈ ~2 eggs
  "walnuts": { label: "Walnuts", protein: 15, carbs: 14, fat: 65, kcal: 654, unit: "g" },
  "cashews": { label: "Cashews", protein: 18, carbs: 30, fat: 44, kcal: 553, unit: "g" },
  "almonds": { label: "Almonds", protein: 21, carbs: 22, fat: 50, kcal: 579, unit: "g" },
  "dates": { label: "Dates", protein: 2, carbs: 75, fat: 0.5, kcal: 282, unit: "g" },
  "raisins": { label: "Raisins", protein: 3, carbs: 79, fat: 0.5, kcal: 299, unit: "g" },
  "chana_boiled": { label: "Chana (boiled)", protein: 9, carbs: 27, fat: 3, kcal: 164, unit: "g" },
  "peanuts_roasted": { label: "Peanuts (roasted)", protein: 25, carbs: 16, fat: 49, kcal: 585, unit: "g" },
};

/** plant stages */
const PLANT_STAGES = [
  { key: 0, name: "Seed", emoji: "🌱" },
  { key: 1, name: "Sprout", emoji: "🌿" },
  { key: 2, name: "Small Plant", emoji: "🪴" },
  { key: 3, name: "Bush", emoji: "☘️" },
  { key: 4, name: "Young Tree", emoji: "🌳" },
  { key: 5, name: "Blooming Tree", emoji: "🌸🌳" },
];

/** Zustand store */
const useApp = create((set, get) => ({
  user: null,
  dayIndex: 1, // starts from Day 1
  plantStage: 0,
  streak: 0,
  checklist: {
    meals: { breakfast: false, lunch: false, dinner: false, snacks: false },
    waterMl: 0,
    steps: 0,
    workout: { warmup: false, main: false, cooldown: false },
    study: { ai1: false, ai2: false, aws1: false, aws2: false },
  },
  journal: "",
  photoDataUrl: "",
  foods: [], // {id, foodKey, grams}
  targets: { protein: 150, carbs: 190, fat: 58, kcal: 1850, waterMl: 3500, steps: 10000 },

  login: (nameOrEmail) => set({ user: { id: "local", name: nameOrEmail } }),
  logout: () => set({ user: null }),

  addWater: (ml) => set((s) => ({ checklist: { ...s.checklist, waterMl: Math.max(0, s.checklist.waterMl + ml) } })),
  setSteps: (steps) => set((s) => ({ checklist: { ...s.checklist, steps: Math.max(0, steps|0) } })),
  toggleCheck: (path) => set((s) => {
    const next = JSON.parse(JSON.stringify(s.checklist));
    // path like "meals.breakfast"
    const segs = path.split(".");
    let cur = next;
    for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
    cur[segs[segs.length - 1]] = !cur[segs[segs.length - 1]];
    return { checklist: next };
  }),

  addFood: (foodKey, grams) =>
    set((s) => ({ foods: [...s.foods, { id: crypto.randomUUID(), foodKey, grams: Number(grams) || 0 }] })),
  removeFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),
  setJournal: (txt) => set({ journal: txt }),
  setPhoto: (dataUrl) => set({ photoDataUrl: dataUrl }),

  /** Calculate totals from foods */
  totals: () => {
    const foods = get().foods;
    let protein = 0, carbs = 0, fat = 0, kcal = 0;
    for (const f of foods) {
      const info = FOODS[f.foodKey];
      if (!info) continue;
      const factor = (f.grams || 0) / 100;
      protein += info.protein * factor;
      carbs += info.carbs * factor;
      fat += info.fat * factor;
      kcal += info.kcal * factor;
    }
    return { protein, carbs, fat, kcal };
  },

  resetDaily: () => set({
    checklist: {
      meals: { breakfast: false, lunch: false, dinner: false, snacks: false },
      waterMl: 0,
      steps: 0,
      workout: { warmup: false, main: false, cooldown: false },
      study: { ai1: false, ai2: false, aws1: false, aws2: false },
    },
    journal: "",
    photoDataUrl: "",
    foods: [],
  }),

  /** Next day logic: grow or wither */
  nextDay: () => set((s) => {
    const allMealsDone = Object.values(s.checklist.meals).every(Boolean);
    const waterOk = s.checklist.waterMl >= s.targets.waterMl;
    const stepsOk = s.checklist.steps >= s.targets.steps;
    const workoutOk = Object.values(s.checklist.workout).every(Boolean);
    const studyOk = Object.values(s.checklist.study).every(Boolean);

    const allDone = allMealsDone && waterOk && stepsOk && workoutOk && studyOk;
    let plantStage = s.plantStage;
    let streak = s.streak;
    if (allDone) {
      streak += 1;
      plantStage = Math.min(PLANT_STAGES.length - 1, plantStage + 1);
    } else {
      streak = 0;
      plantStage = 0; // wither → back to seed
    }

    return {
      dayIndex: s.dayIndex + 1,
      plantStage,
      streak,
      checklist: {
        meals: { breakfast: false, lunch: false, dinner: false, snacks: false },
        waterMl: 0,
        steps: 0,
        workout: { warmup: false, main: false, cooldown: false },
        study: { ai1: false, ai2: false, aws1: false, aws2: false },
      },
      journal: "",
      photoDataUrl: "",
      foods: [],
    };
  }),

  /** Persistence */
  load: () => {
    try {
      const raw = localStorage.getItem("gyt_state_v1");
      if (!raw) return;
      const data = JSON.parse(raw);
      set(data);
    } catch {}
  },
  save: () => set((s) => {
    localStorage.setItem("gyt_state_v1", JSON.stringify(s));
    return {};
  }),
}));

function useAutosave() {
  const save = useApp((s) => s.save);
  const state = useApp();
  useEffect(() => {
    save();
  }, [state]);
}

function StatCard({ label, value, unit, target, goodHigher = true }) {
  const pct = Math.min(100, Math.round((value / (target || 1)) * 100));
  const ok = goodHigher ? value >= target : value <= target;
  return (
    <div className="rounded-2xl p-4 bg-white shadow-soft">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value.toFixed ? value.toFixed(0) : value}{unit ? ` ${unit}` : ""}</div>
      {target != null && (
        <div className="mt-3">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className={clsx("h-2 rounded-full transition-all", ok ? "bg-emerald-500" : "bg-amber-500")} style={{ width: pct + "%" }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">Target: {target}{unit ? ` ${unit}` : ""}</div>
        </div>
      )}
    </div>
  );
}

function Plant() {
  const { plantStage, streak, dayIndex } = useApp((s) => ({ plantStage: s.plantStage, streak: s.streak, dayIndex: s.dayIndex }));
  const stage = PLANT_STAGES[plantStage] || PLANT_STAGES[0];
  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-200 p-6 shadow-soft">
      <div className="text-center text-6xl">{stage.emoji}</div>
      <div className="text-center font-semibold mt-2">{stage.name}</div>
      <div className="mt-2 text-center text-sm text-gray-600">Streak: <span className="font-semibold">{streak} days</span> • Day {dayIndex}</div>
    </div>
  );
}

function Section({ title, children, right }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 py-1 cursor-pointer">
      <input type="checkbox" className="size-4" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function Water() {
  const { checklist, addWater, targets } = useApp((s) => ({ checklist: s.checklist, addWater: s.addWater, targets: s.targets }));
  return (
    <Section title="Water Intake">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Water" value={checklist.waterMl} unit="ml" target={targets.waterMl} />
        <div className="flex flex-wrap gap-2 items-start">
          {[250, 500, 1000].map(ml => (
            <button key={ml} onClick={() => addWater(ml)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition">
              +{ml} ml
            </button>
          ))}
          <button onClick={() => addWater(-250)} className="px-3 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition">-250 ml</button>
        </div>
      </div>
    </Section>
  );
}

function Steps() {
  const { checklist, setSteps, targets } = useApp((s) => ({ checklist: s.checklist, setSteps: s.setSteps, targets: s.targets }));
  return (
    <Section title="Steps Goal">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Steps" value={checklist.steps} target={targets.steps} />
        <div className="flex items-center gap-2">
          <input type="number" className="border rounded-xl px-3 py-2 w-40" value={checklist.steps} onChange={(e)=>setSteps(Number(e.target.value || 0))} />
          <button onClick={()=>setSteps(targets.steps)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl">Set 10k</button>
        </div>
      </div>
    </Section>
  );
}

function Meals() {
  const { checklist, toggleCheck } = useApp((s) => ({ checklist: s.checklist, toggleCheck: s.toggleCheck }));
  return (
    <Section title="Meals">
      <div className="grid gap-1">
        <Checkbox checked={checklist.meals.breakfast} onChange={()=>toggleCheck("meals.breakfast")} label="Breakfast" />
        <Checkbox checked={checklist.meals.lunch} onChange={()=>toggleCheck("meals.lunch")} label="Lunch" />
        <Checkbox checked={checklist.meals.dinner} onChange={()=>toggleCheck("meals.dinner")} label="Dinner" />
        <Checkbox checked={checklist.meals.snacks} onChange={()=>toggleCheck("meals.snacks")} label="Snacks" />
      </div>
    </Section>
  );
}

function Workout() {
  const { checklist, toggleCheck } = useApp((s) => ({ checklist: s.checklist, toggleCheck: s.toggleCheck }));
  return (
    <Section title="Workout (Evening)">
      <div className="grid gap-1">
        <Checkbox checked={checklist.workout.warmup} onChange={()=>toggleCheck("workout.warmup")} label="Warm-up" />
        <Checkbox checked={checklist.workout.main} onChange={()=>toggleCheck("workout.main")} label="Main workout" />
        <Checkbox checked={checklist.workout.cooldown} onChange={()=>toggleCheck("workout.cooldown")} label="Cool down / stretch" />
      </div>
    </Section>
  );
}

function Study() {
  const { checklist, toggleCheck } = useApp((s) => ({ checklist: s.checklist, toggleCheck: s.toggleCheck }));
  return (
    <Section title="Study (AI & AWS)">
      <div className="grid gap-1">
        <Checkbox checked={checklist.study.ai1} onChange={()=>toggleCheck("study.ai1")} label="AI Session 1" />
        <Checkbox checked={checklist.study.ai2} onChange={()=>toggleCheck("study.ai2")} label="AI Session 2" />
        <Checkbox checked={checklist.study.aws1} onChange={()=>toggleCheck("study.aws1")} label="AWS Session 1" />
        <Checkbox checked={checklist.study.aws2} onChange={()=>toggleCheck("study.aws2")} label="AWS Session 2" />
      </div>
    </Section>
  );
}

function FoodLogger() {
  const { foods, addFood, removeFood, totals, targets } = useApp((s) => ({
    foods: s.foods, addFood: s.addFood, removeFood: s.removeFood, totals: s.totals, targets: s.targets
  }));
  const [foodKey, setFoodKey] = useState(Object.keys(FOODS)[0]);
  const [grams, setGrams] = useState(100);

  const t = totals();

  return (
    <Section title="Food & Nutrition Logger" right={<div className="text-sm text-gray-500">Targets: {targets.protein}g P • {targets.carbs}g C • {targets.fat}g F • {targets.kcal} kcal</div>}>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm mb-1">Food</label>
          <select className="border rounded-xl px-3 py-2" value={foodKey} onChange={(e)=>setFoodKey(e.target.value)}>
            {Object.entries(FOODS).map(([key, v]) => (
              <option key={key} value={key}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Grams</label>
          <input type="number" className="border rounded-xl px-3 py-2 w-28" value={grams} onChange={(e)=>setGrams(Number(e.target.value || 0))} />
        </div>
        <button onClick={()=>addFood(foodKey, grams)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">Add</button>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Food</th>
              <th>Grams</th>
              <th>P (g)</th>
              <th>C (g)</th>
              <th>F (g)</th>
              <th>kcal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {foods.map((f) => {
              const info = FOODS[f.foodKey];
              const factor = (f.grams || 0) / 100;
              return (
                <tr key={f.id} className="border-t">
                  <td className="py-2">{info.label}</td>
                  <td>{f.grams}</td>
                  <td>{(info.protein*factor).toFixed(1)}</td>
                  <td>{(info.carbs*factor).toFixed(1)}</td>
                  <td>{(info.fat*factor).toFixed(1)}</td>
                  <td>{(info.kcal*factor).toFixed(0)}</td>
                  <td><button onClick={()=>removeFood(f.id)} className="text-emerald-700 hover:underline">Remove</button></td>
                </tr>
              );
            })}
            {foods.length === 0 && (
              <tr><td colSpan="7" className="text-center py-4 text-gray-500">No foods added yet.</td></tr>
            )}
          </tbody>
          <tfoot className="font-semibold">
            <tr className="border-t">
              <td className="py-2">Totals</td>
              <td>-</td>
              <td>{t.protein.toFixed(1)}</td>
              <td>{t.carbs.toFixed(1)}</td>
              <td>{t.fat.toFixed(1)}</td>
              <td>{t.kcal.toFixed(0)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Section>
  );
}

function Journal() {
  const { journal, setJournal, photoDataUrl, setPhoto } = useApp((s)=>({ journal: s.journal, setJournal: s.setJournal, photoDataUrl: s.photoDataUrl, setPhoto: s.setPhoto }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result.toString());
    reader.readAsDataURL(file);
  };

  return (
    <Section title="Daily Journal & Picture">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Write your updates</label>
          <textarea value={journal} onChange={(e)=>setJournal(e.target.value)} rows={6} className="border rounded-xl px-3 py-2" placeholder="How did your day go? What did you learn?"></textarea>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Picture of the day</label>
          <input type="file" accept="image/*" onChange={onFile} />
          {photoDataUrl && (
            <img src={photoDataUrl} alt="pic" className="mt-2 rounded-xl max-h-56 object-cover border" />
          )}
        </div>
      </div>
    </Section>
  );
}

function Header() {
  const { user, login, logout, nextDay, load } = useApp((s)=>({ user: s.user, login: s.login, logout: s.logout, nextDay: s.nextDay, load: s.load }));
  const [name, setName] = useState("Kishore");
  useEffect(()=>{ load(); },[]);
  useAutosave();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-3xl">🌳</div>
        <div>
          <div className="font-bold text-lg">Grow Your Tree</div>
          <div className="text-xs text-gray-500">Daily health • study • hydration</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="text-sm text-gray-600">Hi, {user.name}</span>
            <button onClick={nextDay} className="px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-soft hover:bg-emerald-700">Next Day →</button>
            <button onClick={logout} className="px-3 py-2 bg-gray-200 rounded-xl hover:bg-gray-300">Logout</button>
          </>
        ) : (
          <div className="flex gap-2">
            <input value={name} onChange={(e)=>setName(e.target.value)} className="border rounded-xl px-3 py-2" placeholder="Enter name or email"/>
            <button onClick={()=>login(name)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-soft hover:bg-emerald-700">Login</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App(){
  const totals = useApp((s)=>s.totals)();
  const targets = useApp((s)=>s.targets);
  const checklist = useApp((s)=>s.checklist);
  const allMealsDone = Object.values(checklist.meals).every(Boolean);
  const waterOk = checklist.waterMl >= targets.waterMl;
  const stepsOk = checklist.steps >= targets.steps;
  const workoutOk = Object.values(checklist.workout).every(Boolean);
  const studyOk = Object.values(checklist.study).every(Boolean);
  const allDone = allMealsDone && waterOk && stepsOk && workoutOk && studyOk;

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <Header />

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Plant />
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Protein" value={totals.protein} unit="g" target={targets.protein} />
                <StatCard label="Carbs" value={totals.carbs} unit="g" target={targets.carbs} />
                <StatCard label="Fat" value={totals.fat} unit="g" target={targets.fat} />
                <StatCard label="Calories" value={totals.kcal} unit="" target={targets.kcal} />
              </div>
            </div>

            <FoodLogger />
            <Journal />
          </div>

          <div className="space-y-4">
            <Meals />
            <Water />
            <Steps />
            <Workout />
            <Study />
            <div className={clsx("rounded-2xl p-4", allDone ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-900")}>
              <div className="font-semibold">{allDone ? "All goals completed! Your plant will grow 🌿" : "Complete all goals to grow your plant today 🌱"}</div>
              <div className="text-sm mt-1">Meals ✓ Water ✓ Steps ✓ Workout ✓ Study ✓</div>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-gray-500 pt-6 pb-3">Made for Kishore • Works on mobile & web • Data saved locally</footer>
      </div>
    </div>
  );
}
