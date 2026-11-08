"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { db } from "../lib/db";
import { useAuth } from "../lib/auth";
import { hasPremiumAccess } from "../lib/entitlements";
import { generateApplicableRequirements, resolveObligation, formatDueLabel, compareByDue } from "../lib/ruleEngine";
import { isOutlineRenewal, isRenewalRequirement, renewalStepState } from "../lib/renewalFocus";
import type { Requirement } from "../lib/types";
import BusinessJourney from "./BusinessJourney";
import ProgressBar from "./ProgressBar";
import StatusBadge from "./StatusBadge";
import { SoundToggle, useInterfaceSounds } from "./InterfaceSounds";
import { useToast } from "./ToastProvider";

export default function RenewalWorkspace({ onFocusChange }: { onFocusChange: (focused: boolean) => void }) {
  const { user } = useAuth(); const { notify } = useToast(); const { play } = useInterfaceSounds();
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState(0); const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); const [, redraw] = useState(0);
  const [direction, setDirection] = useState("forward"); const [writeError, setWriteError] = useState(false);
  const [online, setOnline] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null); const overview = useRef<HTMLHeadingElement>(null);
  const focusRequested = useRef(false);
  useEffect(() => { const sync = () => setOnline(navigator.onLine); sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync); return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); }; }, []);
  useEffect(() => db.onPersistError(label => { if (["setTaskDone", "markComplete", "markIncomplete"].includes(label)) setWriteError(true); }), []);
  useEffect(() => { if (focusRequested.current) { (selected ? heading : overview).current?.focus(); focusRequested.current = false; } }, [selected, active, expanded]);
  if (!user) return null;
  const premium = hasPremiumAccess(user); const profile = db.getBusinessProfile(user.id);
  const progress = db.getProgress(); const agencies = db.getAgencies();
  const rows = profile ? generateApplicableRequirements(profile, db.getRequirements()).filter(isRenewalRequirement).map(req => ({ req, ...resolveObligation(req, progress[req.id], new Date(), profile.createdAt) })).sort(compareByDue) : [];
  const row = rows.find(item => item.req.id === selected);
  const completeCount = rows.filter(item => item.status === "completed").length;
  const agencyName = (id: string) => agencies.find(agency => agency.id === id)?.name ?? id;
  function begin(req: Requirement) {
    const current = rows.find(item => item.req.id === req.id); if (!current || !premium) return;
    setActive(renewalStepState(req.instructions, db.getDoneTasks(req.id, current.cycle)).firstIncomplete);
    setExpanded(false); setMenuOpen(false); focusRequested.current = true; setSelected(req.id); onFocusChange(true);
  }
  function exit() { focusRequested.current = true; setSelected(null); onFocusChange(false); }
  if (!row || !premium) return <section className="rf-overview" aria-labelledby="renewal-overview-title">
    <div className="rf-overview-heading"><div><p className="gn-kicker">ONE RENEWAL, ONE CLEAR NEXT STEP</p><h2 id="renewal-overview-title" ref={overview} tabIndex={-1}>Your renewal workspace</h2><p>Open a requirement to follow its existing instructions at your own pace.</p></div>{premium && <BusinessJourney completed={completeCount} total={rows.length} compact />}</div>
    {!profile ? <div className="empty-state"><h3>Personalize your renewal overview</h3><p>Create your business profile to see applicable requirements.</p><Link className="primary-btn" href="/wizard">Set up my profile</Link></div> : rows.length === 0 ? <div className="empty-state"><h3>No renewal items match your current profile</h3><p>This does not confirm that your business has no renewal obligations. Check the general guidance below and your agency.</p><Link href="/wizard">Review your business profile</Link></div> : <>
      {premium && <><ProgressBar percent={Math.round(completeCount / rows.length * 100)} /><p className="hint">{completeCount} of {rows.length} requirements marked complete. Self-reported progress, not agency approval.</p></>}
      <div className="rf-renewal-grid">{rows.map(item => { const state = renewalStepState(item.req.instructions, db.getDoneTasks(item.req.id, item.cycle)); return <article key={item.req.id} className="rf-renewal-card"><div className="rf-card-meta"><span className="req-agency-tag">{agencyName(item.req.agencyId)}</span>{premium && <StatusBadge status={item.status}/>}</div><h3>{item.req.name}</h3><p>{item.dueDate ? `Due ${formatDueLabel(item.dueDate)}` : item.req.deadlineDescription}</p>{premium ? <><p className="hint">{state.count} of {item.req.instructions.length} instruction steps checked</p>{!state.allDone && item.req.instructions.length > 0 && <p className="rf-next-action"><strong>Next unchecked step</strong>{item.req.instructions[state.firstIncomplete]}</p>}{isOutlineRenewal(item.req) && <p className="rf-outline">Outline guidance: confirm the detailed process with the agency.</p>}<button type="button" className="primary-btn" onClick={() => begin(item.req)}>{state.allDone || item.status === "completed" ? "Review renewal" : state.count ? "Continue renewal" : "Start renewal"}</button></> : <p className="guide-locked">Step-by-step focus and progress are available with Premium. <Link href="/account">View your plan</Link></p>}</article>; })}</div>
    </>}
  </section>;
  const { req, cycle, dueKey, status } = row;
  const steps = req.instructions; const state = renewalStepState(steps, db.getDoneTasks(req.id, cycle));
  const index = Math.min(active, Math.max(steps.length - 1, 0)); const disabled = !online && !user.isDemo;
  function move(next: number) { setDirection(next < active ? "backward" : "forward"); focusRequested.current = true; setActive(next); setMenuOpen(false); }
  function toggleStep(step: number) {
    if (!premium || disabled || step < 0 || step >= steps.length) return;
    const checked = !state.completed.has(step); db.setTaskDone(req.id, cycle, step, checked);
    const next = new Set(state.completed); if (checked) next.add(step); else next.delete(step);
    if (checked && next.size === steps.length) {
      db.markComplete(req.id, `biz-${user!.id}`, dueKey); play("finish"); notify("All instruction steps checked. Renewal marked complete by you; this is not agency approval.");
    } else { if (!checked && status === "completed") db.markIncomplete(req.id); play(checked ? "complete" : "undo"); notify(checked ? "Step checked. Continue when you are ready." : "Step reopened."); }
    redraw(value => value + 1);
  }
  const nav = <ol>{steps.map((step, i) => <li key={i}><button type="button" aria-current={i === index ? "step" : undefined} onClick={() => { setExpanded(false); move(i); }}><span className="rf-step-number" aria-hidden="true">{state.completed.has(i) ? "✓" : i + 1}</span><span><strong>{step}</strong><small>{state.completed.has(i) ? "Checked" : "To do"}{i === index ? " · Current step" : ""}</small></span></button></li>)}</ol>;
  return <section className="rf-focus" aria-label="Renewal focus workspace">
    <div className="rf-toolbar"><button className="secondary-btn" type="button" onClick={exit}>← Renewal overview</button><SoundToggle /></div>
    <header className="rf-header"><div><p className="gn-kicker">RENEWAL FOCUS VIEW · {agencyName(req.agencyId)}</p><h2>{req.name}</h2><p>{row.dueDate ? `Due ${formatDueLabel(row.dueDate)}` : req.deadlineDescription}</p><StatusBadge status={status}/></div><BusinessJourney completed={state.count} total={steps.length} compact /></header>
    <ProgressBar percent={steps.length ? Math.round(state.count / steps.length * 100) : 0}/>
    <p className="hint" role="status">{state.count} of {steps.length} steps checked. Progress uses your existing checklist and renewal cycle.</p>
    {writeError && <div className="rf-warning" role="alert">A progress change could not sync. The checkmarks shown here may not be saved. Reconnect and reload before relying on them. <button type="button" className="secondary-btn" onClick={() => window.location.reload()}>Reload saved progress</button></div>}
    {disabled && <p className="rf-warning" role="status">You are offline. Read the instructions here; reconnect to change progress.</p>}
    {isOutlineRenewal(req) && <p className="rf-warning">This record contains outline guidance, not a verified local procedure. Confirm the steps, documents and deadline with the agency.</p>}
    {status === "completed" && !state.allDone && <p className="hint">This requirement was marked complete separately. Its individual step checkboxes have not all been recorded.</p>}
    <div className="rf-view-controls"><button type="button" className="secondary-btn" aria-expanded={expanded} onClick={() => { focusRequested.current = true; setExpanded(value => !value); }}>{expanded ? "Return to focused step" : "Expand all steps"}</button><button type="button" className="secondary-btn rf-mobile-nav" aria-expanded={menuOpen} aria-controls="rf-step-navigation" onClick={() => setMenuOpen(value => !value)}>See all steps ({steps.length})</button></div>
    <div className="rf-layout"><nav id="rf-step-navigation" className={`rf-step-navigation ${menuOpen ? "is-open" : ""}`} aria-label="Renewal instruction steps">{nav}</nav>
    <div className="rf-main-panel">
      {steps.length === 0 ? <div className="empty-state"><h3 ref={heading} tabIndex={-1}>Detailed steps are not available</h3><p>Open the agency source or contact the agency for the current process.</p></div> : expanded ? <section className="rf-all-steps"><h3 ref={heading} tabIndex={-1}>The full process</h3><ol>{steps.map((step,i) => <li key={i}><label><input type="checkbox" checked={state.completed.has(i)} disabled={disabled} onChange={() => toggleStep(i)}/><span><strong>Step {i+1}</strong>{step}</span></label></li>)}</ol></section> : <section key={`${req.id}-${index}`} className="rf-active-step" data-direction={direction}><p className="gn-kicker">STEP {index+1} OF {steps.length}</p><h3 ref={heading} tabIndex={-1}>{steps[index]}</h3><p className="hint">{state.completed.has(index) ? "You have checked this step. You can reopen it below." : "Follow this instruction with the agency, then record your progress here."}</p><button className={state.completed.has(index) ? "secondary-btn" : "primary-btn"} disabled={disabled} type="button" onClick={() => toggleStep(index)}>{state.completed.has(index) ? "Undo step completion" : "I completed this step"}</button><div className="rf-step-controls"><button className="secondary-btn" type="button" disabled={index === 0} onClick={() => move(index-1)}>Previous</button>{index < steps.length-1 ? <button className="secondary-btn" type="button" onClick={() => move(index+1)}>Next step →</button> : <button className="secondary-btn" type="button" onClick={exit}>Back to overview</button>}</div><p className="hint">Next step only changes the view. It does not mark anything complete.</p></section>}
      <details className="rf-support" open><summary>Documents for this requirement</summary>{req.requiredDocuments.length ? <ul>{req.requiredDocuments.map(doc => <li key={doc.name}><strong>{doc.name}</strong>{doc.description && <span> — {doc.description}</span>}</li>)}</ul> : <p>No document list has been supplied. Confirm it with the agency.</p>}<p className="hint">This list applies to the whole requirement, not only the active step.</p></details>
      <details className="rf-support"><summary>Source, scope and notes</summary><p>{req.description}</p><p>Content last reviewed: {req.lastVerified || "Not supplied"}. Confirm current local requirements before filing.</p>{req.officialUrl ? <a className="ew-detail-link" href={req.officialUrl} target="_blank" rel="noopener noreferrer">Open official source ↗</a> : <p>An official source link has not been supplied.</p>}<Link className="ew-detail-link" href={`/requirements/${req.id}`}>Open full requirement →</Link><p className="hint">Checkmarks record your own actions. GabayNegosyo does not submit applications or certify agency approval.</p></details>
    </div></div>
  </section>;
}
