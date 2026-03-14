export default function OrderTable({ orders = [], onDelete, onEdit, editingOrderId }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Order History</h3>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Supplier</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className={editingOrderId === order.id ? "table-row-active" : ""}
              >
                <td>{order.date}</td>
                <td>{order.product_name}</td>
                <td>{order.category}</td>
                <td>
                  {order.quantity} {order.unit}
                </td>
                <td>NZD {Number(order.unit_price || 0).toFixed(2)}</td>
                <td>NZD {Number(order.total_price || 0).toFixed(2)}</td>
                <td>{order.supplier_id || "-"}</td>
                <td>
                  <button className="ghost-button" onClick={() => onEdit(order)}>
                    Edit
                  </button>
                  <button className="ghost-button" onClick={() => onDelete(order.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
