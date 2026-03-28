import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import AlertFeed from "../components/AlertFeed";
import InventoryChart from "../components/InventoryChart";
import MetricCard from "../components/MetricCard";

export default function DashboardPage() {
  const predictionsQuery = useQuery({
    queryKey: ["predictions"],
    queryFn: () => api.getPredictions()
  });
  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.getAlerts()
  });

  const predictions = predictionsQuery.data || [];
  const urgent = predictions.filter((item) => item.reorder_now);
  const averageStockPct = predictions.length
    ? Math.round(
        predictions.reduce((sum, item) => sum + (item.current_stock_pct || 0), 0) /
          predictions.length
      )
    : 0;

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
          label="Next recommended order"
          value={predictions[0]?.product_name || "No data"}
          hint={
            predictions[0]?.reorder_threshold_pct
              ? `Reorder line: ${predictions[0].reorder_threshold_pct}%`
              : "Awaiting predictions"
          }
        />
      </section>

      <InventoryChart data={predictions} />
      <AlertFeed alerts={alertsQuery.data || []} />
    </div>
  );
}
