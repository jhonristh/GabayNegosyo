"use client";

export default function ChecklistProgress({ completed, total, overdue, onShow }: { completed: number; total: number; overdue: number; onShow: (filter: "all" | "completed" | "overdue") => void }) {
  const percentage = total ? Math.round(completed / total * 100) : 0;
  return <section className="v07-progress-panel" aria-label="Checklist progress">
    <div className="v07-donut" style={{ background: `conic-gradient(var(--gn-green) ${percentage}%, #dbe7d9 0)` }} role="img" aria-label={`${percentage}% complete; ${completed} of ${total} requirements completed`}><div><strong>{percentage}%</strong><small>complete</small></div></div>
    <div><p className="v05-kicker">YOUR JOURNEY</p><h2>Keep the momentum.</h2><p>{completed} completed · {Math.max(total-completed,0)} remaining</p><div className="v07-progress-actions"><button type="button" onClick={() => onShow("completed")}>Completed ({completed})</button><button type="button" onClick={() => onShow("overdue")}>Overdue ({overdue})</button><button type="button" onClick={() => onShow("all")}>View all ({total})</button></div></div>
  </section>;
}
