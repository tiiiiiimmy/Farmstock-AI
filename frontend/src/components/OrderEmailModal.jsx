import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";

const NEW_SUPPLIER = "__new__";

export default function OrderEmailModal({ product, suppliers, farmId, farmName, onClose, onSupplierCreated }) {
  const hasExisting = suppliers.length > 0;

  // Supplier mode: pick existing or add new
  const [supplierId, setSupplierId] = useState(hasExisting ? (suppliers[0]?.id || "") : NEW_SUPPLIER);

  // New supplier fields
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailError, setNewEmailError] = useState("");

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

  const isNew = supplierId === NEW_SUPPLIER;
  const selectedSupplier = !isNew ? (suppliers.find((s) => s.id === supplierId) || null) : null;

  // Derived: the actual email and supplier info used for drafting
  const effectiveEmail = isNew ? newEmail : (selectedSupplier?.contact_email || "");
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
    if (isNew) return;
    const email = selectedSupplier?.contact_email || "";
    setToEmail(email);
    setSubject("");
    setBody("");
    draftTriggeredFor.current = null;
  }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftMutation = useMutation({
    mutationFn: ({ email, supplierName, contactName }) =>
      api.draftOrderEmail({
        product_name: product.name,
        quantity: Number(quantity),
        unit,
        supplier_name: supplierName || "Supplier",
        supplier_contact: contactName || null,
      }),
    onSuccess: (data) => {
      setSubject(data.subject || "");
      setBody(data.body || "");
    },
  });

  // Auto-draft when toEmail is set and we haven't drafted for it yet
  useEffect(() => {
    if (!toEmail || draftTriggeredFor.current === toEmail) return;
    draftTriggeredFor.current = toEmail;
    setSubject("");
    setBody("");
    draftMutation.mutate({
      email: toEmail,
      supplierName: effectiveSupplierName,
      contactName: effectiveContactName,
    });
  }, [toEmail]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Save new supplier if one was entered
      if (isNew && newName.trim() && newEmail.trim()) {
        createSupplierMutation.mutate({
          name: newName.trim(),
          contact_name: newContact.trim() || null,
          contact_email: newEmail.trim(),
        });
      }
    },
  });

  function handleNewEmailBlur() {
    if (!newEmail.trim()) return;
    setToEmail(newEmail.trim());
  }

  function handleGenerateDraft() {
    if (!toEmail.trim()) return;
    draftTriggeredFor.current = null;
    setSubject("");
    setBody("");
    draftMutation.mutate({
      email: toEmail,
      supplierName: effectiveSupplierName,
      contactName: effectiveContactName,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isNew && !newEmail.trim()) {
      setNewEmailError("Contact email is required");
      return;
    }
    if (!toEmail.trim() || !subject.trim() || !body.trim()) return;
    sendMutation.mutate();
  }

  // Success screen
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
  const canSend = toEmail.trim() && subject.trim() && body.trim() && !sendMutation.isPending && !draftMutation.isPending;

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
          {/* Quantity + Unit */}
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

          {/* Supplier selector */}
          <label className="field-group">
            <span className="field-label">Supplier</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value={NEW_SUPPLIER}>+ Add new supplier</option>
            </select>
          </label>

          {/* New supplier fields */}
          {isNew && (
            <>
              <label className="field-group">
                <span className="field-label">
                  Supplier name <span style={{ color: "var(--red)" }}>*</span>
                </span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. AgriSupply NZ"
                  autoFocus={!hasExisting}
                />
              </label>
              <label className="field-group">
                <span className="field-label">Contact name <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span>
                <input
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="e.g. Jane Smith"
                />
              </label>
              <label className="field-group">
                <span className="field-label">
                  Contact email <span style={{ color: "var(--red)" }}>*</span>
                </span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setNewEmailError(""); }}
                  onBlur={handleNewEmailBlur}
                  placeholder="jane@supplier.co.nz"
                />
                {newEmailError && <span className="field-error">{newEmailError}</span>}
              </label>
            </>
          )}

          {/* Existing supplier without email on file */}
          {!isNew && !selectedSupplier?.contact_email && (
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

          {/* Drafting indicator */}
          {draftMutation.isPending && (
            <p className="muted" style={{ fontSize: "0.875rem", margin: 0 }}>AI is drafting the email…</p>
          )}

          {/* Email draft fields */}
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
