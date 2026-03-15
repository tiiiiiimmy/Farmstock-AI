import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function getShortProductName(name) {
  return name
    .replace(/\s+\d+(\.\d+)?\s*(kg|g|l|ml|t|tonnes|tonne|pk|pack|units?)\b/gi, "")
    .trim();
}

function splitLabel(name) {
  const shortName = getShortProductName(name);
  const words = shortName.split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > 12 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 3);
}

function CustomXAxisTick({ x, y, payload }) {
  const lines = splitLabel(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={16}
        textAnchor="middle"
        fill="#5d675f"
        fontSize={12}
      >
        {lines.map((line, index) => (
          <tspan key={`${payload.value}-${index}`} x={0} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function InventoryTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{item.product_name}</strong>
      <p>Current stock: {item.current_stock_pct}%</p>
      <p>Current quantity: {item.current_quantity} {item.typical_unit}</p>
      <p>Estimated daily usage: {item.estimated_daily_usage} {item.typical_unit}/day</p>
      <p>Delivery-gap burn: {item.lead_time_consumption_pct}% over {item.lead_time_days} days</p>
      <p>Recommended reorder line: {item.reorder_threshold_pct}%</p>
      {item.expiry_date ? <p>Expiry date: {item.expiry_date}</p> : null}
    </div>
  );
}

export default function InventoryChart({ data = [] }) {
  const chartWidth = Math.max(920, data.length * 110);
  const highlightedItems = data.filter(
    (item) => item.stock_status === "red" || item.stock_status === "amber"
  );
  const summaryItems = highlightedItems.length ? highlightedItems : data.slice(0, 6);

  function InventoryBarShape(props) {
    const {
      x,
      y,
      width,
      height,
      payload,
      background
    } = props;

    const thresholdPct = Number(payload?.reorder_threshold_pct || 0);
    const bgY = background?.y ?? y;
    const bgHeight = background?.height ?? height;
    const thresholdY = bgY + bgHeight * (1 - thresholdPct / 100);
    const fill = payload?.reorder_now
      ? "#b4442f"
      : payload?.stock_status === "amber"
        ? "#b67819"
        : "#1f6b48";

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={8}
          ry={8}
          fill={fill}
        />
        <line
          x1={x - 2}
          x2={x + width + 2}
          y1={thresholdY}
          y2={thresholdY}
          stroke="#23352c"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      </g>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Inventory Coverage and Delivery-Gap Burn</h3>
          <p className="muted">
            Reorder when current stock drops to the estimated percentage likely to
            be consumed before the next shipment arrives.
          </p>
        </div>
      </div>

      <div className="chart-scroll">
        <BarChart width={chartWidth} height={360} data={data} barGap={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(73, 86, 80, 0.15)" />
          <XAxis
            dataKey="product_name"
            interval={0}
            tick={<CustomXAxisTick />}
            height={70}
          />
          <YAxis unit="%" domain={[0, 100]} />
          <Tooltip content={<InventoryTooltip />} />
          <Bar
            dataKey="current_stock_pct"
            name="Current stock %"
            background={{ fill: "rgba(31, 107, 72, 0.08)" }}
            shape={InventoryBarShape}
          />
        </BarChart>
      </div>

      <div className="chart-legend-inline">
        <span className="legend-chip legend-chip-stock">Solid bar: actual stock</span>
        <span className="legend-chip legend-chip-threshold">Dashed line: reorder point</span>
      </div>

      <div className="inventory-summary-grid">
        {summaryItems.map((item) => (
          <article key={item.product_name} className="inventory-summary-card">
            <div className="alert-meta">
              <span className={`pill pill-${item.stock_status}`}>{item.stock_status}</span>
              <span>{item.current_stock_pct}% in stock</span>
            </div>
            <h4>{item.product_name}</h4>
            <p>
              Burn before delivery: {item.lead_time_consumption_pct}% over{" "}
              {item.lead_time_days} days
            </p>
            <p>
              Estimated usage: {item.estimated_daily_usage} {item.typical_unit}/day
            </p>
            {item.expiry_date ? <p>Expires on {item.expiry_date}</p> : <p>Non-perishable stock</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
