import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, DEFAULT_FARM_ID } from "../api/client";
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
  const [draft, setDraft] = useState(emptyOrder);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(DEFAULT_FARM_ID)
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createOrder(DEFAULT_FARM_ID, payload),
    onSuccess: () => {
      setDraft(emptyOrder);
      setEditingOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, payload }) => api.updateOrder(orderId, payload),
    onSuccess: () => {
      setDraft(emptyOrder);
      setEditingOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteOrder,
    onSuccess: () => {
      if (editingOrderId) {
        setDraft(emptyOrder);
        setEditingOrderId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  });

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
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
    setDraft(emptyOrder);
  }

  return (
    <div className="page-grid two-column">
      <section className="panel">
        <div className="panel-header">
          <h3>{editingOrderId ? "Edit Purchase Record" : "Log Manual Purchase"}</h3>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <input name="date" type="date" value={draft.date} onChange={updateField} />
          <input name="product_name" placeholder="Product name" value={draft.product_name} onChange={updateField} />
          <select name="category" value={draft.category} onChange={updateField}>
            <option value="feed">Feed</option>
            <option value="fertiliser">Fertiliser</option>
            <option value="veterinary">Veterinary</option>
            <option value="chemical">Chemical</option>
            <option value="equipment">Equipment</option>
          </select>
          <input name="quantity" type="number" step="0.01" value={draft.quantity} onChange={updateField} />
          <input name="unit" placeholder="Unit" value={draft.unit} onChange={updateField} />
          <input name="unit_price" type="number" step="0.01" value={draft.unit_price} onChange={updateField} />
          <input name="supplier_id" placeholder="Supplier ID" value={draft.supplier_id} onChange={updateField} />
          <textarea name="notes" placeholder="Notes" value={draft.notes} onChange={updateField} rows={3} />
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
