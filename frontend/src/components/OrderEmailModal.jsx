import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";

export default function OrderEmailModal({ product, suppliers, farmId, farmName, onClose, onSupplierCreated }) {
  const hasExisting = suppliers.length > 0;

  // "none" = not yet chosen, "existing" = selected from list, "new" = adding new
  const [supplierMode, setSupplierMode] = useState(hasExisting ? "none" : "new");
  const [supplierId, setSupplierId] = useState("");

  // New supplier fields
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newErrors, setNewErrors] = useState({});

  // Email draft
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Order details
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(product?.typical_unit || "units");

  const [sent, setSent] = useState(false);
  const [savedNewSupplier, setSavedNewSupplier] = useState(false);

  const draftTriggeredFor = useRef(null);

  const isNew = supplierMode === "new";
  const selectedSupplier = supplierMode === "existing" ? (suppliers.find((s) => s.id === supplierId) || null) : null;

  const effectiveSupplierName = isNew ? newName : (selectedSupplier?.name || "");
  const effectiveContactName = isNew ? newContact : (selectedSupplier?.contact_name || "");

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // When existing supplier selection changes: sync toEmail, clear draft
  useEffect(() => {
    if (supplierMode !== "existing") return;
    const email = selectedSupplier?.contact_email || "";
    setToEmail(email);
    setSubject("");
    setBody("");
    draftTriggeredFor.current = null;
  }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When switching back to "existing" / "none" from "new"
  function switchToExisting() {
    setSupplierMode(supplierId ? "existing" : "none");
    const email = suppliers.find((s) => s.id === supplierId)?.contact_email || "";
    setToEmail(email);
    setSubject("");
    setBody("");
    draftTriggeredFor.current = null;
  }

  const draftMutation = useMutation({
    mutationFn: () =>
      api.draftOrderEmail({
        product_name: product.name,
        quantity: Number(quantity),
        unit,
        supplier_name: effectiveSupplierName || "Supplier",
        supplier_contact: effectiveContactName || null,
      }),
    onSuccess: (data) => {
      setSubject(data.subject || "");
      setBody(data.body || "");
    },
  });

  // Auto-draft when toEmail is set and hasn't been drafted for yet
  useEffect(() => {
    if (!toEmail || draftTriggeredFor.current === toEmail) return;
    draftTriggeredFor.current = toEmail;
    setSubject("");
    setBody("");
    draftMutation.mutate();
  }, [toEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // For existing supplier without email: manual email input + generate button
  function handleGenerateDraft() {
    draftTriggeredFor.current = null;
    setSubject("");
    setBody("");
    draftMutation.mutate();
  }

  const createSupplierMutation = useMutation({
    mutationFn: (data) => api.createSupplier(farmId, data),
    onSuccess: () => {
      setSavedNewSupplier(true);
      if (onSupplierCreated) onSupplierCreated();
    },
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.sendSupplierEmail({
        to_email: toEmail.trim(),
        subject,
        body,
        farm_name: farmName,
      }),
    onSuccess: () => {
      setSent(true);
      if (isNew && newName.trim() && newEmail.trim()) {
        createSupplierMutation.mutate({
          name: newName.trim(),
          contact_name: newContact.trim() || null,
          contact_email: newEmail.trim(),
        });
      }
    },
  });

  // Commit new supplier email when field blurs (triggers auto-draft)
  function handleNewEmailBlur() {
    const val = newEmail.trim();
    if (val && toEmail !== val) {
      setToEmail(val);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (isNew) {
      const errs = {};
      if (!newName.trim()) errs.name = "Supplier name is required";
      if (!newEmail.trim()) errs.email = "Contact email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) errs.email = "Enter a valid email address";
      if (Object.keys(errs).length) { setNewErrors(errs); return; }
    }

    if (!toEmail.trim() || !subject.trim() || !body.trim()) return;
    sendMutation.mutate();
  }

  // ── Success screen ────────────────────────────────────────────
  if (sent) {
    return (
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-dialog" style={{ maxWidth: "440px", textAlign: "center" }}>
          <div style={{ padding: "2rem 1.5rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✓</div>
            <h3 style={{ margin: "0 0 0.5rem" }}>Email sent</h3>
            <p className="muted" style={{ fontSize: "0.9rem", margin: "0 0 0.5rem" }}>
              Your order for <strong>{product.name}</strong> has been sent to <strong>{toEmail}</strong>.
            </p>
            {isNew && newName.trim() && (
              <p className="muted" style={{ fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
                {savedNewSupplier
                  ? `${newName} has been saved to your suppliers.`
                  : createSupplierMutation.isPending
                  ? "Saving supplier…"
                  : ""}
              </p>
            )}
            {!(isNew && newName.trim()) && <div style={{ marginBottom: "1.5rem" }} />}
            <button type="button" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  const showDraftArea = Boolean(toEmail) && !draftMutation.isPending;
  const canSend = Boolean(toEmail.trim() && subject.trim() && body.trim() && !sendMutation.isPending && !draftMutation.isPending);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog" style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow field-label">Order Now</p>
            <h3>{product?.name}</h3>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            style={{ padding: 0, width: "32px", height: "32px", borderRadius: "999px", fontSize: "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ×
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {/* ── Quantity + Unit ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label className="field-group">
              <span className="field-label">Quantity</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label className="field-group">
              <span className="field-label">Unit</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>
          </div>

          {/* ── Supplier selection ── */}
          <div className="field-group">
            <span className="field-label">Supplier</span>

            {/* Existing supplier dropdown — visible when there are existing suppliers */}
            {hasExisting && supplierMode !== "new" && (
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setSupplierMode(e.target.value ? "existing" : "none");
                }}
              >
                <option value="">— Select a supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {/* Add new supplier button — shown below dropdown when not in "new" mode */}
            {supplierMode !== "new" && (
              <button
                type="button"
                className="ghost-button"
                style={{ fontSize: "0.8rem", marginTop: "0.5rem", padding: "0.2rem 0" }}
                onClick={() => { setSupplierMode("new"); setSupplierId(""); }}
              >
                ＋ Add new supplier
              </button>
            )}

            {/* New supplier inline form */}
            {supplierMode === "new" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginTop: "0.1rem" }}>
                <div>
                  <input
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setNewErrors((n) => ({ ...n, name: "" })); }}
                    placeholder="Supplier name *"
                    autoFocus
                  />
                  {newErrors.name && <span className="field-error">{newErrors.name}</span>}
                </div>
                <input
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="Contact name (optional)"
                />
                <div>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setNewErrors((n) => ({ ...n, email: "" })); }}
                    onBlur={handleNewEmailBlur}
                    placeholder="Contact email *"
                  />
                  {newErrors.email && <span className="field-error">{newErrors.email}</span>}
                </div>
                {hasExisting && (
                  <button
                    type="button"
                    className="ghost-button"
                    style={{ fontSize: "0.8rem", padding: "0.2rem 0", alignSelf: "flex-start" }}
                    onClick={switchToExisting}
                  >
                    ← Choose from existing suppliers
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Existing supplier without email on file ── */}
          {supplierMode === "existing" && selectedSupplier && !selectedSupplier?.contact_email && (
            <label className="field-group">
              <span className="field-label">
                Contact email
                <span className="muted" style={{ fontWeight: 400, marginLeft: "0.4rem" }}>(not on file)</span>
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="supplier@example.co.nz"
                  style={{ flex: 1 }}
                />
                {toEmail && (
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}
                    onClick={handleGenerateDraft}
                    disabled={draftMutation.isPending}
                  >
                    {draftMutation.isPending ? "Drafting…" : "Generate draft"}
                  </button>
                )}
              </div>
            </label>
          )}

          {/* ── Drafting indicator ── */}
          {draftMutation.isPending && (
            <p className="muted" style={{ fontSize: "0.875rem", margin: 0 }}>AI is drafting the email…</p>
          )}

          {/* ── Email draft fields ── */}
          {showDraftArea && (
            <>
              <label className="field-group">
                <span className="field-label">Subject</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Purchase order subject"
                />
              </label>
              <label className="field-group">
                <span className="field-label">Message</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Email body"
                  style={{ fontFamily: "inherit", fontSize: "0.875rem", lineHeight: 1.6 }}
                />
              </label>
            </>
          )}

          {sendMutation.isError && (
            <p className="form-error-banner">{sendMutation.error?.message || "Failed to send email"}</p>
          )}

          <div className="form-actions">
            <button type="submit" disabled={!canSend}>
              {sendMutation.isPending ? "Sending…" : "Send order email"}
            </button>
            <button
              type="button"
              className="secondary-button mobile-modal-cancel"
              onClick={onClose}
              disabled={sendMutation.isPending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
