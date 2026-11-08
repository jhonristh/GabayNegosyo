"use client";
import { useState } from "react";
import BusinessJourney from "./BusinessJourney";
import ProgressBar from "./ProgressBar";
const examples = ["Create your business profile", "Review your requirements", "Prepare your next step"];
export default function WorkspacePreview() {
  const [done, setDone] = useState([true, false, false]);
  const count = done.filter(Boolean).length;
  return <div className="ew-preview" aria-label="Interactive illustrative product preview">
    <div className="ew-preview-top"><span className="ew-wordmark">GabayNegosyo</span><span className="ew-sample-label">SAMPLE WORKSPACE</span></div>
    <div className="ew-preview-body"><div className="ew-preview-title"><div><p className="gn-kicker">YOUR BUSINESS, ORGANIZED</p><h2>A little progress.<br/>A clearer tomorrow.</h2></div><span className="ew-monogram" aria-hidden="true">GN</span></div>
    <div className="ew-preview-progress"><div><strong>{count} / 3</strong><p>sample steps completed</p><ProgressBar percent={Math.round(count / 3 * 100)} /></div><BusinessJourney completed={count} total={3} compact /></div>
    <p className="ew-preview-instruction">Try checking a step below</p>
    <ul className="ew-preview-tasks">{examples.map((label, i) => <li key={label}><label className={done[i] ? "is-done" : ""}><input type="checkbox" checked={done[i]} onChange={() => setDone(previous => previous.map((value, index) => index === i ? !value : value))}/><span>{label}</span><span className="ew-task-state">{done[i] ? "Done" : "To do"}</span></label></li>)}</ul>
    <p className="ew-preview-feedback" role="status">{count === 3 ? "All sample steps complete. Ready to create your own checklist?" : `${3-count} sample steps remaining.`}</p></div>
    <p className="ew-preview-caption">Interactive illustration only. Changes are not saved and do not affect your real checklist.</p>
  </div>;
}
