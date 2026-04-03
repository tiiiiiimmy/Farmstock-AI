import ModalBase from "./ModalBase";
const unitOptions = ["kg", "L", "tonnes", "units", "mL", "Custom..."];

export default function OrderFormModal({
  isOpen,
  editingOrderId,
  draft,
  errors,
  submitError,
  unitMode,
  isSubmitting,
  suppliers,
  onClose,
  onFieldChange,
  onUnitSelect,
  onSubmit,
  onAddSupplier,
}) {
  function handleSupplierChange(e) {
    if (e.target.value === "__add_new__") {
      onAddSupplier?.(draft.product_name);
      return;
    }
    onFieldChange(e);
  }
  return (
    <ModalBase
      isOpen={isOpen}
      isBlocking={isSubmitting}
      onClose={onClose}
      eyebrow="Purchase History"
      title={editingOrderId ? "Edit purchase record" : "Log manual purchase"}
      titleId="order-modal-title"
    >
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
          <span className="field-label">
            Supplier <span className="field-required">*</span>
          </span>
          <select
            name="supplier_id"
            value={draft.supplier_id || ""}
            onChange={handleSupplierChange}
          >
            <option value="">— Select a supplier —</option>
            <option value="__add_new__">＋ Add new supplier</option>
            {suppliers.length > 0 && <option disabled>──────────────</option>}
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
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
          <button
            type="button"
            className="secondary-button mobile-modal-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
