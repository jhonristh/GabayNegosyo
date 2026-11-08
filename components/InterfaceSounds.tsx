"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
type Cue = "complete" | "finish" | "undo";
const KEY = "gn-interface-sounds";
const Context = createContext({ enabled: false, toggle: () => {}, play: (_cue: Cue) => {} });
export function InterfaceSoundsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const preference = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const nodes = useRef(new Set<OscillatorNode>());
  useEffect(() => {
    const sync = () => { try { preference.current = localStorage.getItem(KEY) === "on"; } catch { preference.current = false; } setEnabled(preference.current); };
    sync(); window.addEventListener("storage", sync);
    return () => { window.removeEventListener("storage", sync); void audio.current?.close().catch(() => {}); };
  }, []);
  function toggle() {
    const next = !preference.current; preference.current = next; setEnabled(next);
    try { localStorage.setItem(KEY, next ? "on" : "off"); } catch { /* Still usable for this session. */ }
    if (!next) nodes.current.forEach(node => { try { node.stop(); } catch {} });
  }
  // Invoked only by intentional user actions; audio never controls progress or saving.
  function play(cue: Cue) {
    if (!preference.current) return;
    try {
      const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      const ctx = audio.current ?? (audio.current = new Audio());
      const start = () => {
        if (!preference.current || ctx.state !== "running") return;
        const notes = cue === "finish" ? [523.25, 659.25] : cue === "undo" ? [260] : [620];
        notes.forEach((frequency, index) => {
          const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
          const at = ctx.currentTime + index * .11;
          oscillator.type = "sine"; oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.035, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + .12);
          oscillator.connect(gain); gain.connect(ctx.destination); nodes.current.add(oscillator);
          oscillator.onended = () => { nodes.current.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
          oscillator.start(at); oscillator.stop(at + .14);
        });
      };
      if (ctx.state === "suspended") void ctx.resume().then(start).catch(() => {}); else start();
    } catch { /* Unsupported or blocked audio must not affect the action. */ }
  }
  return <Context.Provider value={{ enabled, toggle, play }}>{children}</Context.Provider>;
}
export function useInterfaceSounds() { return useContext(Context); }
export function SoundToggle() {
  const { enabled, toggle } = useInterfaceSounds();
  return <button type="button" className="gn-sound-toggle" aria-pressed={enabled} onClick={toggle}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 9H8L13 5V19L8 15H4Z"/>{enabled ? <path d="M16 8Q21 12 16 16M18 5Q26 12 18 19"/> : <path d="M17 9L22 15M22 9L17 15"/>}</svg>Interface sounds: {enabled ? "On" : "Off"}</button>;
}
