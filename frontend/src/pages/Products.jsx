import { useDeferredValue, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import OrderEmailModal from "../components/OrderEmailModal";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [orderProduct, setOrderProduct] = useState(null);
  const queryClient = useQueryClient();

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

  const products = (productsQuery.data || []).filter((product) =>
    product.name.toLowerCase().includes(deferredSearch.toLowerCase())
  );

  const suppliers = suppliersQuery.data || [];

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
