import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { useAuth } from "../context/AuthContext";

/* ── Subscription banner ──────────────────────────────────── */

function SubBanner({ subStatus, trialDaysLeft }) {
  const active = subStatus?.status === "active";
  return (
    <div className={`sub-banner ${active ? "sub-banner-active" : "sub-banner-trial"}`}>
      <span className="sub-banner-label">
        {active
          ? "Active subscription — all features unlocked"
          : subStatus?.status === "trialing"
          ? `Free trial — ${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} remaining`
          : subStatus
          ? "Trial expired"
          : "Loading…"}
      </span>
      {subStatus && !active && (
        <Link to="/pricing" className="sub-banner-cta">Upgrade →</Link>
      )}
    </div>
  );
}

/* ── Profile view (read-only) ─────────────────────────────── */

function ProfileView({ farm }) {
  const rows = [
    { label: "Farm name",             value: farm.name },
    { label: "Region",                value: farm.region },
    { label: "Farm type",             value: farm.farm_type },
    { label: "Herd size",             value: farm.herd_size },
    { label: "Land area (ha)",        value: farm.land_area_ha },
    { label: "FarmStock bot contact", value: farm.whatsapp_number || "—" },
    { label: "Email",                 value: farm.email || "—" },
  ];
  return (
    <div className="profile-view">
      {rows.map(({ label, value }) => (
        <div key={label} className="profile-row">
          <span className="profile-row-label">{label}</span>
          <span className="profile-row-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Edit profile modal ───────────────────────────────────── */

function EditProfileModal({ draft, errors, submitError, onChange, onSubmit, onClose, saving }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow field-label">Farm Profile</p>
            <h3>Edit profile</h3>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}
            style={{ padding: 0, width: "32px", height: "32px", borderRadius: "999px", fontSize: "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ×
          </button>
        </div>

        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field-group">
            <span className="field-label">Farm name</span>
            <input name="name" value={draft.name} onChange={onChange} autoFocus />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">Region</span>
            <input name="region" value={draft.region || ""} onChange={onChange} />
            {errors.region && <span className="field-error">{errors.region}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">Farm type</span>
            <select name="farm_type" value={draft.farm_type || "dairy"} onChange={onChange}>
              <option value="dairy">Dairy</option>
              <option value="beef">Beef</option>
              <option value="sheep">Sheep</option>
              <option value="mixed">Mixed</option>
            </select>
            {errors.farm_type && <span className="field-error">{errors.farm_type}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">Herd size</span>
            <input name="herd_size" type="number" value={draft.herd_size || 0} onChange={onChange} />
            {errors.herd_size && <span className="field-error">{errors.herd_size}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">Land area (ha)</span>
            <input name="land_area_ha" type="number" value={draft.land_area_ha || 0} onChange={onChange} />
            {errors.land_area_ha && <span className="field-error">{errors.land_area_ha}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">FarmStock bot contact</span>
            <input name="whatsapp_number" value={draft.whatsapp_number || ""} onChange={onChange} />
            {errors.whatsapp_number && <span className="field-error">{errors.whatsapp_number}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">Email</span>
            <input name="email" value={draft.email || ""} onChange={onChange} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          {submitError && <p className="form-error-banner">{submitError}</p>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Add supplier modal ───────────────────────────────────── */

const EMPTY_SUPPLIER = { name: "", contact_name: "", contact_email: "", categories: "" };

function AddSupplierModal({ onClose, onSave, saving, error }) {
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [fieldErrors, setFieldErrors] = useState({});
  const set = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [e.target.name]: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Supplier name is required";
    if (!form.contact_email.trim()) errs.contact_email = "Contact email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) errs.contact_email = "Enter a valid email address";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    onSave({
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim(),
      categories: form.categories
        ? form.categories.split(",").map((c) => c.trim()).filter(Boolean)
        : [],
    });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow field-label">Preferred Suppliers</p>
            <h3>Add supplier</h3>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}
            style={{ padding: 0, width: "32px", height: "32px", borderRadius: "999px", fontSize: "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ×
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-group">
            <span className="field-label">Supplier name <span style={{ color: "var(--red)" }}>*</span></span>
            <input name="name" value={form.name} onChange={set} placeholder="e.g. AgriSupply NZ" autoFocus />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">Contact name <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span>
            <input name="contact_name" value={form.contact_name} onChange={set} placeholder="e.g. Jane Smith" />
          </label>
          <label className="field-group">
            <span className="field-label">Contact email <span style={{ color: "var(--red)" }}>*</span></span>
            <input name="contact_email" type="email" value={form.contact_email} onChange={set} placeholder="jane@supplier.co.nz" />
            {fieldErrors.contact_email && <span className="field-error">{fieldErrors.contact_email}</span>}
          </label>
          <label className="field-group">
            <span className="field-label">Categories <span className="muted" style={{ fontWeight: 400 }}>(comma-separated)</span></span>
            <input name="categories" value={form.categories} onChange={set} placeholder="e.g. Feed, Supplements, Dairy" />
          </label>
          {error && <p className="form-error-banner">{error}</p>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add supplier"}
            </button>
            <button
              type="button"
              className="secondary-button mobile-modal-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */

export default function FarmProfilePage() {
  const queryClient = useQueryClient();
  const { trialDaysLeft } = useAuth();

  const farmsQuery = useQuery({ queryKey: queryKeys.farms.all(), queryFn: api.getFarms });
  const farmId = farmsQuery.data?.[0]?.id;

  const farmQuery = useQuery({
    queryKey: queryKeys.farms.detail(farmId),
    queryFn: () => api.getFarm(farmId),
    enabled: !!farmId,
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(farmId),
    queryFn: () => api.getSuppliers(farmId),
    enabled: !!farmId,
  });

  const subStatusQuery = useQuery({
    queryKey: queryKeys.subscription(),
    queryFn: () => api.getSubscriptionStatus(),
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState("");

  useEffect(() => {
    if (farmQuery.data) setDraft(farmQuery.data);
  }, [farmQuery.data]);

  /* profile mutations */
  const updateMutation = useMutation({
    mutationFn: (payload) => api.updateFarm(farmId, payload),
    onSuccess: () => {
      setSubmitError("");
      setErrors({});
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.farms.detail(farmId) });
    },
    onError: (err) => setSubmitError(err.message || "Unable to save farm profile"),
  });

  /* supplier mutations */
  const createSupplierMutation = useMutation({
    mutationFn: (data) => api.createSupplier(farmId, data),
    onSuccess: () => {
      setShowAddSupplier(false);
      setSupplierError("");
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(farmId) });
    },
    onError: (err) => setSupplierError(err.message || "Failed to add supplier"),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId) => api.deleteSupplier(farmId, supplierId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(farmId) }),
  });

  if (!draft) return <section className="panel">Loading farm profile…</section>;

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setDraft((d) => ({ ...d, [name]: value }));
    setErrors((d) => ({ ...d, [name]: "" }));
    setSubmitError("");
  }

  function validate() {
    const e = {};
    if (!draft.name?.trim() || draft.name.trim().length < 2) e.name = "Farm name must be at least 2 characters";
    if (!draft.region?.trim() || draft.region.trim().length < 2) e.region = "Region must be at least 2 characters";
    if (!draft.farm_type) e.farm_type = "Farm type is required";
    if (!draft.herd_size || Number(draft.herd_size) <= 0) e.herd_size = "Herd size must be greater than 0";
    if (!draft.land_area_ha || Number(draft.land_area_ha) <= 0) e.land_area_ha = "Land area must be greater than 0";
    if (draft.whatsapp_number?.trim().length > 0 && draft.whatsapp_number.trim().length < 8)
      e.whatsapp_number = "FarmStock bot contact looks too short";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) e.email = "Enter a valid email address";
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    updateMutation.mutate({
      name: draft.name,
      region: draft.region,
      farm_type: draft.farm_type,
      herd_size: Number(draft.herd_size),
      land_area_ha: Number(draft.land_area_ha),
      whatsapp_number: draft.whatsapp_number,
      email: draft.email,
    });
  }

  function handleCancelEdit() {
    setDraft(farmQuery.data);
    setErrors({});
    setSubmitError("");
    setEditing(false);
  }

  const suppliers = suppliersQuery.data || [];

  return (
    <div className="page-grid two-column">
      {/* ── Left: profile ── */}
      <section className="panel">
        <SubBanner
          subStatus={subStatusQuery.data}
          trialDaysLeft={trialDaysLeft}
        />

        <div className="panel-header" style={{ marginTop: "1.25rem" }}>
          <h3>Farm Profile</h3>
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: "0.825rem", padding: "0.35rem 0.85rem" }}
            onClick={() => setEditing(true)}
          >
            Edit profile
          </button>
        </div>

        <ProfileView farm={draft} />
      </section>

      {/* ── Right: suppliers ── */}
      <section className="panel">
        <div className="panel-header">
          <h3>Preferred Suppliers</h3>
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: "0.825rem", padding: "0.35rem 0.85rem" }}
            onClick={() => { setShowAddSupplier(true); setSupplierError(""); }}
          >
            + Add
          </button>
        </div>

        {suppliers.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.875rem" }}>
            No suppliers yet. Add your first preferred supplier.
          </p>
        ) : (
          <div className="stack">
            {suppliers.map((s) => (
              <article key={s.id} className="supplier-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <h4>{s.name}</h4>
                  <button
                    type="button"
                    className="ghost-button"
                    style={{ fontSize: "0.8rem", flexShrink: 0 }}
                    onClick={() => deleteSupplierMutation.mutate(s.id)}
                    disabled={deleteSupplierMutation.isPending}
                  >
                    Remove
                  </button>
                </div>
                {s.contact_name && <p className="muted" style={{ fontSize: "0.85rem", margin: "0.2rem 0 0" }}>{s.contact_name}</p>}
                {s.contact_email && <p className="muted" style={{ fontSize: "0.85rem", margin: "0.15rem 0 0" }}>{s.contact_email}</p>}
                {(s.categories || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
                    {s.categories.map((c) => (
                      <span key={c} className="pill pill-green" style={{ fontSize: "0.72rem" }}>{c}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Edit profile modal ── */}
      {editing && (
        <EditProfileModal
          draft={draft}
          errors={errors}
          submitError={submitError}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onClose={handleCancelEdit}
          saving={updateMutation.isPending}
        />
      )}

      {/* ── Add supplier modal ── */}
      {showAddSupplier && (
        <AddSupplierModal
          onClose={() => setShowAddSupplier(false)}
          onSave={(data) => createSupplierMutation.mutate(data)}
          saving={createSupplierMutation.isPending}
          error={supplierError}
        />
      )}
    </div>
  );
}
