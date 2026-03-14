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

  useEffect(() => {
    if (farmQuery.data) {
      setDraft(farmQuery.data);
    }
  }, [farmQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload) => api.updateFarm(DEFAULT_FARM_ID, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm"] });
    }
  });

  if (!draft) {
    return <section className="panel">Loading farm profile...</section>;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
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
          <input name="name" value={draft.name} onChange={updateField} />
          <input name="region" value={draft.region || ""} onChange={updateField} />
          <select name="farm_type" value={draft.farm_type || "dairy"} onChange={updateField}>
            <option value="dairy">Dairy</option>
            <option value="beef">Beef</option>
            <option value="sheep">Sheep</option>
            <option value="mixed">Mixed</option>
          </select>
          <input name="herd_size" type="number" value={draft.herd_size || 0} onChange={updateField} />
          <input name="land_area_ha" type="number" value={draft.land_area_ha || 0} onChange={updateField} />
          <input name="whatsapp_number" value={draft.whatsapp_number || ""} onChange={updateField} />
          <input name="email" value={draft.email || ""} onChange={updateField} />
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
