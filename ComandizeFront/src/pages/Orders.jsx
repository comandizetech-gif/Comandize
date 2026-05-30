import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000/api/orders";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildReceiptText(order) {
  const itemsText = order.items
    .map((item) => `${item.quantity}x ${item.name} - ${formatMoney(item.subtotal)}`)
    .join("\n");

  return `
COMANDIZE
CUPOM DO PEDIDO #${order._id.slice(-6)}

Cliente: ${order.customer.name}
WhatsApp: ${order.customer.whatsapp}
Tipo: ${order.type}
Horário: ${order.scheduledTime}
Status: ${order.status}

ITENS:
${itemsText}

Subtotal: ${formatMoney(order.subtotal || order.total)}
Desconto: ${formatMoney(order.discount || 0)}
Taxa entrega: ${formatMoney(order.deliveryFee || 0)}
Taxa extra: ${formatMoney(order.extraFee || 0)}
TOTAL: ${formatMoney(order.total)}
`;
}

function Orders({ selectedOrderId }) {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const loadOrders = async (customPage = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", customPage);
      params.append("limit", 20);

      if (search.trim()) params.append("search", search.trim());
      if (dateStart) params.append("startDate", dateStart);
      if (dateEnd) params.append("endDate", dateEnd);

      const response = await fetch(`${API_URL}/finalized?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      const list = Array.isArray(data.orders) ? data.orders : [];

      setOrders(list);
      setPage(data.page || customPage);
      setTotalPages(data.totalPages || 1);

      if (selectedOrderId) {
        const found = list.find((order) => order._id === selectedOrderId);
        if (found) setSelectedOrder(found);
      }
    } catch (error) {
      setMessage("Erro ao buscar pedidos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      setSearch(selectedOrderId.slice(-6));
      loadOrders(1);
    }
  }, [selectedOrderId]);

  const printReceipt = (order) => {
    const receipt = buildReceiptText(order);
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>Cupom Pedido</title>
          <style>
            body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
          </style>
        </head>
        <body>${receipt}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  const sendWhatsApp = (order) => {
    const phone = order.customer.whatsapp.replace(/\D/g, "");

    if (!phone) {
      alert("Cliente sem WhatsApp.");
      return;
    }

    const text = `Olá ${order.customer.name}! Sobre seu pedido #${order._id.slice(
      -6
    )}, total ${formatMoney(order.total)}.`;

    window.open(
      `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const deleteOrder = async (orderId) => {
    const confirmDelete = window.confirm("Deseja excluir este pedido?");
    if (!confirmDelete) return;

    const response = await fetch(`${API_URL}/${orderId}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    const data = await response.json();
    setMessage(data.message || "Pedido excluído.");

    setSelectedOrder(null);
    loadOrders(page);
  };

  return (
    <div className="space-y-5 text-gray-700">
      {message && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-4 shadow-sm">
          {message}
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 md:p-5">
        <h3 className="text-xl md:text-2xl font-black text-orange-500 mb-4">
          🔎 Buscar pedido finalizado
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px_140px] gap-3">
          <input
            placeholder="Buscar por nome, telefone ou número do pedido"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />

          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />

          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />

          <button
            onClick={() => loadOrders(1)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl p-3 font-black shadow-md transition"
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] gap-5">
        <div className="space-y-3">
          {loading && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 text-gray-500">
              Buscando pedidos...
            </div>
          )}

          {!loading &&
            orders.map((order) => (
              <button
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left border rounded-2xl p-4 transition shadow-sm ${
                  selectedOrder?._id === order._id
                    ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100"
                    : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <h4 className="font-black text-gray-800">🧾 #{order._id.slice(-6)}</h4>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                    FINALIZADO
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-1">
                  👤 {order.customer.name}
                </p>
                <p className="text-sm text-gray-500">
                  📱 {order.customer.whatsapp}
                </p>

                <div className="flex justify-between mt-3 text-sm text-gray-500">
                  <span>{order.type === "ENTREGA" ? "🛵 Entrega" : "🏪 Retirada"}</span>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <p className="text-orange-500 font-black mt-2">
                  {formatMoney(order.total)}
                </p>
              </button>
            ))}

          {!loading && orders.length === 0 && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 text-gray-500">
              Use a busca para localizar um pedido finalizado.
            </div>
          )}

          {orders.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
              <button
                disabled={page <= 1}
                onClick={() => loadOrders(page - 1)}
                className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 disabled:opacity-40 px-4 py-2 rounded-xl font-bold"
              >
                Anterior
              </button>

              <span className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => loadOrders(page + 1)}
                className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 disabled:opacity-40 px-4 py-2 rounded-xl font-bold"
              >
                Próxima
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 md:p-5 min-h-[430px]">
          {!selectedOrder && (
            <p className="text-gray-500">
              Selecione um pedido para visualizar os detalhes.
            </p>
          )}

          {selectedOrder && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-orange-500">
                    Pedido #{selectedOrder._id.slice(-6)}
                  </h3>
                  <p className="text-gray-500">
                    {selectedOrder.customer.name} •{" "}
                    {selectedOrder.customer.whatsapp}
                  </p>
                </div>

                <span className="bg-green-100 text-green-700 px-3 py-2 rounded-xl h-fit font-bold text-sm">
                  FINALIZADO
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-black text-orange-500 mb-2">Dados</h4>
                  <p>Tipo: {selectedOrder.type}</p>
                  <p>Horário: {selectedOrder.scheduledTime}</p>
                  <p>
                    Data:{" "}
                    {new Date(selectedOrder.createdAt).toLocaleDateString(
                      "pt-BR"
                    )}
                  </p>

                  {selectedOrder.type === "ENTREGA" && (
                    <p className="mt-2">
                      Endereço: {selectedOrder.address?.street},{" "}
                      {selectedOrder.address?.houseNumber} -{" "}
                      {selectedOrder.address?.neighborhood}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-black text-orange-500 mb-2">Totais</h4>
                  <p>Subtotal: {formatMoney(selectedOrder.subtotal)}</p>
                  <p>Desconto: {formatMoney(selectedOrder.discount)}</p>
                  <p>Entrega: {formatMoney(selectedOrder.deliveryFee)}</p>
                  <p>Extra: {formatMoney(selectedOrder.extraFee)}</p>
                  <p className="text-2xl font-black text-orange-500 mt-2">
                    Total: {formatMoney(selectedOrder.total)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="font-black text-orange-500 mb-3">Itens</h4>

                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between gap-3 border-b border-gray-200 pb-2 text-sm md:text-base"
                    >
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <strong>{formatMoney(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <button
                  onClick={() => printReceipt(selectedOrder)}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-3 rounded-xl font-black"
                >
                  🖨️ Imprimir cupom
                </button>

                <button
                  onClick={() => sendWhatsApp(selectedOrder)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-black"
                >
                  💬 Enviar mensagem
                </button>

                <button
                  onClick={() => deleteOrder(selectedOrder._id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-black"
                >
                  🗑️ Excluir pedido
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Orders;
