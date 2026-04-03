import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
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

function PriceRangeTrack({ min, max, avg, yourPrice, unit, percentile }) {
  const range = max - min || 1;
  const avgPct = Math.min(100, Math.max(0, ((avg - min) / range) * 100));
  const youPct = Math.min(100, Math.max(0, ((yourPrice - min) / range) * 100));
  const labelAlign = youPct < 20 ? "left" : youPct > 80 ? "right" : "center";
  const cheaper = percentile !== null;
  const tone = cheaper
    ? percentile >= 50
      ? "good"
      : percentile >= 25
        ? "mid"
        : "high"
    : "mid";

  return (
    <div className="bm-range-wrap">
      {/* Stat row */}
      <div className="bm-stat-row">
        <div className="bm-stat">
          <span className="bm-stat-label">Min</span>
          <span className="bm-stat-value">{formatCurrencyNzd(min)}</span>
        </div>
        <div className="bm-stat bm-stat-center">
          <span className="bm-stat-label">Regional avg</span>
          <span className="bm-stat-value bm-stat-avg">{formatCurrencyNzd(avg)}</span>
          <span className="bm-stat-unit">per {unit}</span>
        </div>
        <div className="bm-stat bm-stat-right">
          <span className="bm-stat-label">Max</span>
          <span className="bm-stat-value">{formatCurrencyNzd(max)}</span>
        </div>
      </div>

      {/* Track */}
      <div className="bm-track">
        <div className="bm-track-fill" />
        {/* Avg tick */}
        <div className="bm-avg-tick" style={{ left: `${avgPct}%` }} />
        {/* Your price marker */}
        <div
          className={`bm-you-marker bm-you-marker-${tone}`}
          style={{ left: `${youPct}%` }}
        >
          <div className="bm-you-dot" />
          <div className={`bm-you-label bm-you-label-${labelAlign}`}>
            <span className="bm-you-price">{formatCurrencyNzd(yourPrice)}/{unit}</span>
            {cheaper && (
              <span className={`bm-you-badge bm-badge-${tone}`}>
                Cheaper than {percentile}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Track end-labels */}
      {/* <div className="bm-track-labels">
        <span>Cheapest in region</span>
        <span>Most expensive</span>
      </div> */}
    </div>
  );
}

export default function PriceBenchmarkPanel({ orders = [] }) {
  const [selectedProduct, setSelectedProduct] = useState("");

  const productOptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const o of orders) {
      const key = o.product_name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(o.product_name);
      }
    }
    return result.sort();
  }, [orders]);

  const benchmarkQuery = useQuery({
    queryKey: queryKeys.priceBenchmark(selectedProduct, null),
    queryFn: () => api.getPriceBenchmark(selectedProduct, null),
    enabled: Boolean(selectedProduct),
  });

  const data = benchmarkQuery.data;

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Price Comparison</h3>
        {data?.farm_count && (
          <span className="bm-farm-pill">{data.farm_count} farms in region</span>
        )}
      </div>

      <div className="benchmark-controls">
        <div className="bm-select-wrap">
          <svg className="bm-select-icon" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            disabled={productOptions.length === 0}
          >
            <option value="">Select a product…</option>
            {productOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedProduct && (
        <p className="benchmark-no-data">
          Select a product to see regional price comparison.
        </p>
      )}

      {benchmarkQuery.isLoading && (
        <p className="benchmark-no-data">Loading benchmark data…</p>
      )}

      {benchmarkQuery.isError && (
        <p className="benchmark-no-data">
          Could not load benchmark data — please try again.
        </p>
      )}

      {data && (
        <>
          {!data.data_available && (
            <p className="benchmark-no-data">
              Not enough regional data yet — regional comparison requires at least 3 farms
              in your region with orders for this product.
            </p>
          )}

          {data.data_available && (
            <PriceRangeTrack
              min={data.regional_min}
              max={data.regional_max}
              avg={data.regional_avg}
              yourPrice={data.your_latest_price}
              unit={data.unit}
              percentile={data.your_percentile}
            />
          )}

          {data.trend.length > 0 && (
            <div className="bm-chart-wrap">
              <p className="bm-chart-label">Your price history</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(73, 86, 80, 0.12)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--ink-3)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${v}`}
                    width={48}
                    tick={{ fontSize: 10, fill: "var(--ink-3)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<BenchmarkTooltip />} />
                  {data.data_available && (
                    <ReferenceLine
                      y={data.regional_avg}
                      stroke="var(--ink-3)"
                      strokeDasharray="4 3"
                      label={{ value: "Region avg", fontSize: 10, fill: "var(--ink-3)", position: "insideTopRight" }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="unit_price"
                    stroke="var(--brand)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--brand)", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "var(--brand)", strokeWidth: 0 }}
                    name="Your unit price"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  );
}
