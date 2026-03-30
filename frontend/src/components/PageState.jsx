export default function PageState({
  title,
  message,
  actionLabel,
  onAction,
  tone = "default",
  compact = false,
}) {
  return (
    <section className={`panel page-state page-state-${tone}${compact ? " page-state-compact" : ""}`}>
      <div className="page-state-content">
        {title ? <h3>{title}</h3> : null}
        {message ? <p className="muted">{message}</p> : null}
        {actionLabel && onAction ? (
          <button type="button" className="secondary-button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
