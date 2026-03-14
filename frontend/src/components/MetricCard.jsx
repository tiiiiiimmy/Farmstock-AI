export default function MetricCard({ label, value, tone = "neutral", hint }) {
  return (
    <article className={`metric metric-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </article>
  );
}
