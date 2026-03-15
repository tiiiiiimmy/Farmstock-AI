import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, DEFAULT_FARM_ID } from "../api/client";

export default function FarmProfilePage() {
  const queryClient = useQueryClient();
  const farmQuery = useQuery({
    queryKey: ["farm"],
    queryFn: () => api.getFarm(DEFAULT_FARM_ID)
  });
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (farmQuery.data) {
      setDraft(farmQuery.data);
    }
  }, [farmQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload) => api.updateFarm(DEFAULT_FARM_ID, payload),
    onSuccess: () => {
      setSubmitError("");
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["farm"] });
    },
    onError: (error) => {
      setSubmitError(error.message || "Unable to save farm profile");
    }
  });

  if (!draft) {
    return <section className="panel">Loading farm profile...</section>;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  }

  function validateDraft() {
    const nextErrors = {};
    if (!draft.name?.trim() || draft.name.trim().length < 2) {
      nextErrors.name = "Farm name must be at least 2 characters";
    }
    if (!draft.region?.trim() || draft.region.trim().length < 2) {
      nextErrors.region = "Region must be at least 2 characters";
    }
    if (!draft.farm_type) {
      nextErrors.farm_type = "Farm type is required";
    }
    if (!draft.herd_size || Number(draft.herd_size) <= 0) {
      nextErrors.herd_size = "Herd size must be greater than 0";
    }
    if (!draft.land_area_ha || Number(draft.land_area_ha) <= 0) {
      nextErrors.land_area_ha = "Land area must be greater than 0";
    }
    if (draft.whatsapp_number && draft.whatsapp_number.trim().length < 8) {
      nextErrors.whatsapp_number = "FarmStock bot contact looks too short";
    }
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      nextErrors.email = "Enter a valid email address";
    }
    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateDraft();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    updateMutation.mutate({
      name: draft.name,
      region: draft.region,
      farm_type: draft.farm_type,
      herd_size: Number(draft.herd_size),
      land_area_ha: Number(draft.land_area_ha),
      whatsapp_number: draft.whatsapp_number,
      email: draft.email
    });
  }

  return (
    <div className="page-grid two-column">
      <section className="panel">
        <div className="panel-header">
          <h3>Farm Profile</h3>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-group">
            <span className="field-label">Farm name</span>
            <input name="name" value={draft.name} onChange={updateField} />
            {errors.name ? <span className="field-error">{errors.name}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Region</span>
            <input name="region" value={draft.region || ""} onChange={updateField} />
            {errors.region ? <span className="field-error">{errors.region}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Farm type</span>
            <select name="farm_type" value={draft.farm_type || "dairy"} onChange={updateField}>
              <option value="dairy">Dairy</option>
              <option value="beef">Beef</option>
              <option value="sheep">Sheep</option>
              <option value="mixed">Mixed</option>
            </select>
            {errors.farm_type ? <span className="field-error">{errors.farm_type}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Herd size</span>
            <input name="herd_size" type="number" value={draft.herd_size || 0} onChange={updateField} />
            {errors.herd_size ? <span className="field-error">{errors.herd_size}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Land area (ha)</span>
            <input name="land_area_ha" type="number" value={draft.land_area_ha || 0} onChange={updateField} />
            {errors.land_area_ha ? <span className="field-error">{errors.land_area_ha}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">FarmStock bot contact</span>
            <input name="whatsapp_number" value={draft.whatsapp_number || ""} onChange={updateField} />
            {errors.whatsapp_number ? <span className="field-error">{errors.whatsapp_number}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Email</span>
            <input name="email" value={draft.email || ""} onChange={updateField} />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>
          {submitError ? <p className="form-error-banner">{submitError}</p> : null}
          <button type="submit">Save profile</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Preferred Suppliers</h3>
        </div>

        <div className="stack">
          {(draft.suppliers || []).map((supplier) => (
            <article key={supplier.id} className="supplier-card">
              <h4>{supplier.name}</h4>
              <p>{supplier.contact_name}</p>
              <p>{supplier.contact_email}</p>
              <p>{(supplier.categories || []).join(", ")}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
