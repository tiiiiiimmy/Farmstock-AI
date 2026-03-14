import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function InventoryChart({ data = [] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Inventory Health Timeline</h3>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(73, 86, 80, 0.15)" />
            <XAxis dataKey="product_name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="days_until_depletion" fill="#1f6b48" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
