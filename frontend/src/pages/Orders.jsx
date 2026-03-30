import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import ConfirmDialog from "../components/ConfirmDialog";
import OrderFormModal from "../components/OrderFormModal";
import OrderTable from "../components/OrderTable";
import PageState from "../components/PageState";
import { useCurrentFarm } from "../context/CurrentFarmContext";
import useOrderForm from "../hooks/useOrderForm";

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const {
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
  } = useOrderForm();
  const { currentFarm, currentFarmId, farmsQuery } = useCurrentFarm();
  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.all(),
    queryFn: api.getOrders
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(currentFarmId),
    queryFn: () => api.getSuppliers(currentFarmId),
    enabled: Boolean(currentFarmId),
  });
  const suppliers = suppliersQuery.data || [];
  const suppliersById = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier]));

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
      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
    },
    onError: () => {
      setPendingDeleteId(null);
    }
  });

  function handleOpenCreate() {
    resetFormState();
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetFormState();
  }

  function handleRequestDelete(orderId) {
    setPendingDeleteId(orderId);
  }

  function handleCancelDelete() {
    setPendingDeleteId(null);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteId) {
      return;
    }

    deleteMutation.mutate(pendingDeleteId);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateDraft();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = getPayload();

    if (editingOrderId) {
      updateMutation.mutate({ orderId: editingOrderId, payload });
      return;
    }

    createMutation.mutate(payload);
  }

  function handleStartEdit(order) {
    handleEdit(order);
    setIsModalOpen(true);
  }

  if (farmsQuery.isLoading) {
    return (
      <PageState
        title="Loading farm context"
        message="We are working out which farm to use for order history."
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
        message="Create or connect a farm before recording purchases."
      />
    );
  }

  if (ordersQuery.isLoading || suppliersQuery.isLoading) {
    return (
      <PageState
        title="Loading orders"
        message={`Fetching purchase history for ${currentFarm.name}.`}
      />
    );
  }

  if (ordersQuery.isError || suppliersQuery.isError) {
    return (
      <PageState
        tone="error"
        title="Orders could not be loaded"
        message={
          ordersQuery.error?.message ||
          suppliersQuery.error?.message ||
          "Something went wrong while loading order history."
        }
        actionLabel="Try again"
        onAction={() => {
          ordersQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );
  }

  return (
    <>
      <div className="page-grid">
        <OrderTable
          orders={ordersQuery.data || []}
          editingOrderId={editingOrderId}
          suppliersById={suppliersById}
          onCreate={handleOpenCreate}
          onEdit={handleStartEdit}
          onDelete={handleRequestDelete}
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
        suppliers={suppliers}
        hasSupplierDirectory={suppliers.length > 0}
        onClose={handleCloseModal}
        onFieldChange={updateField}
        onUnitSelect={handleUnitSelect}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title="Delete Purchase Record"
        message="This action cannot be undone. Are you sure you want to delete this purchase record?"
        confirmLabel="Delete"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
