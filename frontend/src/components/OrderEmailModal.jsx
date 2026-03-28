import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";

export default function OrderEmailModal({ product, suppliers, farmName, onClose }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(product?.typical_unit || "units");
  const [sent, setSent] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) || null;
  const supplierHasEmail = Boolean(selectedSupplier?.contact_email);

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // When supplier changes, auto-fill email and trigger draft
  useEffect(() => {
    if (!selectedSupplier) return;
    if (selectedSupplier.contact_email) {
      setToEmail(selectedSupplier.contact_email);
    } else {
      setToEmail("");
    }
  }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftMutation = useMutation({
    mutationFn: () =>
      api.draftOrderEmail({
        product_name: product.name,
        quantity: Number(quantity),
        unit,
        supplier_name: selectedSupplier?.name || "",
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
        to_email: toEmail.trim(),
        subject,
        body,
        farm_name: farmName,
      }),
    onSuccess: () => setSent(true),
  });

  // Auto-draft when email is available and subject is empty
  useEffect(() => {
    if (toEmail && product && !subject && !draftMutation.isPending) {
      draftMutation.mutate();
    }
  }, [toEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger draft when user manually types email and confirms
  function handleGenerateDraft() {
    draftMutation.mutate();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!toEmail.trim() || !subject.trim() || !body.trim()) return;
    sendMutation.mutate();
  }

  if (sent) {
    return (
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-dialog" style={{ maxWidth: "440px", textAlign: "center" }}>
          <div style={{ padding: "2rem 1.5rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✓</div>
            <h3 style={{ margin: "0 0 0.5rem" }}>Email sent</h3>
            <p className="muted" style={{ fontSize: "0.9rem", margin: "0 0 1.5rem" }}>
              Your order for <strong>{product.name}</strong> has been sent to {toEmail}.
            </p>
            <button type="button" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

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
          {suppliers.length > 0 && (
            <label className="field-group">
              <span className="field-label">Supplier</span>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* Supplier email — auto-filled or manual entry */}
          <label className="field-group">
            <span className="field-label">
              Supplier email
              {!supplierHasEmail && (
                <span className="muted" style={{ fontWeight: 400, marginLeft: "0.4rem" }}>
                  (not on file — enter below)
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="supplier@example.co.nz"
                style={{ flex: 1 }}
              />
              {!supplierHasEmail && toEmail && (
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

          {/* Email draft — shown once email is set */}
          {toEmail && (
            <>
              {draftMutation.isPending && (
                <p className="muted" style={{ fontSize: "0.875rem", margin: 0 }}>AI is drafting the email…</p>
              )}
              {!draftMutation.isPending && (
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
            </>
          )}

          {sendMutation.isError && (
            <p className="form-error-banner">{sendMutation.error?.message || "Failed to send email"}</p>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={sendMutation.isPending || draftMutation.isPending || !toEmail.trim() || !subject.trim() || !body.trim()}
            >
              {sendMutation.isPending ? "Sending…" : "Send order email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
