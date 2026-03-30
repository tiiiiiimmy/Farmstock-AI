import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import MetricCard from "./MetricCard";
import { formatCurrencyNzd } from "../utils/formatters";

function BenchmarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, unit_price } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{date}</strong>
      <p>Unit price: {formatCurrencyNzd(unit_price)}</p>
    </div>
  );
}

export default function PriceBenchmarkPanel({ orders = [], suppliers = [] }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  // Derive product list for the selected supplier from the passed-in orders
  const productOptions = useMemo(() => {
    const filtered = selectedSupplierId
      ? orders.filter((o) => o.supplier_id === selectedSupplierId)
      : orders;
    const seen = new Set();
    const result = [];
    for (const o of filtered) {
      const key = o.product_name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(o.product_name);
      }
    }
    return result.sort();
  }, [orders, selectedSupplierId]);

  const benchmarkQuery = useQuery({
    queryKey: queryKeys.priceBenchmark(selectedProduct, selectedSupplierId || null),
    queryFn: () => api.getPriceBenchmark(selectedProduct, selectedSupplierId || null),
    enabled: Boolean(selectedProduct),
  });

  const data = benchmarkQuery.data;

  function handleSupplierChange(e) {
    setSelectedSupplierId(e.target.value);
    setSelectedProduct("");
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Price Comparison</h3>
      </div>

      <div className="benchmark-controls">
        <select value={selectedSupplierId} onChange={handleSupplierChange}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          disabled={productOptions.length === 0}
        >
          <option value="">Select a product…</option>
          {productOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {!selectedProduct && (
        <p className="benchmark-no-data">
          Select a supplier and product to see regional price comparison.
        </p>
      )}

      {benchmarkQuery.isLoading && (
        <p className="benchmark-no-data">Loading benchmark data…</p>
      )}

      {data && (
        <>
          <section className="metrics-grid">
            <MetricCard
              label="Regional avg"
              value={data.data_available ? formatCurrencyNzd(data.regional_avg) : "—"}
              hint={data.unit ? `per ${data.unit}` : undefined}
            />
            <MetricCard
              label="Regional min"
              value={data.data_available ? formatCurrencyNzd(data.regional_min) : "—"}
            />
            <MetricCard
              label="Regional max"
              value={data.data_available ? formatCurrencyNzd(data.regional_max) : "—"}
            />
            <MetricCard
              label="Farms in region"
              value={data.data_available ? data.farm_count : "—"}
              hint={data.data_available ? undefined : "Need 3+ farms"}
            />
          </section>

          {!data.data_available && (
            <p className="benchmark-no-data">
              Not enough regional data yet — regional comparison requires at least 3 farms
              in your region with orders for this product.
            </p>
          )}

          {data.data_available && data.your_percentile !== null && (
            <div className="benchmark-percentile-row">
              <span className="benchmark-your-price">
                Your latest: {formatCurrencyNzd(data.your_latest_price)}/{data.unit}
              </span>
              <div className="benchmark-bar-track">
                <div
                  className="benchmark-bar-fill"
                  style={{ width: `${data.your_percentile}%` }}
                />
              </div>
              <span className="benchmark-percentile-label">
                You&apos;re cheaper than {data.your_percentile}% of farms in your region
              </span>
            </div>
          )}

          {data.trend.length > 0 && (
            <div className="benchmark-chart-wrap">
              <LineChart width={680} height={220} data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(73, 86, 80, 0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  width={52}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<BenchmarkTooltip />} />
                {data.data_available && (
                  <ReferenceLine
                    y={data.regional_avg}
                    stroke="var(--ink-3)"
                    strokeDasharray="5 4"
                    label={{ value: "Region avg", fontSize: 11, fill: "var(--ink-3)" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="unit_price"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--brand)" }}
                  name="Your unit price"
                />
              </LineChart>
            </div>
          )}
        </>
      )}
    </section>
  );
}
