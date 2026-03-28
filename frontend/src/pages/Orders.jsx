import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import OrderTable from "../components/OrderTable";

const unitOptions = ["kg", "L", "tonnes", "units", "mL", "Custom..."];

const emptyOrder = {
  date: new Date().toISOString().slice(0, 10),
  product_name: "",
  category: "feed",
  quantity: 1,
  unit: "units",
  unit_price: 0,
  total_price: 0,
  supplier_id: "sup-001",
  notes: ""
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyOrder);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [unitMode, setUnitMode] = useState("preset");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.all(),
    queryFn: api.getOrders
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createOrder(payload),
    onSuccess: () => {
      setDraft(emptyOrder);
      setEditingOrderId(null);
      setUnitMode("preset");
      setErrors({});
      setSubmitError("");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },
    onError: (error) => {
      setSubmitError(error.message || "Unable to save order");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, payload }) => api.updateOrder(orderId, payload),
    onSuccess: () => {
      setDraft(emptyOrder);
      setEditingOrderId(null);
      setUnitMode("preset");
      setErrors({});
      setSubmitError("");
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },
    onError: (error) => {
      setSubmitError(error.message || "Unable to update order");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteOrder,
    onSuccess: () => {
      if (editingOrderId) {
        setDraft(emptyOrder);
        setEditingOrderId(null);
        setUnitMode("preset");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    }
  });

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
    if (draft.supplier_id && draft.supplier_id.trim().length < 3) {
      nextErrors.supplier_id = "Supplier ID must be at least 3 characters";
    }
    if (draft.notes && draft.notes.length > 500) {
      nextErrors.notes = "Notes must be 500 characters or fewer";
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

    const quantity = Number(draft.quantity);
    const unitPrice = Number(draft.unit_price);
    const payload = {
      ...draft,
      quantity,
      unit_price: unitPrice,
      total_price: Number((quantity * unitPrice).toFixed(2))
    };

    if (editingOrderId) {
      updateMutation.mutate({ orderId: editingOrderId, payload });
      return;
    }

    createMutation.mutate(payload);
  }

  function handleEdit(order) {
    const isPresetUnit = unitOptions.includes(order.unit);
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
      notes: order.notes || ""
    });
  }

  function handleCancelEdit() {
    setEditingOrderId(null);
    setUnitMode("preset");
    setErrors({});
    setSubmitError("");
    setDraft(emptyOrder);
  }

  return (
    <div className="page-grid two-column">
      <section className="panel">
        <div className="panel-header">
          <h3>{editingOrderId ? "Edit Purchase Record" : "Log Manual Purchase"}</h3>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-group">
            <span className="field-label">Purchase date</span>
            <input name="date" type="date" value={draft.date} onChange={updateField} />
            {errors.date ? <span className="field-error">{errors.date}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Product name</span>
            <input
              name="product_name"
              placeholder="Product name"
              value={draft.product_name}
              onChange={updateField}
            />
            {errors.product_name ? <span className="field-error">{errors.product_name}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Category</span>
            <select name="category" value={draft.category} onChange={updateField}>
              <option value="feed">Feed</option>
              <option value="fertiliser">Fertiliser</option>
              <option value="veterinary">Veterinary</option>
              <option value="chemical">Chemical</option>
              <option value="equipment">Equipment</option>
            </select>
            {errors.category ? <span className="field-error">{errors.category}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Quantity</span>
            <input name="quantity" type="number" step="0.01" value={draft.quantity} onChange={updateField} />
            {errors.quantity ? <span className="field-error">{errors.quantity}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Unit</span>
            <select
              value={unitMode === "custom" ? "Custom..." : draft.unit}
              onChange={handleUnitSelect}
            >
              {unitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {unitMode === "custom" ? (
              <input
                name="unit"
                placeholder="Enter custom unit"
                value={draft.unit}
                onChange={updateField}
              />
            ) : null}
            {errors.unit ? <span className="field-error">{errors.unit}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Unit price</span>
            <input name="unit_price" type="number" step="0.01" value={draft.unit_price} onChange={updateField} />
            {errors.unit_price ? <span className="field-error">{errors.unit_price}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Supplier ID</span>
            <input
              name="supplier_id"
              placeholder="Supplier ID"
              value={draft.supplier_id}
              onChange={updateField}
            />
            {errors.supplier_id ? <span className="field-error">{errors.supplier_id}</span> : null}
          </label>
          <label className="field-group">
            <span className="field-label">Notes</span>
            <textarea name="notes" placeholder="Notes" value={draft.notes} onChange={updateField} rows={3} />
            {errors.notes ? <span className="field-error">{errors.notes}</span> : null}
          </label>
          {submitError ? <p className="form-error-banner">{submitError}</p> : null}
          <div className="form-actions">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingOrderId ? "Save changes" : "Create order"}
            </button>
            {editingOrderId ? (
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <OrderTable
        orders={ordersQuery.data || []}
        editingOrderId={editingOrderId}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
