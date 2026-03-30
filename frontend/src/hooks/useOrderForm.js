import { useState } from "react";

const presetUnits = ["kg", "L", "tonnes", "units", "mL"];

export const emptyOrder = {
  date: new Date().toISOString().slice(0, 10),
  product_name: "",
  category: "feed",
  quantity: 1,
  unit: "units",
  unit_price: 0,
  total_price: 0,
  supplier_id: "",
  notes: "",
};

export default function useOrderForm() {
  const [draft, setDraft] = useState(emptyOrder);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [unitMode, setUnitMode] = useState("preset");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  function resetFormState() {
    setDraft({ ...emptyOrder });
    setEditingOrderId(null);
    setUnitMode("preset");
    setErrors({});
    setSubmitError("");
  }

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  }

  function handleUnitSelect(event) {
    const { value } = event.target;
    if (value === "Custom...") {
      setUnitMode("custom");
      setDraft((current) => ({ ...current, unit: "" }));
      return;
    }

    setUnitMode("preset");
    setDraft((current) => ({ ...current, unit: value }));
    setErrors((current) => ({ ...current, unit: "" }));
  }

  function validateDraft() {
    const nextErrors = {};
    if (!draft.date) {
      nextErrors.date = "Purchase date is required";
    }
    if (!draft.product_name.trim()) {
      nextErrors.product_name = "Product name is required";
    }
    if (!draft.category) {
      nextErrors.category = "Category is required";
    }
    if (!draft.quantity || Number(draft.quantity) <= 0) {
      nextErrors.quantity = "Quantity must be greater than 0";
    }
    if (!draft.unit.trim()) {
      nextErrors.unit = "Unit is required";
    }
    if (draft.unit_price === "" || Number(draft.unit_price) < 0) {
      nextErrors.unit_price = "Unit price cannot be negative";
    }
    if (draft.notes && draft.notes.length > 500) {
      nextErrors.notes = "Notes must be 500 characters or fewer";
    }
    return nextErrors;
  }

  function getPayload() {
    const quantity = Number(draft.quantity);
    const unitPrice = Number(draft.unit_price);

    return {
      ...draft,
      quantity,
      unit_price: unitPrice,
      total_price: Number((quantity * unitPrice).toFixed(2)),
      supplier_id: draft.supplier_id || "",
    };
  }

  function handleEdit(order) {
    const isPresetUnit = presetUnits.includes(order.unit);
    setUnitMode(isPresetUnit ? "preset" : "custom");
    setEditingOrderId(order.id);
    setDraft({
      date: order.date,
      product_name: order.product_name,
      category: order.category,
      quantity: order.quantity,
      unit: order.unit,
      unit_price: order.unit_price || 0,
      total_price: order.total_price || 0,
      supplier_id: order.supplier_id || "",
      notes: order.notes || "",
    });
    setErrors({});
    setSubmitError("");
  }

  return {
    draft,
    editingOrderId,
    unitMode,
    errors,
    submitError,
    setSubmitError,
    setErrors,
    resetFormState,
    updateField,
    handleUnitSelect,
    validateDraft,
    getPayload,
    handleEdit,
  };
}
