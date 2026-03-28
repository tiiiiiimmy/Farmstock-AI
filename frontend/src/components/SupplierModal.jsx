import { useEffect, useState } from "react";

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

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, saving]);

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
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-dialog" style={{ maxWidth: "560px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <p className="modal-eyebrow field-label">Preferred Suppliers</p>
            <h3>{isEdit ? "Edit supplier" : "Add supplier"}</h3>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={saving}
            style={{ padding: 0, width: "32px", height: "32px", borderRadius: "999px", fontSize: "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ×
          </button>
        </div>

        <form
          className="form-grid"
          onSubmit={handleSubmit}
          style={{ overflowY: "auto", flex: 1, paddingRight: "0.25rem" }}
        >
          {/* ── Supplier details ── */}
          <label className="field-group">
            <span className="field-label">Supplier name <span style={{ color: "var(--red)" }}>*</span></span>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((f) => ({ ...f, name: "" })); }}
              placeholder="e.g. AgriSupply NZ"
              autoFocus={!isEdit}
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </label>

          <label className="field-group">
            <span className="field-label">Contact name <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jane Smith"
            />
          </label>

          <label className="field-group">
            <span className="field-label">Contact email <span style={{ color: "var(--red)" }}>*</span></span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: "" })); }}
              placeholder="jane@supplier.co.nz"
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </label>

          <label className="field-group">
            <span className="field-label">Categories <span className="muted" style={{ fontWeight: 400 }}>(comma-separated)</span></span>
            <input
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="e.g. Feed, Supplements, Dairy"
            />
          </label>

          {/* ── Product association ── */}
          {products && products.length > 0 && (
            <div className="field-group">
              <span className="field-label" style={{ marginBottom: "0.5rem", display: "block" }}>
                Associate products
                <span className="muted" style={{ fontWeight: 400, marginLeft: "0.4rem" }}>
                  ({selectedIds.size} selected)
                </span>
              </span>

              <div style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
              }}>
                {productSections.map(({ label, items, dim }, si) => (
                  <div key={label}>
                    {productSections.length > 1 && (
                      <div style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        background: "var(--bg-subtle, #f8f9fa)",
                        borderTop: si > 0 ? "1px solid var(--border)" : "none",
                      }}>
                        {label}
                      </div>
                    )}
                    {items.map((p) => {
                      const isChecked = selectedIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProduct(p.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.5rem 0.75rem",
                            borderTop: "1px solid var(--border)",
                            background: isChecked ? "rgba(45,106,79,0.06)" : "",
                            opacity: dim && !isChecked ? 0.55 : 1,
                            cursor: "pointer",
                            userSelect: "none",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isChecked
                              ? "rgba(45,106,79,0.11)"
                              : "var(--bg-subtle, #f8f9fa)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isChecked ? "rgba(45,106,79,0.06)" : "";
                          }}
                        >
                          <span style={{
                            flex: 1,
                            fontSize: "0.875rem",
                            fontWeight: isChecked ? 500 : 400,
                            color: isChecked ? "var(--green, #2d6a4f)" : "inherit",
                          }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {p.category}
                          </span>
                          {/* action icon — visual indicator only, click is on the row */}
                          <span style={{
                            flexShrink: 0,
                            width: "22px",
                            height: "22px",
                            borderRadius: "6px",
                            border: isChecked
                              ? "1px solid rgba(220,38,38,0.35)"
                              : "1px solid rgba(45,106,79,0.35)",
                            background: isChecked ? "rgba(220,38,38,0.08)" : "rgba(45,106,79,0.08)",
                            color: isChecked ? "#dc2626" : "var(--green, #2d6a4f)",
                            fontSize: isChecked ? "1rem" : "1.1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                          }}>
                            {isChecked ? "×" : "+"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {productSections.length === 0 && (
                  <p style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
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
      </div>
    </div>
  );
}
