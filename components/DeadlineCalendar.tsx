"use client";

import { useState } from "react";
import Link from "next/link";
import type { RequirementStatus } from "../lib/types";

type Entry = { id: string; name: string; date: Date; status: RequirementStatus };
export default function DeadlineCalendar({ entries }: { entries: Entry[] }) {
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selected, setSelected] = useState<number | null>(null);
  const days = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const visible = entries.filter(e => e.date.getFullYear() === month.getFullYear() && e.date.getMonth() === month.getMonth());
  const selectedEntries = selected === null ? visible : visible.filter(e => e.date.getDate() === selected);
  function move(delta: number) { setMonth(new Date(month.getFullYear(), month.getMonth()+delta, 1)); setSelected(null); }
  return <section className="v07-calendar" aria-label="Deadline calendar">
    <header><div><p className="v05-kicker">AT A GLANCE</p><h2>{month.toLocaleDateString("en-PH", {month:"long",year:"numeric"})}</h2></div><div className="v07-calendar-nav"><button type="button" onClick={() => move(-1)} aria-label="Previous month">←</button><button type="button" onClick={() => {const d=new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelected(null);}}>Today</button><button type="button" onClick={() => move(1)} aria-label="Next month">→</button></div></header>
    <div className="v07-calendar-grid" role="group" aria-label="Days of month">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span className="v07-weekday" key={d}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={`pad-${i}`} aria-hidden="true" />)}{Array.from({length:days},(_,i)=>{const n=i+1;const events=visible.filter(e=>e.date.getDate()===n);return <button type="button" key={n} className={selected===n?"selected":""} onClick={()=>setSelected(n)} aria-label={`${month.toLocaleDateString("en-PH",{month:"long"})} ${n}: ${events.length} deadline${events.length===1?"":"s"}`} aria-pressed={selected===n}><span>{n}</span>{events.length>0&&<b>{events.length}</b>}</button>})}</div>
    <div className="v07-calendar-events" aria-live="polite"><h3>{selected === null ? "This month" : `${month.toLocaleDateString("en-PH",{month:"long"})} ${selected}`}</h3>{selectedEntries.length===0?<p>No deadlines listed for this {selected===null?"month":"day"}.</p>:selectedEntries.map(e=><Link key={e.id} href={`/requirements/${e.id}`}><span>{e.date.toLocaleDateString("en-PH",{month:"short",day:"numeric"})}</span><strong>{e.name}</strong><small>{e.status.replace(/_/g," ")}</small></Link>)}</div>
  </section>;
}
