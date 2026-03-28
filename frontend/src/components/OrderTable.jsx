import { useEffect, useRef } from "react";

export default function OrderTable({ orders = [], onCreate, onDelete, onEdit, editingOrderId }) {
  const scrollRef = useRef(null);
  const rowRefs = useRef({});

  useEffect(() => {
    if (!editingOrderId || !scrollRef.current || !rowRefs.current[editingOrderId]) {
      return;
    }

    const container = scrollRef.current;
    const row = rowRefs.current[editingOrderId];
    const nextTop = row.offsetTop - container.offsetTop;

    scrollRef.current.scrollTo({
      top: nextTop,
      behavior: "smooth"
    });
  }, [editingOrderId, orders]);

  return (
    <section className="panel panel-table">
      <div className="panel-header">
        <h3>Order History</h3>
        <button type="button" onClick={onCreate}>
          Log Purchase
        </button>
      </div>

      <div ref={scrollRef} className="table-wrap table-wrap-scroll">
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
                ref={(node) => {
                  if (node) {
                    rowRefs.current[order.id] = node;
                  } else {
                    delete rowRefs.current[order.id];
                  }
                }}
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
