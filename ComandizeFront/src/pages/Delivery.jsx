import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://comandize.com.br";

const API_URL = `${API_BASE_URL}/api/orders`;
const STORE_CONFIG_URL = `${API_BASE_URL}/api/store-config`;
const CASH_URL = `${API_BASE_URL}/api/cash-register`;
const DELIVERY_PERSON_URL = `${API_BASE_URL}/api/delivery-persons`;
const DELIVERY_SETTINGS_URL = `${API_BASE_URL}/api/delivery-persons/settings`;

const statusOptions = ["TODOS", "PENDENTE", "ACEITO", "PREPARANDO", "SAIU_PARA_ENTREGA", "FINALIZADO", "CANCELADO"];

const emptyManualOrder = () => ({
  type: "ENTREGA",
  customer: { name: "", whatsapp: "" },
  address: { street: "", neighborhood: "", houseNumber: "", cep: "" },
  payment: { method: "", changeFor: "" },
  scheduledTime: new Date().toTimeString().slice(0, 5),
  storeMessage: "",
  items: [],
  discount: 0,
  deliveryFee: 0,
  delivery: { distanceKm: 0, minimumFee: 3, minKmIncluded: 1, pricePerKm: 2, calculatedFee: 0, extraFee: 0, pricingMode: "MANUAL" },
  extraFee: 0,
  subtotal: 0,
  total: 0,
});

function onlyNumbers(value = "") {
  return String(value).replace(/\D/g, "");
}

function normalizeBrazilPhone(phone = "") {
  const clean = onlyNumbers(phone);
  if (!clean) return "";
  return clean.startsWith("55") ? clean : `55${clean}`;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWeight(weight) {
  return Number(weight) >= 1000 ? `${Number(weight) / 1000}kg` : `${weight}g`;
}

function getOrderColor(order) {
  const statusColors = {
    PENDENTE: "border-yellow-400 bg-white shadow-sm",
    ACEITO: "border-cyan-400 bg-white shadow-sm",
    PREPARANDO: "border-purple-400 bg-white shadow-sm",
    SAIU_PARA_ENTREGA: "border-blue-400 bg-white shadow-sm",
    CANCELADO: "border-red-400 bg-white shadow-sm",
  };
  return statusColors[order.status] || "border-[#e5e7eb] bg-white shadow-sm";
}

function recalculateOrder(order) {
  const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const discount = Math.max(0, Number(order.discount || 0));
  const deliveryFee = Math.max(0, Number(order.deliveryFee || 0));
  const extraFee = Math.max(0, Number(order.extraFee || 0));
  const total = Math.max(0, subtotal - discount + deliveryFee + extraFee);
  return { ...order, subtotal, discount, deliveryFee, extraFee, total };
}

function calculateDeliveryByKm(distanceKm, settings = {}) {
  const safeDistance = Math.max(0, Number(distanceKm || 0));
  const minimumFee = Math.max(0, Number(settings.minimumFee ?? 3));
  const minKmIncluded = Math.max(0, Number(settings.minKmIncluded ?? 1));
  const pricePerKm = Math.max(0, Number(settings.pricePerKm ?? 2));
  const extraFee = Math.max(0, Number(settings.extraFee ?? 0));
  const extraKm = Math.max(0, safeDistance - minKmIncluded);
  const calculatedFee = safeDistance > 0 ? minimumFee + extraKm * pricePerKm + extraFee : 0;

  return {
    distanceKm: Number(safeDistance.toFixed(2)),
    minimumFee,
    minKmIncluded,
    pricePerKm,
    extraFee,
    calculatedFee: Number(calculatedFee.toFixed(2)),
    pricingMode: safeDistance > 0 ? "AUTO_KM" : "MANUAL",
  };
}

function normalizePriceNumber(value, fallback = 0) {
  const cleaned = String(value ?? "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

function getBasePriceForWeight(item) {
  const storedBase = Number(item.basePriceForWeight || item.salePrice || 0);

  if (storedBase > 0) return storedBase;

  const price = Number(item.price || 0);
  const weight = Number(item.weight || 0);

  if (weight > 0) {
    return price / (weight / 1000);
  }

  return price;
}

function normalizeItemForPanel(item) {
  const weight = item.weight === undefined || item.weight === null || item.weight === "" ? null : Number(item.weight);
  const price = Number(item.price || 0);
  const quantity = Math.max(1, Number(item.quantity || 1));
  const basePriceForWeight =
    item.basePriceForWeight ||
    item.salePrice ||
    (weight ? price / (weight / 1000) : price);

  return {
    ...item,
    weight,
    price,
    quantity,
    basePriceForWeight: Number(basePriceForWeight || 0),
    subtotal: price * quantity,
  };
}

function calculatePriceByWeight(item, nextWeight) {
  const basePriceForWeight = getBasePriceForWeight(item);

  if (!nextWeight) return Number(item.price || 0);

  return basePriceForWeight * (Number(nextWeight) / 1000);
}

function buildReceiptText(order) {
  const itemsText = (order.items || [])
    .map(
      (item) =>
        `${item.quantity}x ${item.name}${item.weight ? ` (${formatWeight(item.weight)})` : ""}${
          item.cut ? ` - Corte: ${item.cut}` : ""
        } - ${formatMoney(item.subtotal)}`
    )
    .join("\n");

  return `
COMANDIZE
CUPOM DO PEDIDO #${String(order._id || "MANUAL").slice(-6)}

Cliente: ${order.customer?.name || "Cliente"}
WhatsApp: ${order.customer?.whatsapp || ""}
Tipo: ${order.type}
Horário: ${order.scheduledTime}
Status: ${order.status || "PENDENTE"}

ITENS:
${itemsText}

Subtotal: ${formatMoney(order.subtotal || order.total)}
Desconto: ${formatMoney(order.discount || 0)}
Taxa entrega: ${formatMoney(order.deliveryFee || 0)}
KM entrega: ${Number(order.delivery?.distanceKm || 0).toFixed(2)} km
Taxa extra: ${formatMoney(order.extraFee || 0)}
TOTAL: ${formatMoney(order.total)}

${order.type === "ENTREGA" ? `Endereço: ${order.address?.street}, ${order.address?.houseNumber} - ${order.address?.neighborhood}` : "Retirada na loja"}

Mensagem:
${order.storeMessage || "Sem observação"}
`;
}

function buildDeliveryPersonMessage(order) {
  const itemsText = (order.items || [])
    .map(
      (item) =>
        `• ${item.quantity}x ${item.name}${item.weight ? ` (${formatWeight(item.weight)})` : ""}${
          item.cut ? `
  Corte: ${item.cut}` : ""
        }`
    )
    .join("\n");

  return `
*Entrega COMANDIZE*
*Pedido:* #${String(order._id).slice(-6)}

*Cliente:* ${order.customer?.name || "Cliente"}
*WhatsApp:* ${order.customer?.whatsapp || ""}
*Total:* ${formatMoney(order.total)}
*Distância:* ${Number(order.delivery?.distanceKm || 0).toFixed(2)} km
*Taxa de entrega:* ${formatMoney(order.deliveryFee || 0)}
*Ganho estimado do entregador:* ${formatMoney(order.deliveryPersonPayment?.totalToPay || 0)}
*Pagamento:* ${order.payment?.method || "Não informado"}
${order.payment?.method === "Dinheiro" ? `*Troco para:* ${order.payment?.changeFor || "Não informado"}` : ""}

*Endereço:*
Rua: ${order.address?.street || ""}
Número: ${order.address?.houseNumber || ""}
Bairro: ${order.address?.neighborhood || ""}
CEP: ${order.address?.cep || "Não informado"}

*Itens:*
${itemsText}

*Observação:*
${order.storeMessage || "Sem observação"}
`;
}


function getActiveOrderIds(list = []) {
  return new Set(
    list
      .filter((order) => order.status !== "FINALIZADO" && order.status !== "CANCELADO")
      .map((order) => String(order._id))
  );
}

function getOrderNotificationText(order) {
  const customer = order?.customer?.name || "Cliente";
  const total = formatMoney(order?.total || 0);
  const type = order?.type === "ENTREGA" ? "Entrega" : "Retirada";
  return `${type} • ${customer} • ${total}`;
}

function playNewOrderBeep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const playTone = (delay, frequency) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(context.destination);

    const start = context.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

    oscillator.start(start);
    oscillator.stop(start + 0.5);
  };

  playTone(0, 880);
  playTone(0.58, 1046);
  playTone(1.16, 880);

  setTimeout(() => context.close().catch(() => {}), 2200);
}

function Delivery() {
  const [orders, setOrders] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [finishModalOrder, setFinishModalOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [searchOrder, setSearchOrder] = useState("");
  const [activeTab, setActiveTab] = useState("view");
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [manualProductSearch, setManualProductSearch] = useState("");
  const [manualProductResults, setManualProductResults] = useState([]);
  const [manualOrder, setManualOrder] = useState(emptyManualOrder());
  const [showManualForm, setShowManualForm] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState({ isOpen: false, manualCatalogStatus: "AUTO" });
  const [cashStatus, setCashStatus] = useState({ isOpen: false, cashRegister: null });
  const [cashForm, setCashForm] = useState({ operatorName: "", openingAmount: "", closingAmount: "" });
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [deliverySettings, setDeliverySettings] = useState({ minimumFee: 3, minKmIncluded: 1, pricePerKm: 2, extraFee: 0 });
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(() => localStorage.getItem("comandize_order_alerts") === "true");
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  const knownOrderIdsRef = useRef(new Set());
  const firstOrdersLoadRef = useRef(true);
  const notificationEnabledRef = useRef(notificationEnabled);

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  useEffect(() => {
    notificationEnabledRef.current = notificationEnabled;
  }, [notificationEnabled]);

  const enableOrderNotifications = async () => {
    localStorage.setItem("comandize_order_alerts", "true");
    setNotificationEnabled(true);

    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Alguns navegadores bloqueiam sem interação direta; o som/vibração continuam funcionando com a tela aberta.
      }
    }

    try {
      playNewOrderBeep();
      navigator.vibrate?.([250, 120, 250]);
    } catch {
      // Ignora bloqueios do navegador.
    }

    setNewOrderAlert({
      title: "Alertas ativados",
      body: "Quando chegar pedido novo com o painel aberto, o COMANDIZE vai tocar e vibrar quando possível.",
      createdAt: Date.now(),
    });
  };

  const notifyNewOrders = (newOrders = []) => {
    if (!newOrders.length) return;

    const firstOrder = newOrders[0];
    const body = newOrders.length > 1
      ? `${newOrders.length} pedidos novos recebidos.`
      : getOrderNotificationText(firstOrder);

    setNewOrderAlert({
      title: newOrders.length > 1 ? "Novos pedidos recebidos" : "Novo pedido recebido",
      body,
      createdAt: Date.now(),
      orderId: firstOrder?._id,
    });

    document.title = `🔔 ${newOrders.length} novo(s) pedido(s) • COMANDIZE`;
    setTimeout(() => {
      document.title = "COMANDIZE";
    }, 12000);

    if (notificationEnabledRef.current) {
      try {
        playNewOrderBeep();
      } catch {
        // Navegador pode bloquear áudio sem interação anterior.
      }

      try {
        navigator.vibrate?.([500, 180, 500, 180, 500]);
      } catch {
        // Vibração não existe em todos aparelhos.
      }
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification("Novo pedido COMANDIZE", {
          body,
          icon: "/icons/Comandize.png",
          badge: "/icons/Comandize.png",
          tag: "comandize-new-order",
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          window.location.hash = "Delivery";
          notification.close();
        };
      } catch {
        // Se o navegador bloquear Notification API, o banner e som seguem funcionando.
      }
    }
  };

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      const nextOrders = Array.isArray(data) ? data : [];
      const previousIds = knownOrderIdsRef.current;
      const nextIds = getActiveOrderIds(nextOrders);

      const newOrders = nextOrders.filter((order) => {
        const id = String(order._id || "");
        return id && order.status !== "FINALIZADO" && order.status !== "CANCELADO" && !previousIds.has(id);
      });

      setOrders(nextOrders);
      knownOrderIdsRef.current = nextIds;

      if (firstOrdersLoadRef.current) {
        firstOrdersLoadRef.current = false;
        return;
      }

      if (newOrders.length > 0) {
        notifyNewOrders(newOrders);
      }
    } catch {
      setMessage("Erro ao carregar pedidos.");
    }
  };

  const loadCatalogStatus = async () => {
    try {
      const response = await fetch(`${STORE_CONFIG_URL}/status`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) setCatalogStatus(data);
    } catch {}
  };

  const loadCashStatus = async () => {
    try {
      const response = await fetch(`${CASH_URL}/current`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) setCashStatus(data);
    } catch {}
  };

  const loadDeliveryPersons = async () => {
    try {
      const response = await fetch(`${DELIVERY_PERSON_URL}?status=ATIVO`, { headers: authHeaders });
      const data = await response.json();
      setDeliveryPersons(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadDeliverySettings = async () => {
    try {
      const response = await fetch(DELIVERY_SETTINGS_URL, { headers: authHeaders });
      const data = await response.json();
      if (response.ok) setDeliverySettings(data);
    } catch {}
  };

  useEffect(() => {
    loadOrders();
    loadCatalogStatus();
    loadCashStatus();
    loadDeliveryPersons();
    loadDeliverySettings();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.status === "FINALIZADO") return false;
      const term = searchOrder.toLowerCase();
      const matchStatus = statusFilter === "TODOS" || order.status === statusFilter;
      const matchSearch =
        !term ||
        String(order._id || "").toLowerCase().includes(term) ||
        String(order.customer?.name || "").toLowerCase().includes(term) ||
        String(order.customer?.whatsapp || "").includes(term);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchOrder]);

  const updateCatalogStatus = async (manualCatalogStatus) => {
    const response = await fetch(`${STORE_CONFIG_URL}/status`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ manualCatalogStatus }),
    });
    const data = await response.json();
    setMessage(data.message || "Status atualizado.");
    if (response.ok) setCatalogStatus(data);
  };

  const openCash = async () => {
    const response = await fetch(`${CASH_URL}/open`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ operatorName: cashForm.operatorName, openingAmount: cashForm.openingAmount }),
    });
    const data = await response.json();
    setMessage(data.message || "Caixa atualizado.");
    if (response.ok) loadCashStatus();
  };

  const closeCash = async () => {
    const response = await fetch(`${CASH_URL}/close`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ closingAmount: cashForm.closingAmount }),
    });
    const data = await response.json();
    setMessage(data.message || "Caixa atualizado.");
    if (response.ok) loadCashStatus();
  };

  const openOrder = (order) => {
    setEditingOrder(
      recalculateOrder({
        ...JSON.parse(JSON.stringify(order)),
        items: (order.items || []).map(normalizeItemForPanel),
        discount: order.discount || 0,
        deliveryFee: order.deliveryFee || 0,
        delivery: order.delivery || calculateDeliveryByKm(0, deliverySettings),
        extraFee: order.extraFee || 0,
        address: order.address || {},
        payment: order.payment || {},
      })
    );
    setProductSearch("");
    setProductResults([]);
    setSelectedDeliveryPersonId(order.assignedDeliveryPerson?._id || order.assignedDeliveryPerson || "");
    setActiveTab("view");
  };

  const closeOrder = () => {
    setEditingOrder(null);
    setFinishModalOrder(null);
    setProductSearch("");
    setProductResults([]);
    setSelectedDeliveryPersonId("");
    setActiveTab("view");
  };

  const searchProducts = async (value, mode = "edit") => {
    if (mode === "manual") setManualProductSearch(value);
    else setProductSearch(value);

    if (value.length < 2) {
      mode === "manual" ? setManualProductResults([]) : setProductResults([]);
      return;
    }

    const response = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(value)}`, { headers: authHeaders });
    const data = await response.json();
    mode === "manual" ? setManualProductResults(Array.isArray(data) ? data : []) : setProductResults(Array.isArray(data) ? data : []);
  };

  const addProduct = (product, mode = "edit") => {
    const newItem = {
      productId: product._id,
      name: product.name,
      image: product.image,
      price: Number(product.salePrice || 0),
      quantity: 1,
      weight: null,
      observation: "",
      subtotal: Number(product.salePrice || 0),
      salePrice: Number(product.salePrice || 0),
      basePriceForWeight: Number(product.salePrice || 0),
      lossPercent: Number(product.lossPercent || 0),
      // Campos auxiliares para o painel saber se pode trabalhar com gramas antes de salvar.
      // O backend continua usando productId para confirmar receita/estoque na finalização.
      measureType: product.measureType || "UNIDADE",
      recipeEnabled: Boolean(product.recipeEnabled),
      recipeItemsCount: Array.isArray(product.recipeItems) ? product.recipeItems.length : 0,
    };

    if (mode === "manual") {
      setManualOrder((old) => recalculateOrder({ ...old, items: [...old.items, newItem] }));
      setManualProductSearch("");
      setManualProductResults([]);
    } else {
      setEditingOrder((old) => recalculateOrder({ ...old, items: [...old.items, newItem] }));
      setProductSearch("");
      setProductResults([]);
    }
  };

  const updateItemQuantity = (index, quantity, mode = "edit") => {
    const source = mode === "manual" ? manualOrder : editingOrder;
    const safeQuantity = Math.max(1, Number(quantity || 1));
    const items = source.items.map((item, i) =>
      i === index
        ? { ...item, quantity: safeQuantity, subtotal: Number(item.price || 0) * safeQuantity }
        : item
    );
    const updated = recalculateOrder({ ...source, items });
    mode === "manual" ? setManualOrder(updated) : setEditingOrder(updated);
  };

  const updateItemPrice = (index, price, mode = "edit") => {
    const source = mode === "manual" ? manualOrder : editingOrder;
    const safePrice = Math.max(0, normalizePriceNumber(price, 0));

    const items = source.items.map((item, i) => {
      if (i !== index) return item;

      const currentWeight = Number(item.weight || 0);
      const basePriceForWeight =
        currentWeight > 0 ? safePrice / (currentWeight / 1000) : safePrice;

      return {
        ...item,
        price: safePrice,
        basePriceForWeight,
        subtotal: safePrice * Number(item.quantity || 1),
      };
    });

    const updated = recalculateOrder({ ...source, items });
    mode === "manual" ? setManualOrder(updated) : setEditingOrder(updated);
  };

  const updateItemWeight = (index, weight, mode = "edit") => {
    const source = mode === "manual" ? manualOrder : editingOrder;

    const rawWeight = String(weight ?? "").replace(/\D/g, "");
    const nextWeight = rawWeight === "" ? null : Math.max(1, Number(rawWeight));

    const items = source.items.map((item, i) => {
      if (i !== index) return item;

      const nextPrice = nextWeight
        ? calculatePriceByWeight(item, nextWeight)
        : Number(item.price || 0);

      return {
        ...item,
        weight: nextWeight,
        price: nextPrice,
        subtotal: nextPrice * Number(item.quantity || 1),
      };
    });

    const updated = recalculateOrder({ ...source, items });
    mode === "manual" ? setManualOrder(updated) : setEditingOrder(updated);
  };

  const removeItem = (index, mode = "edit") => {
    const source = mode === "manual" ? manualOrder : editingOrder;
    const updated = recalculateOrder({ ...source, items: source.items.filter((_, i) => i !== index) });
    mode === "manual" ? setManualOrder(updated) : setEditingOrder(updated);
  };

  const updateCharge = (field, value, mode = "edit") => {
    const source = mode === "manual" ? manualOrder : editingOrder;
    const updated = recalculateOrder({ ...source, [field]: Math.max(0, Number(value || 0)) });
    mode === "manual" ? setManualOrder(updated) : setEditingOrder(updated);
  };

  const updateDeliveryDistance = (value, mode = "edit") => {
    const source = mode === "manual" ? manualOrder : editingOrder;
    const delivery = calculateDeliveryByKm(value, deliverySettings);
    const updated = recalculateOrder({ ...source, delivery, deliveryFee: delivery.calculatedFee });
    mode === "manual" ? setManualOrder(updated) : setEditingOrder(updated);
  };

  const saveOrder = async () => {
    try {
      const updatedOrder = recalculateOrder(editingOrder);

      const response = await fetch(`${API_URL}/${updatedOrder._id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatedOrder),
      });

      const data = await response.json();
      setMessage(data.message || "Pedido atualizado com sucesso.");

      if (response.ok) {
        await loadOrders();
        closeOrder();
      }
    } catch {
      setMessage("Erro de conexão ao salvar pedido.");
    }
  };

  const createManualOrder = async () => {
    const payload = recalculateOrder(manualOrder);
    if (!payload.customer.name || !payload.customer.whatsapp || !payload.scheduledTime) {
      alert("Informe nome, WhatsApp e horário.");
      return;
    }
    if (!payload.items.length) {
      alert("Adicione ao menos um produto.");
      return;
    }

    const response = await fetch(`${API_URL}/manual`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setMessage(data.message || "Pedido criado.");
    if (response.ok) {
      setManualOrder(emptyManualOrder());
      setShowManualForm(false);
      loadOrders();
    }
  };

  const updateStatus = async (orderId, status) => {
    const response = await fetch(`${API_URL}/${orderId}/status`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    setMessage(data.message || "Status atualizado.");
    if (response.ok) {
      setEditingOrder(data.order);
      await loadOrders();
      return data.order;
    }
    return null;
  };

  const finalizeOrder = async () => {
    const response = await fetch(`${API_URL}/${editingOrder._id}/finalize`, { method: "PATCH", headers: authHeaders });
    const data = await response.json();
    setMessage(data.message || "Pedido finalizado.");
    if (response.ok) {
      setEditingOrder(data.order);
      setFinishModalOrder(data.order);
      loadOrders();
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("Deseja excluir este pedido?")) return;
    const response = await fetch(`${API_URL}/${orderId}`, { method: "DELETE", headers: authHeaders });
    const data = await response.json();
    setMessage(data.message || "Pedido excluído.");
    if (response.ok) {
      closeOrder();
      loadOrders();
    }
  };

  const sendWhatsApp = (order, type = "STATUS") => {
    const phone = normalizeBrazilPhone(order.customer?.whatsapp);
    if (!phone) return alert("Cliente sem WhatsApp.");

    let text = "";
    if (type === "SAIU") text = `Olá ${order.customer?.name || ""}! Seu pedido #${String(order._id).slice(-6)} saiu para entrega. Total: ${formatMoney(order.total)}.`;
    if (type === "FINALIZADO") text = `Olá ${order.customer?.name || ""}! Seu pedido #${String(order._id).slice(-6)} foi finalizado. Obrigado pela preferência!`;
    if (type === "CUPOM") text = buildReceiptText(order);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const printReceipt = (order = editingOrder) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<html><head><title>Cupom Pedido</title><style>body{font-family:monospace;padding:20px;white-space:pre-wrap;}</style></head><body>${buildReceiptText(order)}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const assignAndSendToDeliveryPerson = async () => {
    if (!editingOrder || editingOrder.type !== "ENTREGA") return;
    if (!selectedDeliveryPersonId) return alert("Selecione um entregador.");

    const response = await fetch(`${API_URL}/${editingOrder._id}/delivery-person`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ deliveryPersonId: selectedDeliveryPersonId }),
    });
    const data = await response.json();
    setMessage(data.message || "Entregador atualizado.");

    if (!response.ok) return;

    setEditingOrder(data.order);
    await loadOrders();

    const phone = normalizeBrazilPhone(data.deliveryPerson?.whatsapp);
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildDeliveryPersonMessage(data.order))}`, "_blank");
  };

  const renderItemsEditor = (order, mode = "edit") => (
    <div className="space-y-2">
      {(order.items || []).map((item, index) => {
        const hasWeight = item.weight !== null && item.weight !== undefined && item.weight !== "";
        const canUseWeight = hasWeight || item.measureType === "KILO";
        const hasRecipe = Boolean(item.recipeEnabled || item.recipeItemsCount > 0);

        return (
          <div key={index} className="bg-[#f9fafb] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]">
            <div className="flex gap-3 mb-2">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover bg-white" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center">🍽️</div>
              )}

              <div className="flex-1 min-w-0">
                <strong className="text-sm block truncate">
                  {item.name}{hasWeight ? ` (${formatWeight(item.weight)})` : ""}
                </strong>
                <div className="flex flex-wrap gap-2 mt-1">
                  {canUseWeight && <small className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">Peso editável</small>}
                  {hasRecipe && <small className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold">Receita/kit</small>}
                  {Number(item.lossPercent || 0) > 0 && <small className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-bold">Quebra {Number(item.lossPercent || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</small>}
                </div>
                {item.cut && (
                  <small className="text-[#6b7280] block mt-1">
                    Corte: <strong>{item.cut}</strong>
                  </small>
                )}
                <small className="text-[#6b7280] block mt-1">Subtotal: {formatMoney(item.subtotal)}</small>
              </div>

              <button onClick={() => removeItem(index, mode)} className="bg-red-500 px-3 py-1.5 rounded-lg text-xs font-bold h-fit">
                Remover
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px_1fr] gap-2 items-end">
              <label className="text-xs text-[#6b7280]">
                Preço do item
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(item.price || "").replace(".", ",")}
                  onChange={(e) => updateItemPrice(index, e.target.value, mode)}
                  className="mt-1 w-full bg-white border border-[#d1d5db] rounded-xl p-2 text-sm text-[#374151]"
                />
              </label>

              <label className="text-xs text-[#6b7280]">
                Peso em gramas
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ex: 800"
                  value={item.weight || ""}
                  onChange={(e) => updateItemWeight(index, e.target.value, mode)}
                  className="mt-1 w-full bg-white border border-[#d1d5db] rounded-xl p-2 text-sm text-[#374151]"
                />
              </label>

              <div className="text-xs text-[#6b7280]">
                Quantidade
                <div className="mt-1 flex items-center justify-center gap-2 bg-white border border-[#d1d5db] rounded-xl p-1.5">
                  <button onClick={() => updateItemQuantity(index, item.quantity - 1, mode)} className="bg-[#f3f4f6] border border-[#d1d5db] text-[#374151] w-7 h-7 rounded-full font-black">-</button>
                  <span className="font-black text-sm min-w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateItemQuantity(index, item.quantity + 1, mode)} className="bg-[#ff9811] text-white w-7 h-7 rounded-full font-black">+</button>
                </div>
              </div>

              <div className="text-[#ff9811] font-black text-sm text-right pb-2">
                {formatMoney(item.subtotal)}
              </div>
            </div>

            <p className="text-[11px] text-[#9ca3af] mt-2">
A gramagem recalcula o preço proporcionalmente usando o preço de venda/base do produto. Se quiser cobrar outro valor, ajuste o campo Preço do item.
            </p>
          </div>
        );
      })}
    </div>
  );

  const panelInfo = editingOrder?.panelInfo || {};

  return (
    <div className="space-y-6 text-[#374151]">
      {message && <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 text-sm text-[#374151] shadow-sm">{message}</div>}

      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#ff9811]">🔔 Alertas de pedidos</h3>
          <p className="text-sm text-[#6b7280]">
            {notificationEnabled
              ? "Som e vibração ativados para pedidos novos enquanto o painel estiver aberto."
              : "Ative uma vez para liberar som/vibração no navegador deste aparelho."}
          </p>
        </div>

        <button
          type="button"
          onClick={enableOrderNotifications}
          className={`${notificationEnabled ? "bg-green-500" : "bg-[#ff9811]"} text-white px-5 py-3 rounded-xl font-black text-sm`}
        >
          {notificationEnabled ? "Alertas ativos" : "Ativar som e vibração"}
        </button>
      </div>

      {newOrderAlert && (
        <div className="border-2 border-[#ff9811] bg-[#fff7ed] rounded-2xl shadow-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 animate-pulse">
          <div>
            <h3 className="text-xl font-black text-[#ff9811]">🚨 {newOrderAlert.title}</h3>
            <p className="text-sm text-[#374151] font-bold">{newOrderAlert.body}</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("TODOS");
                setNewOrderAlert(null);
                window.location.hash = "Delivery";
              }}
              className="bg-[#ff9811] text-white px-4 py-2 rounded-xl font-black text-sm"
            >
              Ver pedidos
            </button>
            <button
              type="button"
              onClick={() => setNewOrderAlert(null)}
              className="bg-white border border-[#d1d5db] text-[#374151] px-4 py-2 rounded-xl font-black text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[#ff9811]">Catálogo</h3>
              <p className="text-sm text-[#6b7280]">
                {catalogStatus.isOpen ? "Aberto para pedidos" : "Fechado para pedidos"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => updateCatalogStatus("OPEN")} className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-xs">Abrir</button>
              <button onClick={() => updateCatalogStatus("CLOSED")} className="bg-red-500 px-4 py-2 rounded-xl font-black text-xs">Fechar</button>
              <button onClick={() => updateCatalogStatus("AUTO")} className="bg-[#f9fafb] px-4 py-2 rounded-xl font-black text-xs">Auto</button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[#ff9811]">Caixa</h3>
              <p className="text-sm text-[#6b7280]">{cashStatus.isOpen ? `Aberto por ${cashStatus.cashRegister?.operatorName}` : "Caixa fechado"}</p>
            </div>
            {cashStatus.isOpen ? (
              <div className="flex gap-2">
                <input type="number" placeholder="Valor fechamento" value={cashForm.closingAmount} onChange={(e) => setCashForm({ ...cashForm, closingAmount: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-2 text-sm w-36" />
                <button onClick={closeCash} className="bg-red-500 px-4 py-2 rounded-xl font-black text-sm">Fechar caixa</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input placeholder="Nome usuário" value={cashForm.operatorName} onChange={(e) => setCashForm({ ...cashForm, operatorName: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-2 text-sm w-36" />
                <input type="number" placeholder="Entrada" value={cashForm.openingAmount} onChange={(e) => setCashForm({ ...cashForm, openingAmount: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-2 text-sm w-28" />
                <button onClick={openCash} className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-sm">Abrir caixa</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-5">
        <div className="flex flex-col xl:flex-row gap-3 justify-between">
          <input placeholder="Buscar por nome, telefone ou número do pedido" value={searchOrder} onChange={(e) => setSearchOrder(e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 flex-1 outline-none text-[#374151] placeholder:text-[#9ca3af]" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]">
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button onClick={() => setShowManualForm(true)} className="bg-[#ff9811] text-white px-6 py-3 rounded-xl font-black">+ Criar pedido</button>
        </div>
      </div>

      {showManualForm && (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex justify-between gap-3">
            <h3 className="text-xl font-black text-[#ff9811]">Criar pedido pelo painel</h3>
            <button onClick={() => setShowManualForm(false)} className="bg-[#f3f4f6] border border-[#d1d5db] text-[#374151] px-4 py-2 rounded-xl font-bold text-sm">Fechar</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <input placeholder="Nome do cliente" value={manualOrder.customer.name} onChange={(e) => setManualOrder({ ...manualOrder, customer: { ...manualOrder.customer, name: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
            <input placeholder="WhatsApp" value={manualOrder.customer.whatsapp} onChange={(e) => setManualOrder({ ...manualOrder, customer: { ...manualOrder.customer, whatsapp: onlyNumbers(e.target.value) } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
            <select value={manualOrder.type} onChange={(e) => setManualOrder({ ...manualOrder, type: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]">
              <option value="ENTREGA">Entrega</option><option value="RETIRADA">Retirada</option>
            </select>
            <input type="time" value={manualOrder.scheduledTime} onChange={(e) => setManualOrder({ ...manualOrder, scheduledTime: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
          </div>

          {manualOrder.type === "ENTREGA" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input placeholder="Rua" value={manualOrder.address.street} onChange={(e) => setManualOrder({ ...manualOrder, address: { ...manualOrder.address, street: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
              <input placeholder="Bairro" value={manualOrder.address.neighborhood} onChange={(e) => setManualOrder({ ...manualOrder, address: { ...manualOrder.address, neighborhood: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
              <input placeholder="Número" value={manualOrder.address.houseNumber} onChange={(e) => setManualOrder({ ...manualOrder, address: { ...manualOrder.address, houseNumber: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
              <input placeholder="CEP" value={manualOrder.address.cep} onChange={(e) => setManualOrder({ ...manualOrder, address: { ...manualOrder.address, cep: onlyNumbers(e.target.value) } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
            </div>
          )}

          <div className="bg-[#f9fafb] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]">
            <input placeholder="Buscar produto para adicionar" value={manualProductSearch} onChange={(e) => searchProducts(e.target.value, "manual")} className="w-full bg-white border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
            {manualProductResults.length > 0 && <div className="mt-2 rounded-xl overflow-hidden">{manualProductResults.map((product) => <button key={product._id} onClick={() => addProduct(product, "manual")} className="w-full text-left p-2 hover:bg-[#fff7ed] flex justify-between"><span>{product.name}<small className="block text-[#6b7280]">SKU: {product.sku}</small></span><strong className="text-[#ff9811]">{formatMoney(product.salePrice)}</strong></button>)}</div>}
          </div>

          {renderItemsEditor(manualOrder, "manual")}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <input type="number" placeholder="Desconto" value={manualOrder.discount || ""} onChange={(e) => updateCharge("discount", e.target.value, "manual")} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
            <input type="number" placeholder="Entrega" value={manualOrder.deliveryFee || ""} onChange={(e) => updateCharge("deliveryFee", e.target.value, "manual")} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
            <input type="number" placeholder="Extra" value={manualOrder.extraFee || ""} onChange={(e) => updateCharge("extraFee", e.target.value, "manual")} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]" />
            <button onClick={createManualOrder} className="bg-green-500 text-white p-3 rounded-xl font-black">Criar pedido • {formatMoney(manualOrder.total)}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <button key={order._id} onClick={() => openOrder(order)} className={`text-left border rounded-2xl p-5 hover:scale-[1.01] transition ${getOrderColor(order)}`}>
            <div className="flex justify-between gap-3"><h3 className="text-xl font-black">🧾 #{String(order._id).slice(-6)}</h3><span className="text-xs font-bold bg-[#f3f4f6] text-[#374151] px-3 py-1 rounded-full">{order.status}</span></div>
            <p className="mt-2 font-bold">👤 {order.customer?.name || "Cliente"}</p>
            <p className="text-[#6b7280] text-sm">📱 {order.customer?.whatsapp || ""}</p>
            <div className="mt-3 flex justify-between text-sm text-[#6b7280]"><span>{order.type === "ENTREGA" ? "🛵 ENTREGA" : "🏪 RETIRADA"}</span><span>⏰ {order.scheduledTime}</span></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full font-black ${order.panelInfo?.isRegisteredCustomer ? "bg-green-500 text-white" : "bg-[#f3f4f6] border border-[#d1d5db] text-[#374151]"}`}>{order.panelInfo?.isRegisteredCustomer ? "Cliente cadastrado" : "Não cadastrado"}</span>
              {order.assignedDeliveryPersonName && <span className="px-2 py-1 rounded-full bg-blue-500 text-[#374151] font-black">{order.assignedDeliveryPersonName}</span>}
            </div>
            <div className="mt-4 text-[#ff9811] text-xl font-black">{formatMoney(order.total)}</div>
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 && <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 text-[#6b7280]">Nenhum pedido encontrado.</div>}

      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-[#374151] w-full max-w-7xl h-[94vh] rounded-3xl overflow-hidden shadow-2xl border border-[#e5e7eb] flex flex-col">
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-black">🧾 Pedido #{String(editingOrder._id).slice(-6)}</h2><p className="text-xs text-[#6b7280]">👤 {editingOrder.customer?.name} • 📱 {editingOrder.customer?.whatsapp}</p></div>
              <button onClick={closeOrder} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-sm font-bold">Voltar</button>
            </div>

            <div className="px-5 pt-4 grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
              <button onClick={() => setActiveTab("view")} className={`p-3 rounded-xl text-sm font-black ${activeTab === "view" ? "bg-[#ff9811] text-white" : "bg-[#f9fafb]"}`}>👁️ Visualizar</button>
              <button onClick={() => setActiveTab("edit")} className={`p-3 rounded-xl text-sm font-black ${activeTab === "edit" ? "bg-[#ff9811] text-white" : "bg-[#f9fafb]"}`}>✏️ Editar dados</button>
              <button onClick={() => setActiveTab("products")} className={`p-3 rounded-xl text-sm font-black ${activeTab === "products" ? "bg-[#ff9811] text-white" : "bg-[#f9fafb]"}`}>🛒 Produtos</button>
              <button onClick={() => setActiveTab("finish")} className={`p-3 rounded-xl text-sm font-black ${activeTab === "finish" ? "bg-[#ff9811] text-white" : "bg-[#f9fafb]"}`}>✅ Finalização</button>
            </div>

            {activeTab === "view" && (
              <div className="p-5 flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
                  <div className="space-y-3">
                    <div className="bg-[#fff7ed] border border-orange-100 rounded-2xl shadow-sm p-4">
                      <h3 className="font-black text-[#ff9811] mb-3 text-sm">📌 Informações do pedido</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-[#6b7280] text-xs">Cliente</p><p className="font-black">{editingOrder.customer?.name || "Cliente"}</p></div>
                        <div><p className="text-[#6b7280] text-xs">WhatsApp</p><p className="font-black">{editingOrder.customer?.whatsapp || "-"}</p></div>
                        <div><p className="text-[#6b7280] text-xs">Tipo</p><p className="font-black">{editingOrder.type === "ENTREGA" ? "🛵 Entrega" : "🏪 Retirada"}</p></div>
                        <div><p className="text-[#6b7280] text-xs">Horário</p><p className="font-black">{editingOrder.scheduledTime || "-"}</p></div>
                        <div><p className="text-[#6b7280] text-xs">Status</p><p className="font-black">{editingOrder.status || "PENDENTE"}</p></div>
                        <div><p className="text-[#6b7280] text-xs">Total</p><p className="font-black text-[#ff9811]">{formatMoney(editingOrder.total)}</p></div>
                      </div>
                    </div>

                    {editingOrder.type === "ENTREGA" && (
                      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4">
                        <h3 className="font-black text-[#ff9811] mb-3 text-sm">📍 Endereço de entrega</h3>
                        <p className="text-sm font-bold">{editingOrder.address?.street || "Rua não informada"}, {editingOrder.address?.houseNumber || "S/N"}</p>
                        <p className="text-sm text-[#6b7280]">{editingOrder.address?.neighborhood || "Bairro não informado"}</p>
                        {editingOrder.address?.cep && <p className="text-sm text-[#6b7280]">CEP: {editingOrder.address.cep}</p>}
                      </div>
                    )}

                    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4">
                      <h3 className="font-black text-[#ff9811] mb-3 text-sm">🎁 Cliente e fidelidade</h3>
                      <div className="space-y-2 text-sm text-[#6b7280]">
                        <p>{panelInfo.isRegisteredCustomer ? "✅ Cliente cadastrado" : "⚠️ Cliente não cadastrado"}</p>
                        <p>Pontos previstos: <strong className="text-[#ff9811]">{panelInfo.pointsToEarn || 0}</strong></p>
                        <p>Cashback usado: <strong className="text-green-600">{formatMoney(panelInfo.cashbackUsed || 0)}</strong></p>
                        <p>Indicação: <strong>{panelInfo.referralCodeUsed || "Nenhuma"}</strong></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setActiveTab("edit")} className="bg-[#ff9811] text-white p-3 rounded-xl font-black text-sm">✏️ Editar dados</button>
                      <button onClick={() => setActiveTab("products")} className="bg-[#f3f4f6] border border-[#d1d5db] text-[#374151] p-3 rounded-xl font-black text-sm">🛒 Editar itens</button>
                    </div>
                  </div>

                  <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="font-black text-[#ff9811] text-sm">🛒 Itens do pedido ({editingOrder.items?.length || 0})</h3>
                      <button onClick={() => setActiveTab("products")} className="bg-[#ff9811] text-white px-3 py-2 rounded-xl font-black text-xs">Editar produtos</button>
                    </div>
                    <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                      {(editingOrder.items || []).map((item, index) => (
                        <div key={index} className="flex gap-3 items-center bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-3">
                          {item.image ? <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover bg-white" /> : <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center">🍽️</div>}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm truncate">{item.quantity}x {item.name}</p>
                            <p className="text-xs text-[#6b7280]">{item.weight ? formatWeight(item.weight) : "Unidade"}</p>
                            {item.cut && <p className="text-xs text-[#6b7280] truncate">Corte: {item.cut}</p>}
                            {item.observation && <p className="text-xs text-[#6b7280] truncate">Obs: {item.observation}</p>}
                          </div>
                          <p className="font-black text-[#ff9811] text-sm shrink-0">{formatMoney(item.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#e5e7eb] mt-4 pt-4 space-y-1 text-sm">
                      <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(editingOrder.subtotal)}</strong></div>
                      <div className="flex justify-between"><span>Desconto</span><strong>{formatMoney(editingOrder.discount)}</strong></div>
                      <div className="flex justify-between"><span>Taxa entrega</span><strong>{formatMoney(editingOrder.deliveryFee)}</strong></div>
                      <div className="flex justify-between"><span>Taxa extra</span><strong>{formatMoney(editingOrder.extraFee)}</strong></div>
                      <div className="flex justify-between text-xl text-[#ff9811] pt-2"><span className="font-black">Total</span><strong>{formatMoney(editingOrder.total)}</strong></div>
                    </div>
                    <button onClick={() => setActiveTab("finish")} className="w-full mt-4 bg-green-500 text-white p-4 rounded-xl font-black">Ir para finalização</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "edit" && (
              <div className="p-5 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto space-y-3">
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-3">
                    <h3 className="font-black text-[#ff9811] mb-3 text-sm">👤 Dados do cliente</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <input value={editingOrder.customer?.name || ""} onChange={(e) => setEditingOrder({ ...editingOrder, customer: { ...editingOrder.customer, name: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                      <input value={editingOrder.customer?.whatsapp || ""} onChange={(e) => setEditingOrder({ ...editingOrder, customer: { ...editingOrder.customer, whatsapp: onlyNumbers(e.target.value) } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                      <select value={editingOrder.type} onChange={(e) => setEditingOrder({ ...editingOrder, type: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm"><option value="ENTREGA">🛵 ENTREGA</option><option value="RETIRADA">🏪 RETIRADA</option></select>
                      <input type="time" value={editingOrder.scheduledTime} onChange={(e) => setEditingOrder({ ...editingOrder, scheduledTime: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                      <select value={editingOrder.status} onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm">{statusOptions.filter((s) => s !== "TODOS").map((status) => <option key={status} value={status}>{status}</option>)}</select>
                    </div>
                  </div>

                  {editingOrder.type === "ENTREGA" && (
                    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-3">
                      <h3 className="font-black text-[#ff9811] mb-2 text-sm">📍 Endereço</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <input placeholder="Rua" value={editingOrder.address?.street || ""} onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, street: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                        <input placeholder="Bairro" value={editingOrder.address?.neighborhood || ""} onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, neighborhood: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                        <input placeholder="Número" value={editingOrder.address?.houseNumber || ""} onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, houseNumber: e.target.value } })} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-3">
                    <h3 className="font-black text-[#ff9811] mb-2 text-sm">💰 Taxas</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <input type="number" placeholder="Desconto" value={editingOrder.discount || ""} onChange={(e) => updateCharge("discount", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                      <input type="number" placeholder="Entrega" value={editingOrder.deliveryFee || ""} onChange={(e) => updateCharge("deliveryFee", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                      <input type="number" placeholder="Extra" value={editingOrder.extraFee || ""} onChange={(e) => updateCharge("extraFee", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-white border-t border-[#e5e7eb] pt-3 flex items-center justify-between gap-3">
                    <div><p className="text-xs text-[#6b7280]">Total do pedido</p><p className="text-2xl font-black text-[#ff9811]">{formatMoney(editingOrder.total)}</p></div>
                    <div className="flex gap-2"><button onClick={saveOrder} className="bg-[#ff9811] text-white px-4 py-3 rounded-xl text-sm font-black">Salvar</button><button onClick={() => deleteOrder(editingOrder._id)} className="bg-red-500 px-4 py-3 rounded-xl text-sm font-black">Excluir</button></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div className="p-5 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-3 shrink-0">
                  <h3 className="font-black text-[#ff9811] mb-2 text-sm">🛒 Adicionar produto</h3>
                  <input placeholder="Buscar produto por nome ou SKU" value={productSearch} onChange={(e) => searchProducts(e.target.value)} className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm" />
                  {productResults.length > 0 && <div className="mt-2 bg-[#f9fafb] rounded-xl overflow-hidden">{productResults.map((product) => <button key={product._id} onClick={() => addProduct(product)} className="w-full text-left p-2 hover:bg-[#fff7ed] flex justify-between text-sm"><span>{product.name}<small className="block text-[#6b7280]">SKU: {product.sku}</small></span><strong className="text-[#ff9811]">{formatMoney(product.salePrice)}</strong></button>)}</div>}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">{renderItemsEditor(editingOrder)}</div>
                <div className="shrink-0 border-t border-[#e5e7eb] pt-3 flex items-center justify-between gap-3">
                  <div><p className="text-xs text-[#6b7280]">Total do pedido</p><p className="text-2xl font-black text-[#ff9811]">{formatMoney(editingOrder.total)}</p></div>
                  <button onClick={saveOrder} className="bg-[#ff9811] text-white px-5 py-3 rounded-xl text-sm font-black">Salvar alterações</button>
                </div>
              </div>
            )}

            {activeTab === "finish" && (
              <div className="p-5 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4">
                  <h3 className="text-lg font-black text-[#ff9811] mb-3">✅ Resumo da finalização</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm"><p>👤 {editingOrder.customer?.name}</p><p>📱 {editingOrder.customer?.whatsapp}</p><p>{editingOrder.type === "ENTREGA" ? "🛵 ENTREGA" : "🏪 RETIRADA"}</p><p>⏰ {editingOrder.scheduledTime}</p></div>
                  {editingOrder.type === "ENTREGA" && <p className="mt-3 text-sm text-[#6b7280]">📍 {editingOrder.address?.street}, {editingOrder.address?.houseNumber} - {editingOrder.address?.neighborhood}</p>}
                  {editingOrder.type === "ENTREGA" && (
                    <div className="mt-4 border-t border-[#e5e7eb] pt-4">
                      <h3 className="font-black text-[#ff9811] mb-3">📍 Distância e taxa de entrega</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-sm text-[#6b7280]">
                          KM até cliente
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingOrder.delivery?.distanceKm || ""}
                            onChange={(e) => updateDeliveryDistance(e.target.value)}
                            className="mt-1 w-full bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] outline-none text-[#374151] placeholder:text-[#9ca3af]"
                          />
                        </label>
                        <div className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm">
                          <p className="text-[#6b7280]">Regra</p>
                          <p className="font-black">Até {deliverySettings.minKmIncluded || 1} km: {formatMoney(deliverySettings.minimumFee || 0)}</p>
                          <p>Depois: {formatMoney(deliverySettings.pricePerKm || 0)}/km</p>
                        </div>
                        <div className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-sm">
                          <p className="text-[#6b7280]">Taxa calculada</p>
                          <p className="text-xl font-black text-[#ff9811]">{formatMoney(editingOrder.deliveryFee)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 border-t border-[#e5e7eb] pt-4 text-sm space-y-1"><p>Subtotal: {formatMoney(editingOrder.subtotal)}</p><p>Desconto: {formatMoney(editingOrder.discount)}</p><p>Taxa entrega: {formatMoney(editingOrder.deliveryFee)}</p><p>Distância: {Number(editingOrder.delivery?.distanceKm || 0).toFixed(2)} km</p><p>Taxa extra: {formatMoney(editingOrder.extraFee)}</p><p className="text-2xl text-[#ff9811] font-black mt-2">Total: {formatMoney(editingOrder.total)}</p></div>
                </div>

                {editingOrder.type === "ENTREGA" && (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-4">
                    <h3 className="font-black text-[#ff9811] mb-3">🛻 Entregador</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                      <select value={selectedDeliveryPersonId} onChange={(e) => setSelectedDeliveryPersonId(e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 text-[#374151] placeholder:text-[#9ca3af]">
                        <option value="">Selecione um entregador ativo</option>
                        {deliveryPersons.map((person) => <option key={person._id} value={person._id}>{person.name} • {person.whatsapp}</option>)}
                      </select>
                      <button onClick={assignAndSendToDeliveryPerson} className="bg-blue-500 p-3 rounded-xl font-black text-sm">Enviar pedido para entregador</button>
                    </div>
                    {editingOrder.assignedDeliveryPersonName && (
                      <div className="text-sm text-[#6b7280] mt-2 space-y-1">
                        <p>Vinculado: {editingOrder.assignedDeliveryPersonName} • {editingOrder.assignedDeliveryPersonWhatsapp}</p>
                        <p>KM: {Number(editingOrder.deliveryPersonPayment?.distanceKm || 0).toFixed(2)} • Ganho estimado: {formatMoney(editingOrder.deliveryPersonPayment?.totalToPay || 0)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={async () => { const updated = await updateStatus(editingOrder._id, "SAIU_PARA_ENTREGA"); if (updated) sendWhatsApp(updated, "SAIU"); }} className="bg-blue-500 p-4 rounded-xl font-black text-sm">🛵 Saiu + WhatsApp</button>
                  <button onClick={() => sendWhatsApp(editingOrder, "CUPOM")} className="bg-[#ff9811] text-white p-4 rounded-xl font-black text-sm">🧾 Enviar cupom</button>
                  <button onClick={() => printReceipt(editingOrder)} className="bg-[#f3f4f6] border border-[#d1d5db] text-[#374151] p-4 rounded-xl font-black text-sm">🖨️ Imprimir cupom</button>
                  <button onClick={finalizeOrder} className="bg-green-500 p-4 rounded-xl font-black text-sm">✅ Finalizar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {finishModalOrder && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 w-full max-w-md text-[#374151]">
            <h3 className="text-2xl font-black text-[#ff9811] mb-2">Pedido finalizado</h3>
            <p className="text-[#6b7280] mb-5">Escolha o que deseja fazer agora.</p>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => printReceipt(finishModalOrder)} className="bg-[#f3f4f6] border border-[#d1d5db] text-[#374151] p-4 rounded-xl font-black">🖨️ Imprimir cupom</button>
              <button onClick={() => sendWhatsApp(finishModalOrder, "FINALIZADO")} className="bg-green-500 text-white p-4 rounded-xl font-black">💬 Enviar mensagem ao cliente</button>
              <button onClick={() => { setFinishModalOrder(null); closeOrder(); }} className="bg-red-500 p-4 rounded-xl font-black">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Delivery;
