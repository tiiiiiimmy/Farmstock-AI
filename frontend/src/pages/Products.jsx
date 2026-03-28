import { useDeferredValue, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const productsQuery = useQuery({
    queryKey: queryKeys.products(),
    queryFn: api.getProducts
  });

  const orderMutation = useMutation({
    mutationFn: (product) =>
      api.placeOrder({
        supplier_id: "sup-001",
        items: [
          {
            product_name: product.name,
            quantity: 1,
            unit: product.typical_unit,
            unit_price: 0
          }
        ]
      })
  });

  const products = (productsQuery.data || []).filter((product) =>
    product.name.toLowerCase().includes(deferredSearch.toLowerCase())
  );

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
              <p className="muted">Typical unit: {product.typical_unit}</p>
              <p className="muted">Storage: {product.storage_requirements}</p>
              <button type="button" onClick={() => orderMutation.mutate(product)}>
                Order now
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
