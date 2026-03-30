import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import ModalBase from "./ModalBase";

export default function OrderEmailModal({ product, suppliers, farmId, farmName, onClose, onSupplierCreated }) {
  const hasExisting = suppliers.length > 0;

  // Find suppliers already linked to this product
  const linkedSuppliers = suppliers.filter((s) => (s.product_ids || []).includes(product?.id));
  const defaultSupplier = linkedSuppliers[0] || null;

  const [supplierMode, setSupplierMode] = useState(
    defaultSupplier ? "existing" : hasExisting ? "none" : "new"
  );
  const [supplierId, setSupplierId] = useState(defaultSupplier?.id || "");

  // New supplier fields
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newErrors, setNewErrors] = useState({});

  // Email fields — only populated after user clicks "Generate email"
  const [toEmail, setToEmail] = useState(defaultSupplier?.contact_email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Order details
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(product?.typical_unit || "units");

  const [sent, setSent] = useState(false);
  const [savedNewSupplier, setSavedNewSupplier] = useState(false);

  const isNew = supplierMode === "new";
  const selectedSupplier = supplierMode === "existing"
    ? (suppliers.find((s) => s.id === supplierId) || null)
    : null;

  const effectiveSupplierName = isNew ? newName : (selectedSupplier?.name || "");
  const effectiveContactName = isNew ? newContact : (selectedSupplier?.contact_name || "");
  const effectiveEmail = isNew ? newEmail : (selectedSupplier?.contact_email || toEmail);

  // When existing supplier selection changes: sync toEmail, clear draft
  useEffect(() => {
    if (supplierMode !== "existing") return;
    setToEmail(selectedSupplier?.contact_email || "");
    setSubject("");
    setBody("");
  }, [selectedSupplier, supplierMode]);

  function switchToExisting() {
    setSupplierMode(supplierId ? "existing" : "none");
    setToEmail(suppliers.find((s) => s.id === supplierId)?.contact_email || "");
    setSubject("");
    setBody("");
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

  function handleGenerateDraft() {
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
        to_email: effectiveEmail.trim(),
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

  function handleSubmit(e) {
    e.preventDefault();
    if (isNew) {
      const errs = {};
      if (!newName.trim()) errs.name = "Supplier name is required";
      if (!newEmail.trim()) errs.email = "Contact email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) errs.email = "Enter a valid email address";
      if (Object.keys(errs).length) { setNewErrors(errs); return; }
    }
    if (!effectiveEmail.trim() || !subject.trim() || !body.trim()) return;
    sendMutation.mutate();
  }

  // Determine what's ready for draft generation
  const canGenerateDraft = !draftMutation.isPending && (
    (supplierMode === "existing" && effectiveEmail) ||
    (supplierMode === "existing" && !selectedSupplier?.contact_email && toEmail.trim()) ||
    (isNew && newEmail.trim())
  );
  const hasDraft = Boolean(subject || body);
  const canSend = Boolean(
    effectiveEmail.trim() && subject.trim() && body.trim() &&
    !sendMutation.isPending && !draftMutation.isPending
  );

  // ── Success screen ──────────────────────────────────────────
  if (sent) {
    return (
      <ModalBase
        isOpen={true}
        onClose={onClose}
        title="Email sent"
        dialogStyle={{ maxWidth: "440px" }}
      >
        <div className="modal-success">
          <div className="modal-success-icon">✓</div>
          <p className="muted modal-success-copy">
            Your order for <strong>{product.name}</strong> has been sent to <strong>{effectiveEmail}</strong>.
          </p>
          {isNew && newName.trim() ? (
            <p className="muted modal-success-note">
              {savedNewSupplier
                ? `${newName} has been saved to your suppliers.`
                : createSupplierMutation.isPending ? "Saving supplier…" : ""}
            </p>
          ) : (
            <div className="modal-success-spacer" />
          )}
          <button type="button" onClick={onClose}>Done</button>
        </div>
      </ModalBase>
    );
  }

  return (
    <ModalBase
      isOpen={true}
      isBlocking={sendMutation.isPending || draftMutation.isPending || createSupplierMutation.isPending}
      onClose={onClose}
      eyebrow="Order Now"
      title={product?.name}
      dialogStyle={{ maxWidth: "560px" }}
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-grid-two">
          <label className="field-group">
            <span className="field-label">Quantity</span>
            <input type="number" min="0.01" step="0.01" value={quantity}
              onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className="field-group">
            <span className="field-label">Unit</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
        </div>

        <div className="field-group">
          <span className="field-label">Supplier</span>

          {hasExisting && supplierMode !== "new" && (
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setSupplierMode(e.target.value ? "existing" : "none");
              }}
            >
              <option value="">— Select a supplier —</option>
              {suppliers.map((s) => {
                const isLinked = (s.product_ids || []).includes(product?.id);
                return (
                  <option key={s.id} value={s.id}>
                    {s.name}{isLinked ? " ✓" : ""}
                  </option>
                );
              })}
            </select>
          )}

          {supplierMode !== "new" && (
            <button
              type="button"
              className="ghost-button modal-inline-action"
              onClick={() => { setSupplierMode("new"); setSupplierId(""); setToEmail(""); setSubject(""); setBody(""); }}
            >
              + Add new supplier
            </button>
          )}

          {supplierMode === "new" && (
            <div className="modal-inline-stack">
              <div>
                <input value={newName}
                  onChange={(e) => { setNewName(e.target.value); setNewErrors((n) => ({ ...n, name: "" })); }}
                  placeholder="Supplier name *" autoFocus />
                {newErrors.name && <span className="field-error">{newErrors.name}</span>}
              </div>
              <input value={newContact} onChange={(e) => setNewContact(e.target.value)}
                placeholder="Contact name (optional)" />
              <div>
                <input type="email" value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setNewErrors((n) => ({ ...n, email: "" })); }}
                  placeholder="Contact email *" />
                {newErrors.email && <span className="field-error">{newErrors.email}</span>}
              </div>
              {hasExisting && (
                <button type="button" className="ghost-button modal-inline-action modal-inline-action-left"
                  onClick={switchToExisting}>
                  ← Choose from existing suppliers
                </button>
              )}
            </div>
          )}
        </div>

        {supplierMode === "existing" && selectedSupplier && !selectedSupplier.contact_email && (
          <label className="field-group">
            <span className="field-label">
              Contact email
              <span className="muted field-optional">(not on file)</span>
            </span>
            <input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)}
              placeholder="supplier@example.co.nz" />
          </label>
        )}

        {canGenerateDraft && (
          <div>
            <button
              type="button"
              className="secondary-button modal-full-width-button"
              onClick={handleGenerateDraft}
              disabled={draftMutation.isPending}
            >
              {draftMutation.isPending
                ? "AI is drafting…"
                : hasDraft
                ? "Regenerate email"
                : "Generate email"}
            </button>
          </div>
        )}

        {hasDraft && !draftMutation.isPending && (
          <>
            <label className="field-group">
              <span className="field-label">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Purchase order subject" />
            </label>
            <label className="field-group">
              <span className="field-label">Message</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8}
                placeholder="Email body"
                className="modal-message-input" />
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
          <button type="button" className="secondary-button mobile-modal-cancel"
            onClick={onClose} disabled={sendMutation.isPending}>
            Cancel
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
