import { useEffect, useState } from "react";
import ModalBase from "./ModalBase";

/**
 * Combined Add / Edit supplier modal with product association checklist.
 *
 * Props:
 *  supplier      – null (add mode) or supplier object (edit mode)
 *  products      – full catalog array [{ id, name, category }]
 *  allSuppliers  – all farm suppliers (to detect which products already have a supplier)
 *  saving        – boolean
 *  error         – string|null
 *  onClose       – fn
 *  onSave        – fn({ name, contact_name, contact_email, categories, product_ids })
 */
export default function SupplierModal({ supplier, products, allSuppliers, saving, error, onClose, onSave }) {
  const isEdit = Boolean(supplier);

  const [name, setName] = useState(supplier?.name || "");
  const [contactName, setContactName] = useState(supplier?.contact_name || "");
  const [email, setEmail] = useState(supplier?.contact_email || "");
  const [categories, setCategories] = useState(
    Array.isArray(supplier?.categories) ? supplier.categories.join(", ") : (supplier?.categories || "")
  );
  const [selectedIds, setSelectedIds] = useState(new Set(supplier?.product_ids || []));
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setName(supplier?.name || "");
    setContactName(supplier?.contact_name || "");
    setEmail(supplier?.contact_email || "");
    setCategories(
      Array.isArray(supplier?.categories) ? supplier.categories.join(", ") : (supplier?.categories || "")
    );
    setSelectedIds(new Set(supplier?.product_ids || []));
    setFieldErrors({});
  }, [supplier]);

  // Compute which product_ids already have at least one supplier (other than this one)
  const assignedElsewhere = new Set(
    (allSuppliers || [])
      .filter((s) => s.id !== supplier?.id)
      .flatMap((s) => s.product_ids || [])
  );

  // Products with no supplier at all (and not already in this supplier's list)
  const unassigned = (products || []).filter(
    (p) => !assignedElsewhere.has(p.id) && !selectedIds.has(p.id)
  );
  // Products already associated with THIS supplier
  const alreadyAssigned = (products || []).filter((p) => selectedIds.has(p.id));
  // Products associated with other suppliers but not this one
  const assignedOther = (products || []).filter(
    (p) => assignedElsewhere.has(p.id) && !selectedIds.has(p.id)
  );

  function toggleProduct(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = "Supplier name is required";
    if (!email.trim()) errs.email = "Contact email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email address";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    onSave({
      name: name.trim(),
      contact_name: contactName.trim() || null,
      contact_email: email.trim(),
      categories: categories ? categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
      product_ids: Array.from(selectedIds),
    });
  }

  const productSections = [
    { label: "Already linked to this supplier", items: alreadyAssigned, checked: true },
    { label: "No supplier assigned yet", items: unassigned, checked: false },
    { label: "Linked to other suppliers (can add here too)", items: assignedOther, checked: false, dim: true },
  ].filter((s) => s.items.length > 0);

  return (
    <ModalBase
      isOpen={true}
      isBlocking={saving}
      onClose={onClose}
      eyebrow="Preferred Suppliers"
      title={isEdit ? "Edit supplier" : "Add supplier"}
      dialogStyle={{ maxWidth: "560px" }}
    >
      <form className="form-grid modal-scroll-body" onSubmit={handleSubmit}>
          {/* ── Supplier details ── */}
          <label className="field-group">
            <span className="field-label">Supplier name <span className="field-required">*</span></span>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((f) => ({ ...f, name: "" })); }}
              placeholder="e.g. AgriSupply NZ"
              autoFocus={!isEdit}
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </label>

          <label className="field-group">
            <span className="field-label">Contact name <span className="muted field-optional">(optional)</span></span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jane Smith"
            />
          </label>

          <label className="field-group">
            <span className="field-label">Contact email <span className="field-required">*</span></span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: "" })); }}
              placeholder="jane@supplier.co.nz"
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </label>

          <label className="field-group">
            <span className="field-label">Categories <span className="muted field-optional">(comma-separated)</span></span>
            <input
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="e.g. Feed, Supplements, Dairy"
            />
          </label>

          {/* ── Product association ── */}
          {products && products.length > 0 && (
            <div className="field-group">
              <span className="field-label supplier-products-label">
                Associate products
                <span className="muted field-optional">
                  ({selectedIds.size} selected)
                </span>
              </span>

              <div className="supplier-products-list">
                {productSections.map(({ label, items, dim }, si) => (
                  <div key={label}>
                    {productSections.length > 1 && (
                      <div className={`supplier-products-section${si > 0 ? " supplier-products-section-bordered" : ""}`}>
                        {label}
                      </div>
                    )}
                    {items.map((p) => {
                      const isChecked = selectedIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProduct(p.id)}
                          className={`supplier-product-row${isChecked ? " supplier-product-row-selected" : ""}${dim && !isChecked ? " supplier-product-row-dim" : ""}`}
                        >
                          <span className={`supplier-product-name${isChecked ? " supplier-product-name-selected" : ""}`}>
                            {p.name}
                          </span>
                          <span className="supplier-product-category">
                            {p.category}
                          </span>
                          <span className={`supplier-product-icon${isChecked ? " supplier-product-icon-remove" : ""}`}>
                            {isChecked ? "×" : "+"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {productSections.length === 0 && (
                  <p className="supplier-products-empty">
                    All products are already associated with suppliers.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && <p className="form-error-banner">{error}</p>}

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save changes" : "Add supplier")}
            </button>
            <button type="button" className="secondary-button mobile-modal-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
      </form>
    </ModalBase>
  );
}
