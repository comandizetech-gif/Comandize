import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://comandize.com.br";

const API_URL = `${API_BASE_URL}/api/orders`;

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildReceiptText(order) {
  const itemsText = order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.name} - ${formatMoney(item.subtotal)}`
    )
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

${
  order.type === "ENTREGA"
    ? `Endereço: ${order.address?.street}, ${order.address?.houseNumber} - ${order.address?.neighborhood}`
    : "Retirada na loja"
}

Mensagem:
${order.storeMessage || "Sem observação"}
`;
}

function History({ onEditOrder }) {
  const [orders, setOrders] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const token = localStorage.getItem("token");

  const loadOrders = async () => {
    const response = await fetch(`${API_URL}/my`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    const finalized = Array.isArray(data)
      ? data
          .filter((order) => order.status === "FINALIZADO")
          .slice(0, 30)
      : [];

    setOrders(finalized);
  };

  useEffect(() => {
    loadOrders();
  }, []);

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

    const text = `Olá ${order.customer.name}! Segue informação do seu pedido #${order._id.slice(
      -6
    )}. Total: ${formatMoney(order.total)}. Obrigado pela preferência!`;

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-5 text-[#1f2937]">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
        <h3 className="text-2xl font-black text-[#ff9811]">
          📜 Histórico de pedidos
        </h3>
        <p className="text-slate-600 text-sm">
          Mostrando os últimos 30 pedidos finalizados.
        </p>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const expanded = expandedId === order._id;

          return (
            <div
              key={order._id}
              className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expanded ? null : order._id)}
                className="w-full p-4 text-left flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-[#fff7ed]"
              >
                <div>
                  <h4 className="font-black text-lg">
                    🧾 Pedido #{order._id.slice(-6)}
                  </h4>
                  <p className="text-sm text-slate-600">
                    👤 {order.customer.name} • 📱 {order.customer.whatsapp}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
                    FINALIZADO
                  </span>
                  <span>🕒 {order.scheduledTime}</span>
                  <span>{order.type === "ENTREGA" ? "🛵 Entrega" : "🏪 Retirada"}</span>
                  <strong className="text-[#ff9811]">
                    {formatMoney(order.total)}
                  </strong>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-[#e5e7eb] p-5 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-[#f8fafc] rounded-xl p-4">
                      <h5 className="font-black text-[#ff9811] mb-2">
                        Dados do pedido
                      </h5>
                      <p>Cliente: {order.customer.name}</p>
                      <p>WhatsApp: {order.customer.whatsapp}</p>
                      <p>Tipo: {order.type}</p>
                      <p>Horário: {order.scheduledTime}</p>
                      <p>
                        Data:{" "}
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                      </p>

                      {order.type === "ENTREGA" && (
                        <p className="mt-2">
                          Endereço: {order.address?.street},{" "}
                          {order.address?.houseNumber} -{" "}
                          {order.address?.neighborhood}
                        </p>
                      )}
                    </div>

                    <div className="bg-[#f8fafc] rounded-xl p-4">
                      <h5 className="font-black text-[#ff9811] mb-2">
                        Totais
                      </h5>
                      <p>Subtotal: {formatMoney(order.subtotal)}</p>
                      <p>Desconto: {formatMoney(order.discount)}</p>
                      <p>Entrega: {formatMoney(order.deliveryFee)}</p>
                      <p>Extra: {formatMoney(order.extraFee)}</p>
                      <p className="text-2xl font-black text-[#ff9811] mt-2">
                        Total: {formatMoney(order.total)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] rounded-xl p-4">
                    <h5 className="font-black text-[#ff9811] mb-3">Itens</h5>

                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between border-b border-[#d1d5db] pb-2"
                        >
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <strong>{formatMoney(item.subtotal)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => printReceipt(order)}
                      className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-xl font-black"
                    >
                      🖨️ Reimprimir cupom
                    </button>

                    <button
                      onClick={() => sendWhatsApp(order)}
                      className="bg-green-500 hover:bg-green-600 px-4 py-3 rounded-xl font-black"
                    >
                      💬 Enviar mensagem
                    </button>

                    <button
                      onClick={() => onEditOrder(order._id)}
                      className="bg-[#ff9811] hover:bg-orange-400 text-white px-4 py-3 rounded-xl font-black"
                    >
                      ✏️ Alterar pedido
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm text-slate-600">
            Nenhum pedido finalizado encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

export default History;