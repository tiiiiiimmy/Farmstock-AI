import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import InventoryChart from "../components/InventoryChart";
import MetricCard from "../components/MetricCard";

export default function DashboardPage() {
  const predictionsQuery = useQuery({
    queryKey: queryKeys.predictions(),
    queryFn: () => api.getPredictions()
  });
  const alertsQuery = useQuery({
    queryKey: queryKeys.alerts(),
    queryFn: () => api.getAlerts()
  });
  const spendingQuery = useQuery({
    queryKey: queryKeys.spending.period("year"),
    queryFn: () => api.getSpending("period=year")
  });

  const predictions = predictionsQuery.data || [];
  const urgent = predictions.filter((item) => item.reorder_now);
  const averageStockPct = predictions.length
    ? Math.round(
        predictions.reduce((sum, item) => sum + (item.current_stock_pct || 0), 0) /
          predictions.length
      )
    : 0;

  const alerts = alertsQuery.data || [];

  return (
    <div className="page-grid">
      <section className="metrics-grid">
        <MetricCard label="Tracked products" value={predictions.length} hint="Seeded catalogue connected" />
        <MetricCard
          label="Below reorder line"
          value={urgent.length}
          tone="warn"
          hint="Current stock is under delivery-gap burn level"
        />
        <MetricCard
          label="Average stock"
          value={`${averageStockPct}%`}
          hint="Across simulated inventory snapshots"
        />
        <MetricCard
          label="YTD spend"
          value={`$${((spendingQuery.data?.total_spend || 0) / 1000).toFixed(1)}k`}
          hint="Year-to-date NZD"
        />
      </section>

      <InventoryChart data={predictions} />

      <section className="panel">
        <div className="panel-header">
          <h3>AI Alerts</h3>
        </div>
        <div className="alert-list">
          {alerts.length === 0 && <p className="muted" style={{ fontSize: "0.875rem" }}>No alerts right now.</p>}
          {alerts.map((alert) => (
            <article key={alert.id} className="alert-card">
              <div className="alert-meta">
                <span className={`pill pill-${alert.status}`}>{alert.status}</span>
                <span>{alert.type.replace("_", " ")}</span>
              </div>
              <h4>{alert.title}</h4>
              <p>{alert.message}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
