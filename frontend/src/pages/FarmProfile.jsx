import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { useAuth } from "../context/AuthContext";
import SupplierModal from "../components/SupplierModal";
import ModalBase from "../components/ModalBase";
import PageState from "../components/PageState";
import { useCurrentFarm } from "../context/CurrentFarmContext";
import useFarmProfileForm from "../hooks/useFarmProfileForm";
import { formatDaysLabel } from "../utils/formatters";

/* ── Subscription banner ──────────────────────────────────── */

function SubBanner({ subStatus, trialDaysLeft }) {
  const active = subStatus?.status === "active";
  return (
    <div className={`sub-banner ${active ? "sub-banner-active" : "sub-banner-trial"}`}>
      <span className="sub-banner-label">
        {active
          ? "Active subscription — all features unlocked"
          : subStatus?.status === "trialing"
          ? `Free trial — ${formatDaysLabel(trialDaysLeft)} remaining`
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
    <ModalBase
      isOpen={true}
      isBlocking={saving}
      onClose={onClose}
      eyebrow="Farm Profile"
      title="Edit profile"
    >
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
    </ModalBase>
  );
}

/* ── Add / Edit supplier modal is now SupplierModal component ── */

/* ── Main page ────────────────────────────────────────────── */

export default function FarmProfilePage() {
  const queryClient = useQueryClient();
  const { trialDaysLeft } = useAuth();
  const { currentFarm, currentFarmId, farmsQuery } = useCurrentFarm();

  const farmQuery = useQuery({
    queryKey: queryKeys.farms.detail(currentFarmId),
    queryFn: () => api.getFarm(currentFarmId),
    enabled: Boolean(currentFarmId),
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(currentFarmId),
    queryFn: () => api.getSuppliers(currentFarmId),
    enabled: Boolean(currentFarmId),
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.products(),
    queryFn: api.getProducts,
  });

  const subStatusQuery = useQuery({
    queryKey: queryKeys.subscription(),
    queryFn: () => api.getSubscriptionStatus(),
  });

  const [editing, setEditing] = useState(false);
  const {
    draft,
    errors,
    submitError,
    setErrors,
    setSubmitError,
    syncDraft,
    updateField,
    validate,
    getPayload,
  } = useFarmProfileForm(farmQuery.data || currentFarm || null);

  // null = closed, false = add mode, supplier object = edit mode
  const [supplierModal, setSupplierModal] = useState(null);
  const [supplierError, setSupplierError] = useState("");

  useEffect(() => {
    if (farmQuery.data && !editing) {
      syncDraft(farmQuery.data);
    }
  }, [editing, farmQuery.data, syncDraft]);

  /* profile mutations */
  const updateMutation = useMutation({
    mutationFn: (payload) => api.updateFarm(currentFarmId, payload),
    onSuccess: () => {
      setSubmitError("");
      setErrors({});
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.farms.detail(currentFarmId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.farms.all() });
    },
    onError: (err) => setSubmitError(err.message || "Unable to save farm profile"),
  });

  /* supplier mutations */
  const createSupplierMutation = useMutation({
    mutationFn: async ({ product_ids, ...data }) => {
      const supplier = await api.createSupplier(currentFarmId, data);
      if (product_ids?.length) {
        await api.setSupplierProducts(currentFarmId, supplier.id, product_ids);
      }
      return supplier;
    },
    onSuccess: () => {
      setSupplierModal(null);
      setSupplierError("");
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(currentFarmId) });
    },
    onError: (err) => setSupplierError(err.message || "Failed to add supplier"),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, product_ids, ...data }) => {
      await api.updateSupplier(currentFarmId, id, data);
      await api.setSupplierProducts(currentFarmId, id, product_ids || []);
    },
    onSuccess: () => {
      setSupplierModal(null);
      setSupplierError("");
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(currentFarmId) });
    },
    onError: (err) => setSupplierError(err.message || "Failed to update supplier"),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId) => api.deleteSupplier(currentFarmId, supplierId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(currentFarmId) }),
  });

  if (farmsQuery.isLoading) {
    return (
      <PageState
        title="Loading farm context"
        message="We are working out which farm profile to show."
      />
    );
  }

  if (farmsQuery.isError) {
    return (
      <PageState
        tone="error"
        title="Unable to load farms"
        message={farmsQuery.error?.message || "We could not load your farms."}
        actionLabel="Try again"
        onAction={() => farmsQuery.refetch()}
      />
    );
  }

  if (!currentFarm) {
    return (
      <PageState
        title="No farms yet"
        message="Create or connect a farm before managing profile and suppliers."
      />
    );
  }

  if (farmQuery.isLoading || suppliersQuery.isLoading || productsQuery.isLoading || subStatusQuery.isLoading) {
    return (
      <PageState
        title="Loading farm profile"
        message={`Fetching profile, supplier, and subscription data for ${currentFarm.name}.`}
      />
    );
  }

  if (farmQuery.isError || suppliersQuery.isError || productsQuery.isError || subStatusQuery.isError) {
    return (
      <PageState
        tone="error"
        title="Farm profile could not be loaded"
        message={
          farmQuery.error?.message ||
          suppliersQuery.error?.message ||
          productsQuery.error?.message ||
          subStatusQuery.error?.message ||
          "Something went wrong while loading this farm."
        }
        actionLabel="Try again"
        onAction={() => {
          farmQuery.refetch();
          suppliersQuery.refetch();
          productsQuery.refetch();
          subStatusQuery.refetch();
        }}
      />
    );
  }

  if (!draft) {
    return (
      <PageState
        title="No farm profile found"
        message="This farm does not have a profile record yet."
      />
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    updateMutation.mutate(getPayload());
  }

  function handleCancelEdit() {
    syncDraft(farmQuery.data);
    setErrors({});
    setSubmitError("");
    setEditing(false);
  }

  const suppliers = suppliersQuery.data || [];
  const products = productsQuery.data || [];

  return (
    <div className="page-grid two-column">
      {/* ── Left: profile ── */}
      <section className="panel">
        <SubBanner
          subStatus={subStatusQuery.data}
          trialDaysLeft={trialDaysLeft}
        />

        <div className="panel-header panel-header-offset">
          <h3>Farm Profile</h3>
          <button
            type="button"
            className="secondary-button panel-action-button"
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
            className="secondary-button panel-action-button"
            onClick={() => { setSupplierModal(false); setSupplierError(""); }}
          >
            + Add
          </button>
        </div>

        {suppliers.length === 0 ? (
          <p className="muted supplier-empty-copy">
            No suppliers yet. Add your first preferred supplier.
          </p>
        ) : (
          <div className="stack">
            {suppliers.map((s) => (
              <article key={s.id} className="supplier-card">
                <div className="supplier-card-header">
                  <h4>{s.name}</h4>
                  <div className="supplier-card-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => { setSupplierModal(s); setSupplierError(""); }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button supplier-remove-button"
                      onClick={() => deleteSupplierMutation.mutate(s.id)}
                      disabled={deleteSupplierMutation.isPending}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {s.contact_name && <p className="muted supplier-contact-copy">{s.contact_name}</p>}
                {s.contact_email && <p className="muted supplier-contact-copy supplier-contact-email">{s.contact_email}</p>}
                {(s.categories || []).length > 0 && (
                  <div className="supplier-category-row">
                    {s.categories.map((c) => (
                      <span key={c} className="pill pill-green supplier-category-pill">{c}</span>
                    ))}
                  </div>
                )}
                {(s.product_ids || []).length > 0 && (
                  <p className="muted supplier-linked-copy">
                    {s.product_ids.length} product{s.product_ids.length !== 1 ? "s" : ""} linked
                  </p>
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
          onChange={updateField}
          onSubmit={handleSubmit}
          onClose={handleCancelEdit}
          saving={updateMutation.isPending}
        />
      )}

      {/* ── Add / Edit supplier modal ── */}
      {supplierModal !== null && (
        <SupplierModal
          supplier={supplierModal || null}
          products={products}
          allSuppliers={suppliers}
          saving={createSupplierMutation.isPending || updateSupplierMutation.isPending}
          error={supplierError}
          onClose={() => { setSupplierModal(null); setSupplierError(""); }}
          onSave={(data) => {
            if (supplierModal && supplierModal.id) {
              updateSupplierMutation.mutate({ id: supplierModal.id, ...data });
            } else {
              createSupplierMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}
