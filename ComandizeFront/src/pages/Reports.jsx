import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:3000/api/orders";
const CACHE_PREFIX = "comandize_reports_cache_v2";
const PAGE_SIZE = 30;

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCacheKey(params) {
  return `${CACHE_PREFIX}:${JSON.stringify(params)}`;
}

function readCache(key, version) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed.version !== version) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCache(key, version, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ version, data, savedAt: Date.now() }));
  } catch {
    Object.keys(localStorage)
      .filter((keyName) => keyName.startsWith(CACHE_PREFIX))
      .forEach((keyName) => localStorage.removeItem(keyName));
  }
}

function Reports() {
  const [activeTab, setActiveTab] = useState("daily");
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [productPeriod, setProductPeriod] = useState("daily");
  const [productPage, setProductPage] = useState(1);

  const [report, setReport] = useState(null);
  const [productReport, setProductReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const reportScope = activeTab === "monthly" ? "monthly" : productPeriod;

  const currentScopeParams = useMemo(() => {
    if (activeTab === "products") {
      return productPeriod === "monthly"
        ? { scope: "monthly", month: String(month), year: String(year) }
        : { scope: "daily", date: dailyDate };
    }

    return activeTab === "monthly"
      ? { scope: "monthly", month: String(month), year: String(year) }
      : { scope: "daily", date: dailyDate };
  }, [activeTab, productPeriod, dailyDate, month, year]);

  const getSyncVersion = async (params) => {
    const query = new URLSearchParams(params);
    const response = await fetch(`${API_URL}/reports/sync-status?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) return null;
    return data.version || null;
  };

  const loadReport = async (force = false) => {
    try {
      setLoading(true);
      setMessage("");

      if (activeTab === "products") {
        await loadProductReport(force);
        return;
      }

      const params = activeTab === "daily"
        ? { scope: "daily", date: dailyDate }
        : { scope: "monthly", month: String(month), year: String(year) };

      const version = await getSyncVersion(params);
      const cacheKey = getCacheKey({ type: activeTab, ...params });

      if (version && !force) {
        const cached = readCache(cacheKey, version);
        if (cached) {
          setReport(cached);
          setLoading(false);
          return;
        }
      }

      const url = activeTab === "daily"
        ? `${API_URL}/reports/daily?date=${dailyDate}`
        : `${API_URL}/reports/monthly?month=${month}&year=${year}`;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Erro ao carregar relatório.");
        setReport(null);
        return;
      }

      setReport(data);
      if (version) saveCache(cacheKey, version, data);
    } catch {
      setMessage("Erro ao conectar com o servidor.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const loadProductReport = async (force = false, customPage = productPage) => {
    try {
      setLoading(true);
      setMessage("");

      const syncParams = productPeriod === "monthly"
        ? { scope: "monthly", month: String(month), year: String(year) }
        : { scope: "daily", date: dailyDate };

      const version = await getSyncVersion(syncParams);
      const params = productPeriod === "monthly"
        ? { period: "monthly", month: String(month), year: String(year), page: String(customPage), limit: String(PAGE_SIZE) }
        : { period: "daily", date: dailyDate, page: String(customPage), limit: String(PAGE_SIZE) };

      const cacheKey = getCacheKey({ type: "products", ...params });

      if (version && !force) {
        const cached = readCache(cacheKey, version);
        if (cached) {
          setProductReport(cached);
          setProductPage(cached.page || customPage);
          setLoading(false);
          return;
        }
      }

      const query = new URLSearchParams(params);
      const response = await fetch(`${API_URL}/reports/products?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Erro ao carregar relatório de produtos.");
        setProductReport(null);
        return;
      }

      setProductReport(data);
      setProductPage(data.page || customPage);
      if (version) saveCache(cacheKey, version, data);
    } catch {
      setMessage("Erro ao conectar com o servidor.");
      setProductReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "products") {
      setProductPage(1);
    }
  }, [productPeriod, dailyDate, month, year]);

  const maxChartValue = Math.max(
    ...(report?.salesChart || []).map((item) => Number(item.total || 0)),
    1
  );

  return (
    <div className="space-y-6 text-[#1f2937]">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-[#ff9811]">📊 Relatórios</h3>
            <p className="text-slate-600 text-sm">
              Vendas, caixa, entregas, produtos, custos, lucro e quebra.
            </p>
          </div>

          <div className="grid grid-cols-3 bg-[#f8fafc] rounded-xl p-1">
            <TabButton active={activeTab === "daily"} onClick={() => setActiveTab("daily")}>Diário</TabButton>
            <TabButton active={activeTab === "monthly"} onClick={() => setActiveTab("monthly")}>Mensal</TabButton>
            <TabButton active={activeTab === "products"} onClick={() => setActiveTab("products")}>Produtos</TabButton>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
        {activeTab !== "monthly" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
            <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" />
            <button onClick={() => loadReport(true)} className="bg-[#ff9811] text-white rounded-xl font-black p-3">Buscar</button>
          </div>
        )}

        {activeTab === "monthly" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_160px] gap-3">
            <MonthSelect month={month} setMonth={setMonth} />
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" />
            <button onClick={() => loadReport(true)} className="bg-[#ff9811] text-white rounded-xl font-black p-3">Buscar</button>
          </div>
        )}

        {activeTab === "products" && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_160px] gap-3">
            <select value={productPeriod} onChange={(e) => setProductPeriod(e.target.value)} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none">
              <option value="daily">Produtos do dia</option>
              <option value="monthly">Produtos do mês</option>
            </select>
            {productPeriod === "monthly" ? <MonthSelect month={month} setMonth={setMonth} /> : <div className="hidden md:block" />}
            <button onClick={() => loadProductReport(true, 1)} className="bg-[#ff9811] text-white rounded-xl font-black p-3">Buscar</button>
          </div>
        )}
      </div>

      {message && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">{message}</div>}
      {loading && <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm text-slate-600">Carregando relatório...</div>}

      {!loading && activeTab !== "products" && report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <Card title="Pedidos" value={report.totalOrders || 0} icon="🧾" />
            <Card title="Faturamento" value={formatMoney(report.totalSales)} icon="💰" />
            <Card title="Taxas de entrega" value={formatMoney(report.totalDeliveryFees)} icon="🛵" />
            <Card title="Custo estimado" value={formatMoney(report.totalCost)} icon="📦" />
            <Card title="Lucro estimado" value={formatMoney(report.profit)} icon="📈" />
            <Card title="Quebra em custo" value={formatMoney(report.totalLossCost)} icon="⚠️" />
          </div>

          {activeTab === "daily" && <CashSessions sessions={report.cashSessions || []} />}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <SalesChart report={report} maxChartValue={maxChartValue} activeTab={activeTab} />
            <Payments payments={report.payments || []} />
          </div>

          {activeTab === "monthly" && <DeliveryFeesChart chart={report.deliveryFeesChart || []} />}

          <OrdersList orders={report.orders || []} />
        </>
      )}

      {!loading && activeTab === "products" && productReport && (
        <ProductReport
          report={productReport}
          page={productPage}
          onPage={(nextPage) => loadProductReport(false, nextPage)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-4 py-3 rounded-lg font-black ${active ? "bg-[#ff9811] text-white" : "text-slate-600"}`}>
      {children}
    </button>
  );
}

function MonthSelect({ month, setMonth }) {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return (
    <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none">
      {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
    </select>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
      <div className="text-2xl mb-3">{icon}</div>
      <p className="text-slate-500 text-sm">{title}</p>
      <h4 className="text-2xl font-black text-[#ff9811] mt-1">{value}</h4>
    </div>
  );
}

function CashSessions({ sessions }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
      <h4 className="font-black text-[#ff9811] mb-4">🧮 Caixas do dia</h4>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {sessions.map((cash, index) => (
          <div key={cash._id || index} className="bg-[#f8fafc] rounded-xl p-4 space-y-2">
            <div className="flex justify-between gap-3">
              <strong>Caixa {index + 1} • {cash.operatorName}</strong>
              <span className={`text-xs px-2 py-1 rounded-full font-black ${cash.status === "OPEN" ? "bg-green-500 text-white" : "bg-zinc-700"}`}>{cash.status === "OPEN" ? "Aberto" : "Fechado"}</span>
            </div>
            <p className="text-sm text-slate-600">{formatDateTime(cash.openedAt)} até {cash.closedAt ? formatDateTime(cash.closedAt) : "aberto"}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>Entrada: <strong>{formatMoney(cash.openingAmount)}</strong></p>
              <p>Fechamento: <strong>{cash.closingAmount === null ? "-" : formatMoney(cash.closingAmount)}</strong></p>
              <p>Vendas: <strong className="text-[#ff9811]">{formatMoney(cash.totalSales)}</strong></p>
              <p>Diferença: <strong className={Number(cash.difference || 0) < 0 ? "text-red-400" : "text-green-400"}>{cash.difference === null ? "-" : formatMoney(cash.difference)}</strong></p>
            </div>
          </div>
        ))}
        {sessions.length === 0 && <p className="text-slate-600">Nenhum caixa aberto neste dia.</p>}
      </div>
    </div>
  );
}

function SalesChart({ report, activeTab }) {
  const visibleChart = (report.salesChart || []).filter(
    (item) => Number(item.total || 0) > 0
  );

  const maxVisibleValue = Math.max(
    ...visibleChart.map((item) => Number(item.total || 0)),
    1
  );

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
      <h4 className="font-black text-[#ff9811] mb-4">
        📊 Vendas {activeTab === "daily" ? "por horário" : "por dia"}
      </h4>

      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {visibleChart.map((item) => {
          const percent = (Number(item.total || 0) / maxVisibleValue) * 100;

          return (
            <div key={item.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{item.name}</span>
                <strong>{formatMoney(item.total)}</strong>
              </div>

              <div className="h-3 bg-[#f8fafc] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ff9811] rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}

        {visibleChart.length === 0 && (
          <p className="text-slate-600">
            Nenhuma venda encontrada neste período.
          </p>
        )}
      </div>
    </div>
  );
}

function DeliveryFeesChart({ chart }) {
  const max = Math.max(...chart.map((item) => Number(item.total || 0)), 1);
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
      <h4 className="font-black text-[#ff9811] mb-4">🛵 Entregas no mês</h4>
      <div className="space-y-3">
        {chart.map((item) => <div key={item.name}><div className="flex justify-between text-sm mb-1"><span>{item.name}</span><strong>{formatMoney(item.total)}</strong></div><div className="h-3 bg-[#f8fafc] rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(Number(item.total || 0) / max) * 100}%` }} /></div></div>)}
        {chart.length === 0 && <p className="text-slate-600">Nenhuma taxa de entrega encontrada.</p>}
      </div>
    </div>
  );
}

function Payments({ payments }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
      <h4 className="font-black text-[#ff9811] mb-4">💳 Formas de pagamento</h4>
      <div className="space-y-3">
        {payments.map((payment) => <div key={payment.name} className="flex justify-between bg-[#f8fafc] rounded-xl p-4"><span>{payment.name}</span><strong className="text-[#ff9811]">{formatMoney(payment.value)}</strong></div>)}
        {payments.length === 0 && <p className="text-slate-600">Nenhuma forma de pagamento encontrada.</p>}
      </div>
    </div>
  );
}

function OrdersList({ orders }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
      <h4 className="font-black text-[#ff9811] mb-4">🧾 Pedidos finalizados</h4>
      <div className="space-y-3">
        {orders.map((order) => <div key={order._id} className="bg-[#f8fafc] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><h5 className="font-black">#{order._id.slice(-6)}</h5><p className="text-sm text-slate-600">{order.customer?.name} • {order.customer?.whatsapp}</p></div><div className="flex flex-wrap gap-3 text-sm"><span>{order.type}</span><span>{order.payment?.method || "Não informado"}</span><strong className="text-[#ff9811]">{formatMoney(order.total)}</strong></div></div>)}
        {orders.length === 0 && <p className="text-slate-600">Nenhum pedido finalizado encontrado.</p>}
      </div>
    </div>
  );
}

function ProductReport({ report, page, onPage }) {
  const cards = report.cards || {};
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Custo dos produtos" value={formatMoney(cards.totalCost)} icon="📦" />
        <Card title="Lucro dos produtos" value={formatMoney(cards.totalProfit)} icon="📈" />
        <Card title="Ticket médio por produto" value={formatMoney(cards.averageProductTicket)} icon="🎯" />
        <Card title="Custo da quebra" value={formatMoney(cards.totalLossCost)} icon="⚠️" />
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm overflow-x-auto">
        <h4 className="font-black text-[#ff9811] mb-4">📦 Produtos vendidos</h4>
        <table className="w-full text-left min-w-[1180px]">
          <thead className="border-b border-[#e5e7eb] text-slate-600">
            <tr>
              <th className="p-3">Produto</th><th className="p-3">Código</th><th className="p-3">Qtd/Peso</th><th className="p-3">Preço venda</th><th className="p-3">Margem</th><th className="p-3">Bruto vendido</th><th className="p-3">Custo</th><th className="p-3">Lucro</th><th className="p-3">Quebra custo</th>
            </tr>
          </thead>
          <tbody>
            {(report.products || []).map((product) => <tr key={product.productId} className="border-b border-slate-200"><td className="p-3 font-bold">{product.name}</td><td className="p-3">{product.sku || "-"}</td><td className="p-3">{formatNumber(product.quantitySold)}</td><td className="p-3">{formatMoney(product.salePrice)}</td><td className="p-3 text-[#ff9811] font-black">{formatMoney(product.marginValue)} <span className="text-xs text-slate-500">({Number(product.marginPercent || 0).toFixed(1)}%)</span></td><td className="p-3">{formatMoney(product.grossSales)}</td><td className="p-3">{formatMoney(product.totalCost)}</td><td className="p-3 text-green-400 font-black">{formatMoney(product.profit)}</td><td className="p-3 text-red-500">{formatMoney(product.lossCost)}</td></tr>)}
          </tbody>
        </table>
        {(!report.products || report.products.length === 0) && <p className="text-slate-600 mt-4">Nenhum produto vendido no período.</p>}
        <div className="flex items-center justify-between gap-3 mt-5">
          <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="bg-[#f8fafc] disabled:opacity-50 px-5 py-3 rounded-xl font-bold">Página anterior</button>
          <span className="text-sm text-slate-600">Página {report.page} de {report.totalPages} • {report.total} produto(s)</span>
          <button disabled={page >= report.totalPages} onClick={() => onPage(page + 1)} className="bg-[#f8fafc] disabled:opacity-50 px-5 py-3 rounded-xl font-bold">Próxima página</button>
        </div>
      </div>
    </>
  );
}

export default Reports;
