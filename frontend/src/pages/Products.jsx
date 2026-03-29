import { useDeferredValue, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import OrderEmailModal from "../components/OrderEmailModal";

const CATEGORIES = ["feed", "fertiliser", "veterinary", "chemical", "equipment"];
const ZONES = ["green", "amber", "red"];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [orderProduct, setOrderProduct] = useState(null);
  const queryClient = useQueryClient();

  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedZones, setSelectedZones] = useState(new Set());
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const productsQuery = useQuery({
    queryKey: queryKeys.products(),
    queryFn: api.getProducts,
  });

  const farmsQuery = useQuery({
    queryKey: queryKeys.farms.all(),
    queryFn: api.getFarms,
  });

  const farmId = farmsQuery.data?.[0]?.id;
  const farmName = farmsQuery.data?.[0]?.name || "Farm";

  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(farmId),
    queryFn: () => api.getSuppliers(farmId),
    enabled: !!farmId,
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

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="panel-header">
          <h3>Catalogue + One-Click Ordering</h3>
          <input
            className="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
          />
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <article key={product.id} className="product-card">
              <div className="alert-meta">
                <span className={`pill pill-${product.shelf_life_zone}`}>{product.shelf_life_zone}</span>
                <span>{product.category}</span>
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
      </section>

      {orderProduct && (
        <OrderEmailModal
          product={orderProduct}
          suppliers={suppliers}
          farmId={farmId}
          farmName={farmName}
          onClose={() => setOrderProduct(null)}
          onSupplierCreated={() => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers(farmId) })}
        />
      )}
    </div>
  );
}
