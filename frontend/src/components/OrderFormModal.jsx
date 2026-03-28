import { useEffect } from "react";

const unitOptions = ["kg", "L", "tonnes", "units", "mL", "Custom..."];

export default function OrderFormModal({
  isOpen,
  editingOrderId,
  draft,
  errors,
  submitError,
  unitMode,
  isSubmitting,
  onClose,
  onFieldChange,
  onUnitSelect,
  onSubmit
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow field-label">Purchase History</p>
            <h3 id="order-modal-title">
              {editingOrderId ? "Edit purchase record" : "Log manual purchase"}
            </h3>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: "0", width: "32px", height: "32px", borderRadius: "999px", fontSize: "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ×
          </button>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field-group">
            <span className="field-label">Purchase date</span>
            <input name="date" type="date" value={draft.date} onChange={onFieldChange} />
            {errors.date ? <span className="field-error">{errors.date}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Product name</span>
            <input
              name="product_name"
              placeholder="Product name"
              value={draft.product_name}
              onChange={onFieldChange}
            />
            {errors.product_name ? <span className="field-error">{errors.product_name}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Category</span>
            <select name="category" value={draft.category} onChange={onFieldChange}>
              <option value="feed">Feed</option>
              <option value="fertiliser">Fertiliser</option>
              <option value="veterinary">Veterinary</option>
              <option value="chemical">Chemical</option>
              <option value="equipment">Equipment</option>
            </select>
            {errors.category ? <span className="field-error">{errors.category}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Quantity</span>
            <input name="quantity" type="number" step="0.01" value={draft.quantity} onChange={onFieldChange} />
            {errors.quantity ? <span className="field-error">{errors.quantity}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Unit</span>
            <select
              value={unitMode === "custom" ? "Custom..." : draft.unit}
              onChange={onUnitSelect}
            >
              {unitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {unitMode === "custom" ? (
              <input
                name="unit"
                placeholder="Enter custom unit"
                value={draft.unit}
                onChange={onFieldChange}
              />
            ) : null}
            {errors.unit ? <span className="field-error">{errors.unit}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Unit price</span>
            <input
              name="unit_price"
              type="number"
              step="0.01"
              value={draft.unit_price}
              onChange={onFieldChange}
            />
            {errors.unit_price ? <span className="field-error">{errors.unit_price}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Supplier ID</span>
            <input
              name="supplier_id"
              placeholder="Supplier ID"
              value={draft.supplier_id}
              onChange={onFieldChange}
            />
            {errors.supplier_id ? <span className="field-error">{errors.supplier_id}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Notes</span>
            <textarea name="notes" placeholder="Notes" value={draft.notes} onChange={onFieldChange} rows={3} />
            {errors.notes ? <span className="field-error">{errors.notes}</span> : null}
          </label>
          {submitError ? <p className="form-error-banner">{submitError}</p> : null}
          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {editingOrderId ? "Save changes" : "Create order"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
