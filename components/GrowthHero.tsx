"use client";
import { useEffect, useRef, useState } from "react";
import WorkspacePreview from "./WorkspacePreview";
export default function GrowthHero() {
  const [paused, setPaused] = useState(false);
  const revealed = useRef(new WeakSet<Element>());
  useEffect(() => {
    if (paused || !("IntersectionObserver" in window)) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    const stop = () => { if (media.matches) animations.forEach(animation => animation.cancel()); };
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || revealed.current.has(entry.target)) return;
      revealed.current.add(entry.target); observer.unobserve(entry.target);
      if (!media.matches && typeof entry.target.animate === "function") animations.push(entry.target.animate([{ opacity: .65, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 240, easing: "ease-out" }));
    }), { threshold: .08 });
    document.querySelectorAll(".gn-home > section:not(.gn-hero)").forEach(section => observer.observe(section));
    media.addEventListener("change", stop);
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); media.removeEventListener("change", stop); };
  }, [paused]);
  return <div className="gn-growth-hero" data-paused={paused}>
    <div className="gn-arrow-stage" aria-hidden="true"><picture className="gn-original-arrow"><source srcSet="/images/gabaynegosyo-growth-arrow.webp" type="image/webp"/><img src="/images/gabaynegosyo-growth-arrow.png" width={1400} height={836} alt="" fetchPriority="high"/></picture><span className="gn-arrow-shine" /></div>
    <div className="gn-growth-preview"><WorkspacePreview /></div>
    <button className="gn-motion-toggle" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume decorative motion" : "Pause decorative motion"}</button>
  </div>;
}
