import useModalBehavior from "../hooks/useModalBehavior";

export default function ModalBase({
  isOpen,
  isBlocking = false,
  onClose,
  title,
  titleId,
  eyebrow,
  children,
  dialogClassName = "",
  dialogStyle,
  contentClassName = "",
  role = "dialog",
  labelledBy,
}) {
  useModalBehavior({ isOpen, isBlocking, onClose });

  if (!isOpen) {
    return null;
  }

  const headingId = labelledBy || titleId;
  const dialogClasses = ["modal-dialog", dialogClassName].filter(Boolean).join(" ");
  const contentClasses = ["modal-shell", contentClassName].filter(Boolean).join(" ");

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isBlocking) {
          onClose();
        }
      }}
    >
      <section
        className={dialogClasses}
        style={dialogStyle}
        role={role}
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className={contentClasses}>
          {(title || eyebrow) && (
            <div className="modal-header">
              <div>
                {eyebrow ? <p className="modal-eyebrow field-label">{eyebrow}</p> : null}
                {title ? <h3 id={headingId}>{title}</h3> : null}
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close dialog"
                onClick={onClose}
                disabled={isBlocking}
              >
                ×
              </button>
            </div>
          )}

          {children}
        </div>
      </section>
    </div>
  );
}
