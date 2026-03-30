import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import OrderEmailModal from "../components/OrderEmailModal";
import PageState from "../components/PageState";
import { useCurrentFarm } from "../context/CurrentFarmContext";
import { formatEnumLabel } from "../utils/formatters";

const CATEGORIES = ["feed", "fertiliser", "veterinary", "chemical", "equipment"];
const ZONES = ["green", "amber", "red"];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [orderProduct, setOrderProduct] = useState(null);
  const queryClient = useQueryClient();
  const { currentFarm, currentFarmId, farmsQuery } = useCurrentFarm();

  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedZones, setSelectedZones] = useState(new Set());
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const productsQuery = useQuery({
    queryKey: queryKeys.products(),
    queryFn: api.getProducts,
  });

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(currentFarmId),
    queryFn: () => api.getSuppliers(currentFarmId),
    enabled: Boolean(currentFarmId),
  });

  const suppliers = suppliersQuery.data || [];

  const products = useMemo(() => {
    const all = productsQuery.data || [];
    const linkedIds = selectedSupplierId
      ? new Set(suppliers.find((s) => s.id === selectedSupplierId)?.product_ids ?? [])
      : null;

    return all.filter((p) => {
      if (!p.name.toLowerCase().includes(deferredSearch.toLowerCase())) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(p.category)) return false;
      if (selectedZones.size > 0 && !selectedZones.has(p.shelf_life_zone)) return false;
      if (linkedIds && !linkedIds.has(p.id)) return false;
      return true;
    });
  }, [productsQuery.data, deferredSearch, selectedCategories, selectedZones, selectedSupplierId, suppliersQuery.data]);

  function toggleCategory(cat) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function toggleZone(zone) {
    setSelectedZones((prev) => {
      const next = new Set(prev);
      next.has(zone) ? next.delete(zone) : next.add(zone);
      return next;
    });
  }

  function clearAll() {
    setSelectedCategories(new Set());
    setSelectedZones(new Set());
    setSelectedSupplierId("");
    setSearch("");
  }

  const hasFilters =
    selectedCategories.size > 0 || selectedZones.size > 0 || selectedSupplierId !== "";

  const activeChips = [
    ...Array.from(selectedCategories).map((c) => ({
      key: `cat-${c}`,
      label: c.charAt(0).toUpperCase() + c.slice(1),
      onRemove: () => toggleCategory(c),
    })),
    ...Array.from(selectedZones).map((z) => ({
      key: `zone-${z}`,
      label: z.charAt(0).toUpperCase() + z.slice(1),
      onRemove: () => toggleZone(z),
    })),
    ...(selectedSupplierId
      ? [
          {
            key: `sup-${selectedSupplierId}`,
            label:
              suppliers.find((s) => s.id === selectedSupplierId)?.name ??
              selectedSupplierId,
            onRemove: () => setSelectedSupplierId(""),
          },
        ]
      : []),
  ];

  if (farmsQuery.isLoading) {
    return (
      <PageState
        title="Loading farm context"
        message="We are working out which farm catalogue to show."
      />
    );
  }

  if (farmsQuery.isError) {
    return (
      <PageState
        tone="error"
        title="Unable to load farms"
        message={farmsQuery.error?.message || "We could not load your farm list."}
        actionLabel="Try again"
        onAction={() => farmsQuery.refetch()}
      />
    );
  }

  if (!currentFarm) {
    return (
      <PageState
        title="No farms yet"
        message="Create or connect a farm before browsing supplier-linked products."
      />
    );
  }

  if (productsQuery.isLoading || suppliersQuery.isLoading) {
    return (
      <PageState
        title="Loading products"
        message={`Fetching catalogue data for ${currentFarm.name}.`}
      />
    );
  }

  if (productsQuery.isError || suppliersQuery.isError) {
    return (
      <PageState
        tone="error"
        title="Products could not be loaded"
        message={
          productsQuery.error?.message ||
          suppliersQuery.error?.message ||
          "Something went wrong while loading products."
        }
        actionLabel="Try again"
        onAction={() => {
          productsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue + One-Click Ordering</h3>
        </div>

        {/* ── Filter bar ─────────────────────────────────────── */}
        <div className="filter-bar">

          {/* Row 1: search + supplier dropdown */}
          <div className="filter-row">
            <input
              className="search"
              style={{ flex: 1 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
            />
            <select
              className="supplier-select"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: category tags + zone tags */}
          <div className="filter-row">
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flex: 1 }}>
              <button
                type="button"
                className={`tag-btn${selectedCategories.size === 0 ? " active" : ""}`}
                onClick={() => setSelectedCategories(new Set())}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`tag-btn${selectedCategories.has(cat) ? " active" : ""}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {ZONES.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  className={`tag-btn zone-${zone}${selectedZones.has(zone) ? " active" : ""}`}
                  onClick={() => toggleZone(zone)}
                >
                  {zone.charAt(0).toUpperCase() + zone.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter chips — only visible when something is selected */}
          {hasFilters && (
            <div className="filter-row">
              {activeChips.map((chip) => (
                <span key={chip.key} className="chip">
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button type="button" className="btn-ghost" onClick={clearAll}>
                Clear all
              </button>
              <span className="filter-count">{products.length} products</span>
            </div>
          )}
        </div>

        {/* ── Product grid or empty state ────────────────────── */}
        {products.length === 0 ? (
          <div
            className="muted"
            style={{ padding: "2rem 0", textAlign: "center", fontSize: "0.875rem" }}
          >
            No products match your filters.{" "}
            {hasFilters && (
              <button type="button" className="btn-ghost" onClick={clearAll}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article key={product.id} className="product-card">
                <div className="alert-meta">
                  <span className={`pill pill-${product.shelf_life_zone}`}>
                    {formatEnumLabel(product.shelf_life_zone)}
                  </span>
                  <span>{formatEnumLabel(product.category)}</span>
                </div>
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <p className="muted">Storage: {product.storage_requirements}</p>
                <button type="button" onClick={() => setOrderProduct(product)}>
                  Order now
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {orderProduct && (
        <OrderEmailModal
          product={orderProduct}
          suppliers={suppliers}
          farmId={currentFarm.id}
          farmName={currentFarm.name}
          onClose={() => setOrderProduct(null)}
          onSupplierCreated={() =>
            queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(currentFarmId) })
          }
        />
      )}
    </div>
  );
}
