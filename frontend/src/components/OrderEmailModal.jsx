import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import ModalBase from "./ModalBase";
import SupplierModal from "./SupplierModal";

export default function OrderEmailModal({ product, suppliers, products, farmId, farmName, onClose, onSupplierCreated }) {
  const linkedSuppliers = suppliers.filter((s) => (s.product_ids || []).includes(product?.id));
  const defaultSupplier = linkedSuppliers[0] || null;

  const [supplierId, setSupplierId] = useState(defaultSupplier?.id || "");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState("");

  const [toEmail, setToEmail] = useState(defaultSupplier?.contact_email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(product?.typical_unit || "units");
  const [sent, setSent] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) || null;
  const effectiveEmail = selectedSupplier?.contact_email || toEmail;
  const lockedProductIds = new Set([product?.id].filter(Boolean));

  useEffect(() => {
    setToEmail(selectedSupplier?.contact_email || "");
    setSubject("");
    setBody("");
  }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSupplierChange(e) {
    if (e.target.value === "__add_new__") {
      setShowAddSupplier(true);
      return;
    }
    setSupplierId(e.target.value);
  }

  const createSupplierMutation = useMutation({
    mutationFn: async ({ product_ids, ...data }) => {
      const supplier = await api.createSupplier(farmId, data);
      if (product_ids?.length) {
        await api.setSupplierProducts(farmId, supplier.id, product_ids);
      }
      return supplier;
    },
    onSuccess: (supplier) => {
      setShowAddSupplier(false);
      setSupplierError("");
      setSupplierId(supplier.id);
      setToEmail(supplier.contact_email || "");
      setSubject("");
      setBody("");
      onSupplierCreated?.();
    },
    onError: (err) => {
      setSupplierError(err.message || "Could not create supplier");
    },
  });

  const draftMutation = useMutation({
    mutationFn: () =>
      api.draftOrderEmail({
        product_name: product.name,
        quantity: Number(quantity),
        unit,
        supplier_name: selectedSupplier?.name || "Supplier",
        supplier_contact: selectedSupplier?.contact_name || null,
      }),
    onSuccess: (data) => {
      setSubject(data.subject || "");
      setBody(data.body || "");
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
    onSuccess: () => setSent(true),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!effectiveEmail.trim() || !subject.trim() || !body.trim()) return;
    sendMutation.mutate();
  }

  const canGenerateDraft =
    !draftMutation.isPending &&
    Boolean(supplierId && (selectedSupplier?.contact_email || toEmail.trim()));

  const hasDraft = Boolean(subject || body);
  const canSend = Boolean(
    effectiveEmail.trim() && subject.trim() && body.trim() &&
    !sendMutation.isPending && !draftMutation.isPending
  );

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
            Your order for <strong>{product.name}</strong> has been sent to{" "}
            <strong>{effectiveEmail}</strong>.
          </p>
          <div className="modal-success-spacer" />
          <button type="button" onClick={onClose}>Done</button>
        </div>
      </ModalBase>
    );
  }

  return (
    <>
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

          <label className="field-group">
            <span className="field-label">Supplier</span>
            <select value={supplierId} onChange={handleSupplierChange}>
              <option value="">— Select a supplier —</option>
              <option value="__add_new__">＋ Add new supplier</option>
              {suppliers.length > 0 && <option disabled>──────────────</option>}
              {suppliers.map((s) => {
                const isLinked = (s.product_ids || []).includes(product?.id);
                return (
                  <option key={s.id} value={s.id}>
                    {s.name}{isLinked ? " ✓" : ""}
                  </option>
                );
              })}
            </select>
          </label>

          {selectedSupplier && !selectedSupplier.contact_email && (
            <label className="field-group">
              <span className="field-label">
                Contact email{" "}
                <span className="muted field-optional">(not on file)</span>
              </span>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="supplier@example.co.nz"
              />
            </label>
          )}

          {canGenerateDraft && (
            <div>
              <button
                type="button"
                className="secondary-button modal-full-width-button"
                onClick={() => { setSubject(""); setBody(""); draftMutation.mutate(); }}
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
                  placeholder="Email body" className="modal-message-input" />
              </label>
            </>
          )}

          {sendMutation.isError && (
            <p className="form-error-banner">
              {sendMutation.error?.message || "Failed to send email"}
            </p>
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

      {showAddSupplier && (
        <SupplierModal
          supplier={null}
          products={products}
          allSuppliers={suppliers}
          lockedProductIds={lockedProductIds}
          saving={createSupplierMutation.isPending}
          error={supplierError}
          onClose={() => { setShowAddSupplier(false); setSupplierError(""); }}
          onSave={(data) => createSupplierMutation.mutate(data)}
        />
      )}
    </>
  );
}
