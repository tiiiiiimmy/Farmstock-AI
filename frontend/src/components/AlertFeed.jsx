export default function AlertFeed({ alerts = [] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Recent AI Alerts</h3>
      </div>

      <div className="alert-list">
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
  );
}
