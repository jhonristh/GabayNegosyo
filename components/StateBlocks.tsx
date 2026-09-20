/**
 * Shared loading/error states (V0.2 §25) so no screen renders blank and
 * every failure tells the user what happened and what to do next.
 */

export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({
  message = "We couldn't load your compliance information.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block state-block-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
