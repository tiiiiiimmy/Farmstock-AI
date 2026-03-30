import ModalBase from "./ModalBase";

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
  return (
    <ModalBase
      isOpen={isOpen}
      isBlocking={isConfirming}
      onClose={onCancel}
      title={title}
      titleId="confirm-dialog-title"
      dialogClassName="modal-dialog-compact"
      role="alertdialog"
    >
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
    </ModalBase>
  );
}
