import { useQuery } from "@tanstack/react-query";
import { api, DEFAULT_FARM_ID } from "../api/client";
import AlertFeed from "../components/AlertFeed";
import InventoryChart from "../components/InventoryChart";
import MetricCard from "../components/MetricCard";

export default function DashboardPage() {
  const predictionsQuery = useQuery({
    queryKey: ["predictions"],
    queryFn: () => api.getPredictions(DEFAULT_FARM_ID)
  });
  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.getAlerts(DEFAULT_FARM_ID)
  });
  const spendingQuery = useQuery({
    queryKey: ["spending", "month"],
    queryFn: () => api.getSpending(DEFAULT_FARM_ID, "month")
  });

  const predictions = predictionsQuery.data || [];
  const urgent = predictions.filter((item) => item.urgency !== "green");
  const totalSpend = spendingQuery.data?.total_spend || 0;

  return (
    <div className="page-grid">
      <section className="metrics-grid">
        <MetricCard label="Tracked products" value={predictions.length} hint="Seeded catalogue connected" />
        <MetricCard label="Urgent items" value={urgent.length} tone="warn" hint="Red or amber reorder risk" />
        <MetricCard
          label="Monthly spend"
          value={`NZD ${totalSpend.toLocaleString()}`}
          hint="Current period from backend analytics"
        />
        <MetricCard
          label="Next recommended order"
          value={predictions[0]?.product_name || "No data"}
          hint={predictions[0]?.recommended_order_date || "Awaiting predictions"}
        />
      </section>

      <InventoryChart data={predictions.slice(0, 12)} />
      <AlertFeed alerts={alertsQuery.data || []} />
    </div>
  );
}
