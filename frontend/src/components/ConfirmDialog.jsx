import { useEffect } from "react";

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirming = false,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isConfirming) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isConfirming, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!isConfirming) {
          onCancel();
        }
      }}
    >
      <section
        className="modal-dialog modal-dialog-compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 id="confirm-dialog-title">{title}</h3>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close confirmation dialog"
            onClick={onCancel}
            disabled={isConfirming}
          >
            ×
          </button>
        </div>

        <p className="confirm-dialog-copy">{message}</p>

        <div className="form-actions">
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
