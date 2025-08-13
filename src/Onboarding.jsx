import React, { useState } from 'react';
import { useApp } from './store';
export default function Onboarding({ onDone }){
  const setTargets = useApp((s)=>s.setTargets);
  const [weight, setWeight] = useState(83);
  const [height, setHeight] = useState(174);
  const [age, setAge] = useState(25);
  const [sex, setSex] = useState('male');
  const [activity, setActivity] = useState('light');
  function calcBMR(w,h,age,sex){
    if(sex==='male') return 10*w + 6.25*h - 5*age + 5;
    return 10*w + 6.25*h - 5*age - 161;
  }
  function activityFactor(a){ switch(a){ case 'sedentary': return 1.2; case 'light': return 1.375; case 'moderate': return 1.55; case 'active': return 1.725; case 'very': return 1.9; default: return 1.375; } }
  function submit(){ const bmr = calcBMR(weight,height,age,sex); const tdee = Math.round(bmr * activityFactor(activity)); const deficit = Math.round(tdee * 0.85); const proteinG = Math.round(weight * 1.8); const fatG = Math.round((deficit*0.28)/9); const carbsG = Math.max(0, Math.round((deficit - (proteinG*4 + fatG*9))/4)); const micros = { vitaminC: sex==='male'?90:75, iron: sex==='male'?8:18, calcium:1000, zinc:11, vitaminD:600, omega3_g:1.1, fiber:30 }; setTargets({ kcal:deficit, protein:proteinG, carbs:carbsG, fat:fatG, micros, waterMl:3500, steps:10000 }); onDone(); }
  return (<div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-soft"><h2 className="text-xl font-semibold mb-4">Welcome — quick setup</h2><div className="grid gap-3"><div><label className="text-sm">Weight (kg)</label><input type="number" value={weight} onChange={(e)=>setWeight(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2"/></div><div><label className="text-sm">Height (cm)</label><input type="number" value={height} onChange={(e)=>setHeight(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2"/></div><div className="grid grid-cols-3 gap-2"><div><label className="text-sm">Age</label><input type="number" value={age} onChange={(e)=>setAge(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2"/></div><div><label className="text-sm">Sex</label><select value={sex} onChange={(e)=>setSex(e.target.value)} className="w-full border rounded-xl px-3 py-2"><option value="male">Male</option><option value="female">Female</option><option value="other">Prefer not to say</option></select></div><div><label className="text-sm">Activity</label><select value={activity} onChange={(e)=>setActivity(e.target.value)} className="w-full border rounded-xl px-3 py-2"><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very">Very active</option></select></div></div><div className="flex justify-end"><button onClick={submit} className="px-4 py-2 bg-emerald-600 text-white rounded-xl">Save & Continue</button></div></div></div>);
}