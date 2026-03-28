import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import ChatWidget from "../components/ChatWidget";

export default function InsightsPage() {
  const recommendationsQuery = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.getRecommendations()
  });
  const spendingQuery = useQuery({
    queryKey: ["spending", "year"],
    queryFn: () => api.getSpending("period=year")
  });

  return (
    <div className="page-grid two-column">
      <section className="panel">
        <div className="panel-header">
          <h3>Suggested Orders This Month</h3>
        </div>

        <div className="stack">
          {(recommendationsQuery.data || []).map((item) => (
            <article key={item.product_name} className="alert-card">
              <div className="alert-meta">
                <span className={`pill pill-${item.urgency}`}>{item.urgency}</span>
                <span>{item.product_name}</span>
              </div>
              <p>{item.reasoning}</p>
            </article>
          ))}
        </div>

        <div className="spending-summary">
          <h4>Year-to-date spend</h4>
          <strong>NZD {(spendingQuery.data?.total_spend || 0).toLocaleString()}</strong>
        </div>
      </section>

      <ChatWidget />
    </div>
  );
}
