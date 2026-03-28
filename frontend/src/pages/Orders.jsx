import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import OrderFormModal from "../components/OrderFormModal";
import OrderTable from "../components/OrderTable";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },
    onError: (error) => {
      setSubmitError(error.message || "Unable to save order");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, payload }) => api.updateOrder(orderId, payload),
    onSuccess: () => {
      handleCloseModal();
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
        handleCloseModal();
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    }
  });

  function resetFormState() {
    setDraft(emptyOrder);
    setEditingOrderId(null);
    setUnitMode("preset");
    setErrors({});
    setSubmitError("");
  }

  function handleOpenCreate() {
    resetFormState();
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetFormState();
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
    const presetUnits = ["kg", "L", "tonnes", "units", "mL"];
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
      notes: order.notes || ""
    });
    setErrors({});
    setSubmitError("");
    setIsModalOpen(true);
  }

  return (
    <>
      <div className="page-grid">
        <OrderTable
          orders={ordersQuery.data || []}
          editingOrderId={editingOrderId}
          onCreate={handleOpenCreate}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>

      <OrderFormModal
        isOpen={isModalOpen}
        editingOrderId={editingOrderId}
        draft={draft}
        errors={errors}
        submitError={submitError}
        unitMode={unitMode}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={handleCloseModal}
        onFieldChange={updateField}
        onUnitSelect={handleUnitSelect}
        onSubmit={handleSubmit}
      />
    </>
  );
}
