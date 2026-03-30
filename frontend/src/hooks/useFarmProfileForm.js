import { useCallback, useState } from "react";

export default function useFarmProfileForm(farm) {
  const [draft, setDraft] = useState(farm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const syncDraft = useCallback((nextFarm) => {
    setDraft(nextFarm);
  }, []);

  const updateField = useCallback((event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  }, []);

  function validate() {
    const nextErrors = {};

    if (!draft?.name?.trim() || draft.name.trim().length < 2) {
      nextErrors.name = "Farm name must be at least 2 characters";
    }
    if (!draft?.region?.trim() || draft.region.trim().length < 2) {
      nextErrors.region = "Region must be at least 2 characters";
    }
    if (!draft?.farm_type) {
      nextErrors.farm_type = "Farm type is required";
    }
    if (!draft?.herd_size || Number(draft.herd_size) <= 0) {
      nextErrors.herd_size = "Herd size must be greater than 0";
    }
    if (!draft?.land_area_ha || Number(draft.land_area_ha) <= 0) {
      nextErrors.land_area_ha = "Land area must be greater than 0";
    }
    if (
      draft?.whatsapp_number?.trim().length > 0 &&
      draft.whatsapp_number.trim().length < 8
    ) {
      nextErrors.whatsapp_number = "FarmStock bot contact looks too short";
    }
    if (draft?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      nextErrors.email = "Enter a valid email address";
    }

    return nextErrors;
  }

  function getPayload() {
    return {
      name: draft.name,
      region: draft.region,
      farm_type: draft.farm_type,
      herd_size: Number(draft.herd_size),
      land_area_ha: Number(draft.land_area_ha),
      whatsapp_number: draft.whatsapp_number,
      email: draft.email,
    };
  }

  return {
    draft,
    errors,
    submitError,
    setErrors,
    setSubmitError,
    syncDraft,
    updateField,
    validate,
    getPayload,
  };
}
