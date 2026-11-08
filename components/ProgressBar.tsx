export default function ProgressBar({ percent }: { percent: number }) {
  const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  return (
    <div className="progress-bar-track" role="progressbar" aria-label="Checklist completion" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar-fill" style={{ width: `${clamped}%` }} />
      <span className="progress-bar-label">{clamped}%</span>
    </div>
  );
}
