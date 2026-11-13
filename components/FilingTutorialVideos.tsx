"use client";
import { useMemo } from "react";
import { db } from "../lib/db";
import TutorialCard from "./TutorialCard";

/** Same catalog, player, design and attribution as the free Learning Hub. */
export default function FilingTutorialVideos() {
  const items = useMemo(() => db.getTutorials().filter(t => !t.isPlaceholder), []);
  return <section className="guide-stage" aria-labelledby="videos-h">
    <h2 id="videos-h">Filing Tutorial Videos</h2>
    <p>Open registration, renewal and filing walkthroughs on YouTube. We do not own these YouTube videos. CTTO: credit to the owner.</p>
    <p className="hint">Confirm current forms, fees and deadlines with the issuing agency.</p>
    {items.length === 0 ? <p className="v06-unavailable">No tutorial videos are available.</p> :
      <div className="v06-media-grid">{items.map(t => <TutorialCard key={t.id} tutorial={t} />)}</div>}
  </section>;
}
