import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://comandize.com.br";

const MAIN_DOMAINS = [
  "comandize.com.br",
  "www.comandize.com.br",
  "localhost",
  "127.0.0.1",
];

function isCustomDomainHost() {
  const host = window.location.hostname.toLowerCase();
  return !MAIN_DOMAINS.includes(host);
}

function getCatalogLookupKey() {
  const pathKey = window.location.pathname.replace(/^\/+|\/+$/g, "");

  if (pathKey) return pathKey;

  if (isCustomDomainHost()) {
    return window.location.hostname.toLowerCase().replace(/^www\./, "");
  }

  return "";
}

function getAssetUrl(path = "") {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/uploads")) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}

const daysLabels = {
  domingo: "Domingo",
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
};

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatWeight(weight) {
  return Number(weight) >= 1000 ? `${Number(weight) / 1000}kg` : `${weight}g`;
}

function getProductPrice(product, customer) {
  const clientPrice = Number(product?.clientPrice || 0);
  const salePrice = Number(product?.salePrice || 0);

  if (customer && clientPrice > 0) {
    return clientPrice;
  }

  return salePrice;
}

function onlyNumbers(value = "") {
  return String(value).replace(/\D/g, "");
}

function getAvailableCuts(item) {
  const rawCuts = item?.cuts || item?.cutOptions || [];

  const cuts = Array.isArray(rawCuts)
    ? rawCuts
    : String(rawCuts || "")
        .split(",")
        .map((cut) => cut.trim());

  return cuts
    .map((cut) => String(cut || "").trim())
    .filter(Boolean)
    .filter((cut) => cut.toLowerCase() !== "nenhum");
}

function hasWeightVariationAlert(item) {
  const cuts = getAvailableCuts(item).map((cut) =>
    String(cut || "").trim().toLowerCase()
  );

  return cuts.includes("assado") || cuts.includes("quente");
}

const weightVariationAlertText =
  "Este produto pode ter variações no peso de até 15% a mais ou 10% a menos por ser produto assado, em pedaços ou inteiro. Mas fique tranquilo: você será avisado pelo WhatsApp sobre o valor da mudança se isso ocorrer.";


function BenefitImage({ src, alt }) {
  return (
    <div className="rounded-3xl overflow-hidden border border-red-100 bg-white shadow-sm">
      <img
        src={src}
        alt={alt}
        className="w-full h-auto object-cover block"
      />
    </div>
  );
}

function LoyaltyPreview({ onClick, compact = false, disabled = false }) {
  const content = (
    <div className={`${compact ? "mt-4" : "space-y-3"}`}>
      <BenefitImage src="/icons/fidelidade.png" alt="Programa de fidelidade" />

      {!disabled && (
        <p className="text-center text-sm font-black text-red-600 mt-3">
          Toque para se cadastrar e participar
        </p>
      )}
    </div>
  );

  if (!onClick || disabled) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left hover:scale-[1.01] transition-transform"
    >
      {content}
    </button>
  );
}

function BenefitsPage({ customer, onClose, onRegister }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4">
      <div className="bg-white text-[#20242b] w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-zinc-200 p-5 flex items-center justify-between gap-3 z-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-red-600">
              Programa de fidelidade
            </h2>
            <p className="text-sm text-zinc-500">
              {customer ? `Benefícios disponíveis para ${customer.name}` : "Cadastre-se para aproveitar melhor o catálogo."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="bg-zinc-900 text-white px-4 py-2 rounded-xl font-black text-sm"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BenefitImage src="/icons/acumulecard.png" alt="Acumule pontos" />
            <BenefitImage src="/icons/referenciacard.png" alt="Referencie e ganhe" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-black text-red-600 text-lg">Pedido mais rápido</h3>
              <p className="text-sm text-zinc-600 mt-1">
                Depois de cadastrado, seus dados ficam salvos para você concluir pedidos sem preencher tudo novamente.
              </p>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="text-3xl mb-2">📍</div>
              <h3 className="font-black text-red-600 text-lg">Endereço automático</h3>
              <p className="text-sm text-zinc-600 mt-1">
                Na entrega, o sistema pode preencher seu endereço automaticamente usando seu cadastro.
              </p>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-black text-red-600 text-lg">Promoções no WhatsApp</h3>
              <p className="text-sm text-zinc-600 mt-1">
                Futuramente você poderá receber ofertas exclusivas, avisos e promoções direto no WhatsApp.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 text-white rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">Também tem pontos, cashback e indicação</h3>
              <p className="text-sm text-zinc-300 mt-1">
                Cliente cadastrado pode participar das campanhas de fidelidade criadas pela loja.
              </p>
            </div>

            {!customer && (
              <button
                onClick={onRegister}
                className="bg-red-600 text-white px-6 py-3 rounded-xl font-black"
              >
                Cadastrar agora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function PublicCatalog() {
  const [store, setStore] = useState(null);
  const [config, setConfig] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [carouselPages, setCarouselPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showHours, setShowHours] = useState(false);
  const [showBenefitsPage, setShowBenefitsPage] = useState(false);

  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem("comandize_customer");
    return saved ? JSON.parse(saved) : null;
  });

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    name: "",
    whatsapp: "",
    password: "",
    cpf: "",
    street: "",
    neighborhood: "",
    houseNumber: "",
    cep: "",
  });

  const [loginForm, setLoginForm] = useState({
    whatsapp: "",
    password: "",
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState("");
  const [selectedCut, setSelectedCut] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("comandize_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(false);
  const [orderType, setOrderType] = useState("");
  const [message, setMessage] = useState("");

  const [checkout, setCheckout] = useState({
    name: "",
    whatsapp: "",
    street: "",
    neighborhood: "",
    houseNumber: "",
    cep: "",
    paymentMethod: "",
    changeFor: "",
    pickupTime: "",
    storeMessage: "",
  });

  const catalogUrl = getCatalogLookupKey();

  const getCatalogHash = () =>
    decodeURIComponent(window.location.hash.replace("#", ""));

  const clearCatalogHash = () => {
    if (window.location.hash) {
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      return;
    }

    setSelectedItem(null);
    setShowCart(false);
    setCheckoutStep(false);
    setShowRegisterModal(false);
    setShowLoginModal(false);
    setShowBenefitsPage(false);
  };

  const pushCatalogHash = (hash) => {
    const nextHash = `#${encodeURIComponent(hash)}`;

    if (window.location.hash === nextHash) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      return;
    }

    window.location.hash = encodeURIComponent(hash);
  };

  const syncCatalogHash = () => {
    const hash = getCatalogHash();

    if (!hash) {
      setSelectedItem(null);
      setShowCart(false);
      setCheckoutStep(false);
      setShowRegisterModal(false);
      setShowLoginModal(false);
      setShowBenefitsPage(false);
      return;
    }

    if (hash === "register") {
      setShowRegisterModal(true);
      setShowLoginModal(false);
      setShowBenefitsPage(false);
      setShowCart(false);
      setCheckoutStep(false);
      setSelectedItem(null);
      return;
    }

    if (hash === "login") {
      setShowLoginModal(true);
      setShowRegisterModal(false);
      setShowBenefitsPage(false);
      setShowCart(false);
      setCheckoutStep(false);
      setSelectedItem(null);
      return;
    }

    if (hash === "benefits") {
      setShowBenefitsPage(true);
      setShowRegisterModal(false);
      setShowLoginModal(false);
      setShowCart(false);
      setCheckoutStep(false);
      setSelectedItem(null);
      return;
    }

    if (hash === "cart") {
      setShowCart(true);
      setCheckoutStep(false);
      setShowRegisterModal(false);
      setShowLoginModal(false);
      setShowBenefitsPage(false);
      setSelectedItem(null);
      return;
    }

    if (hash === "checkout") {
      setShowCart(true);
      setCheckoutStep(true);
      setShowRegisterModal(false);
      setShowLoginModal(false);
      setShowBenefitsPage(false);
      setSelectedItem(null);
      return;
    }

    if (hash.startsWith("item-")) {
      const itemId = hash.replace("item-", "");
      const foundItem = sections
        .flatMap((section) => section.products || [])
        .find((item) => String(item._id) === String(itemId));

      if (foundItem) {
        setShowCart(false);
        setCheckoutStep(false);
        setShowRegisterModal(false);
        setShowLoginModal(false);
        setShowBenefitsPage(false);

        setSelectedItem((current) => {
          if (String(current?._id || "") === String(foundItem._id)) {
            return current;
          }

          setSelectedWeight("");
          setSelectedCut("");
          setQuantity(1);
          setObservation("");
          setMessage("");

          return foundItem;
        });
      }
    }
  };


  useEffect(() => {
    fetch(`${API_BASE_URL}/api/catalog/${encodeURIComponent(catalogUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        setStore(data.store);
        setConfig(data.config);
        setIsOpen(data.isOpen);
        setSections(data.sections || []);
        setLoading(false);
      });
  }, [catalogUrl]);

  useEffect(() => {
    syncCatalogHash();

    window.addEventListener("hashchange", syncCatalogHash);

    return () => {
      window.removeEventListener("hashchange", syncCatalogHash);
    };
  }, [sections]);

  useEffect(() => {
    localStorage.setItem("comandize_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (customer) {
      setCheckout((old) => ({
        ...old,
        name: customer.name || old.name,
        whatsapp: customer.whatsapp || old.whatsapp,
        street: customer.deliveryAddress?.street || old.street,
        neighborhood: customer.deliveryAddress?.neighborhood || old.neighborhood,
        houseNumber: customer.deliveryAddress?.houseNumber || old.houseNumber,
        cep: customer.deliveryAddress?.cep || old.cep,
      }));
    }
  }, [customer]);

  const saveCustomer = (customerData) => {
    const oldCustomer = localStorage.getItem("comandize_customer")
      ? JSON.parse(localStorage.getItem("comandize_customer"))
      : null;

    const customerToSave = {
      ...oldCustomer,
      ...customerData,
      deliveryAddress:
        customerData.deliveryAddress || oldCustomer?.deliveryAddress || null,
    };

    localStorage.setItem("comandize_customer", JSON.stringify(customerToSave));
    setCustomer(customerToSave);

    setCheckout((old) => ({
      ...old,
      name: customerToSave.name || "",
      whatsapp: customerToSave.whatsapp || "",
      street: customerToSave.deliveryAddress?.street || old.street,
      neighborhood: customerToSave.deliveryAddress?.neighborhood || old.neighborhood,
      houseNumber: customerToSave.deliveryAddress?.houseNumber || old.houseNumber,
      cep: customerToSave.deliveryAddress?.cep || old.cep,
    }));
  };

  const logoutCustomer = () => {
    localStorage.removeItem("comandize_customer");
    setCustomer(null);
    setCustomerMessage("");
  };

  const saveCustomerDeliveryAddress = () => {
    if (!customer) return;

    const updatedCustomer = {
      ...customer,
      deliveryAddress: {
        street: checkout.street,
        neighborhood: checkout.neighborhood,
        houseNumber: checkout.houseNumber,
        cep: checkout.cep,
      },
    };

    localStorage.setItem("comandize_customer", JSON.stringify(updatedCustomer));
    setCustomer(updatedCustomer);
  };

  const handleOpenRegister = () => {
    setCustomerMessage("");
    pushCatalogHash("register");
  };

  const handleOpenLogin = () => {
    setCustomerMessage("");
    pushCatalogHash("login");
  };

  const handleOpenBenefits = () => {
    setCustomerMessage("");
    pushCatalogHash("benefits");
  };

  const registerCustomer = async () => {
    try {
      setCustomerLoading(true);
      setCustomerMessage("");

      if (!registerForm.name || !registerForm.whatsapp || !registerForm.password) {
        setCustomerMessage("Preencha nome, WhatsApp e senha.");
        return;
      }

      if (registerForm.password.length < 4 || registerForm.password.length > 15) {
        setCustomerMessage("A senha deve ter entre 4 e 15 caracteres.");
        return;
      }

      const referralCode =
        new URLSearchParams(window.location.search).get("ref") || "";

      const response = await fetch(
        `${API_BASE_URL}/api/customers/register/${catalogUrl}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: registerForm.name,
            whatsapp: onlyNumbers(registerForm.whatsapp),
            password: registerForm.password,
            cpf: onlyNumbers(registerForm.cpf),
            address: {
              street: registerForm.street,
              neighborhood: registerForm.neighborhood,
              houseNumber: registerForm.houseNumber,
              cep: onlyNumbers(registerForm.cep),
            },
            referralCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setCustomerMessage(data.message || "Erro ao cadastrar.");
        return;
      }

      saveCustomer(data.customer);
      setCustomerMessage(data.message || "Cadastro realizado com sucesso.");
      setShowRegisterModal(false);

      setRegisterForm({
        name: "",
        whatsapp: "",
        password: "",
        cpf: "",
        street: "",
        neighborhood: "",
        houseNumber: "",
        cep: "",
      });
    } catch (error) {
      setCustomerMessage("Erro de conexão com o servidor.");
    } finally {
      setCustomerLoading(false);
    }
  };

  const loginCustomer = async () => {
    try {
      setCustomerLoading(true);
      setCustomerMessage("");

      if (!loginForm.whatsapp || !loginForm.password) {
        setCustomerMessage("Informe WhatsApp e senha.");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/customers/login/${catalogUrl}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            whatsapp: onlyNumbers(loginForm.whatsapp),
            password: loginForm.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setCustomerMessage(data.message || "Cliente não encontrado.");
        return;
      }

      saveCustomer(data.customer);
      setCustomerMessage(data.message || "Login realizado com sucesso.");
      setShowLoginModal(false);

      setLoginForm({
        whatsapp: "",
        password: "",
      });
    } catch (error) {
      setCustomerMessage("Erro de conexão com o servidor.");
    } finally {
      setCustomerLoading(false);
    }
  };

  const shareReferralLink = async () => {
    if (!customer?._id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/customers/referral/${customer._id}`
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Erro ao gerar indicação.");
        return;
      }

      window.open(data.whatsappLink, "_blank");
    } catch {
      alert("Erro de conexão ao gerar indicação.");
    }
  };

  const openItemModal = (item) => {
    setSelectedItem(item);
    setSelectedWeight("");
    setSelectedCut("");
    setQuantity(1);
    setObservation("");
    setMessage("");
    pushCatalogHash(`item-${item._id}`);
  };

  const closeItemModal = () => {
    setSelectedItem(null);
    setSelectedWeight("");
    setSelectedCut("");
    setQuantity(1);
    setObservation("");
    setMessage("");
    clearCatalogHash();
  };

  const getItemUnitPrice = () => {
    if (!selectedItem) return 0;

    const product = selectedItem.product;

    const basePrice = getProductPrice(product, customer);

    if (selectedItem.weightOptions?.length > 0) {
      if (!selectedWeight) return 0;
      return basePrice * (Number(selectedWeight) / 1000);
    }

    return basePrice;
  };

  const getItemTotal = () => getItemUnitPrice() * quantity;

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const availableCashback = customer ? Number(customer.cashbackBalance || 0) : 0;
  const cashbackDiscount = Math.min(cartTotal, availableCashback);
  const finalCartTotal = Math.max(0, cartTotal - cashbackDiscount);

  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = () => {
    if (!selectedItem) return;

    const product = selectedItem.product;
    const hasWeight = selectedItem.weightOptions?.length > 0;
    const availableCuts = getAvailableCuts(selectedItem);

    if (hasWeight && !selectedWeight) {
      setMessage("Escolha uma opção de peso antes de adicionar.");
      return;
    }

    if (availableCuts.length > 1 && !selectedCut) {
      setMessage("Escolha o corte antes de adicionar.");
      return;
    }

    if (cartQuantity + quantity > 30) {
      setMessage("O carrinho permite no máximo 30 itens.");
      return;
    }

    const cartItem = {
      cartId: `${selectedItem._id}-${selectedWeight || "unidade"}-${Date.now()}`,
      itemId: selectedItem._id,
      productId: product._id,
      name: product.name,
      image: product.image,
      price: getItemUnitPrice(),
      quantity,
      weight: selectedWeight ? Number(selectedWeight) : null,
      cut: availableCuts.length === 1 ? availableCuts[0] : selectedCut,
      observation,
    };

    setCart([...cart, cartItem]);
    setSelectedItem(null);
    setSelectedWeight("");
    setSelectedCut("");
    setQuantity(1);
    setObservation("");
    setMessage("");
    pushCatalogHash("cart");
  };

  const increaseCartItem = (cartId) => {
    if (cartQuantity >= 30) {
      alert("O carrinho permite no máximo 30 itens.");
      return;
    }

    setCart(
      cart.map((item) =>
        item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseCartItem = (cartId) => {
    setCart(
      cart
        .map((item) =>
          item.cartId === cartId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const generateAvailableTimes = () => {
    const times = [];
    const now = new Date();
    now.setMinutes(now.getMinutes() + 40);

    const currentDay = [
      "domingo",
      "segunda",
      "terca",
      "quarta",
      "quinta",
      "sexta",
      "sabado",
    ][new Date().getDay()];

    const schedule = config?.schedules?.[currentDay];
    const closeHour = schedule?.close || "23:00";

    const [closeH, closeM] = closeHour.split(":").map(Number);
    const closeDate = new Date();
    closeDate.setHours(closeH, closeM, 0, 0);

    while (now <= closeDate) {
      const hour = String(now.getHours()).padStart(2, "0");
      const minute = String(now.getMinutes()).padStart(2, "0");
      times.push(`${hour}:${minute}`);
      now.setMinutes(now.getMinutes() + 15);
    }

    return times;
  };

  const finishOrder = async () => {
    if (!orderType) {
      alert("Escolha Entrega ou Retirada.");
      return;
    }

    if (!checkout.name || !checkout.whatsapp || !checkout.pickupTime) {
      alert("Preencha nome, WhatsApp e horário.");
      return;
    }

    if (orderType === "ENTREGA") {
      if (
        !checkout.street ||
        !checkout.neighborhood ||
        !checkout.houseNumber ||
        !checkout.paymentMethod
      ) {
        alert("Preencha os dados de entrega e pagamento.");
        return;
      }
    }

    const savedCustomer = localStorage.getItem("comandize_customer")
      ? JSON.parse(localStorage.getItem("comandize_customer"))
      : null;

    const referralCodeUsed =
      new URLSearchParams(window.location.search).get("ref") || "";

    const orderPayload = {
      type: orderType,
      customerAccount: savedCustomer?._id || null,
      referralCodeUsed,
      customer: {
        name: checkout.name,
        whatsapp: checkout.whatsapp,
      },
      address: {
        street: checkout.street,
        neighborhood: checkout.neighborhood,
        houseNumber: checkout.houseNumber,
        cep: checkout.cep,
      },
      payment: {
        method: checkout.paymentMethod,
        changeFor: checkout.changeFor,
      },
      scheduledTime: checkout.pickupTime,
      storeMessage: checkout.storeMessage,
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        weight: item.weight,
        cut: item.cut || "",
        observation: item.observation,
      })),
      discount: cashbackDiscount,
      cashbackUsed: cashbackDiscount,
      total: finalCartTotal,
    };

    const response = await fetch(
      `${API_BASE_URL}/api/orders/public/${catalogUrl}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Erro ao finalizar pedido.");
      return;
    }

    localStorage.setItem(
      "comandize_last_customer_data",
      JSON.stringify({
        name: checkout.name,
        whatsapp: checkout.whatsapp,
        street: checkout.street,
        neighborhood: checkout.neighborhood,
        houseNumber: checkout.houseNumber,
        cep: checkout.cep,
      })
    );

    if (customer && orderType === "ENTREGA") {
      saveCustomerDeliveryAddress();
    }

    const itemsText = cart
      .map((item) => {
        return `• ${item.quantity}x ${item.name}${
          item.weight ? ` (${formatWeight(item.weight)})` : ""
        } - ${formatMoney(item.price * item.quantity)}${item.cut ? `\n  Corte: ${item.cut}` : ""}${
          item.observation ? `\n  Obs: ${item.observation}` : ""
        }`;
      })
      .join("\n");

    const text = `
*Pedido COMANDIZE*
*Nº Pedido:* ${data.order._id}

*Loja:* ${config?.title || store.storeName}
*Tipo:* ${orderType}
*Nome:* ${checkout.name}
*WhatsApp:* ${checkout.whatsapp}
*Horário:* ${checkout.pickupTime}

*Itens:*
${itemsText}

*Total:* ${formatMoney(cartTotal)}

${
  orderType === "ENTREGA"
    ? `*Endereço:*
Rua: ${checkout.street}
Bairro: ${checkout.neighborhood}
Número: ${checkout.houseNumber}
CEP: ${checkout.cep || "Não informado"}

*Pagamento:* ${checkout.paymentMethod}
${
  checkout.paymentMethod === "Dinheiro"
    ? `*Troco para:* ${checkout.changeFor || "Não informado"}`
    : ""
}`
    : "*Retirada na loja*"
}

*Mensagem para loja:*
${checkout.storeMessage || "Sem observação"}
`;

    localStorage.removeItem("comandize_cart");
    setCart([]);

    const storePhone = store?.phone || "";
    const phone = storePhone.replace(/\D/g, "");

    if (phone) {
      const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    }

    alert("Pedido enviado com sucesso!");
    setShowCart(false);
    setCheckoutStep(false);
    clearCatalogHash();
  };

  useEffect(() => {
    const saved = localStorage.getItem("comandize_last_customer_data");
    const savedCustomer = localStorage.getItem("comandize_customer")
      ? JSON.parse(localStorage.getItem("comandize_customer"))
      : null;

    if (saved) {
      const data = JSON.parse(saved);
      setCheckout((old) => ({
        ...old,
        name: savedCustomer?.name || data.name || "",
        whatsapp: savedCustomer?.whatsapp || data.whatsapp || "",
        street: savedCustomer?.deliveryAddress?.street || data.street || "",
        neighborhood:
          savedCustomer?.deliveryAddress?.neighborhood || data.neighborhood || "",
        houseNumber:
          savedCustomer?.deliveryAddress?.houseNumber || data.houseNumber || "",
        cep: savedCustomer?.deliveryAddress?.cep || data.cep || "",
      }));
    }
  }, []);

  const getCarouselPage = (sectionId) => {
    return Number(carouselPages[sectionId] || 0);
  };

  const getCarouselPageSize = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return 1;
    }

    return 3;
  };

  const moveCarousel = (sectionId, direction, totalProducts) => {
    const pageSize = getCarouselPageSize();
    const maxPage = Math.max(0, Math.ceil(totalProducts / pageSize) - 1);

    setCarouselPages((old) => {
      const currentPage = Number(old[sectionId] || 0);
      const nextPage =
        direction === "next"
          ? Math.min(maxPage, currentPage + 1)
          : Math.max(0, currentPage - 1);

      return {
        ...old,
        [sectionId]: nextPage,
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-[#20242b] flex items-center justify-center font-[Arial]">
        Carregando catálogo...
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-white text-[#20242b] flex items-center justify-center font-[Arial]">
        Catálogo não encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#20242b] pb-28 font-[Arial]">
      <header className="bg-white border-b border-zinc-200 shadow-sm">
        {/* TOPO */}
        <div className="hidden md:flex h-20 items-center justify-between px-10 gap-3 bg-white">
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs text-zinc-500 font-bold">
              {customer ? "Bem-vindo" : "Programa de fidelidade"}
            </span>

            <span className="text-sm md:text-base font-black text-[#20242b] truncate max-w-[190px] md:max-w-none">
              {customer ? customer.name : "Cadastre-se"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!customer && (
              <button
                onClick={handleOpenRegister}
                className="hidden md:block bg-red-600 text-white px-5 py-3 rounded-full font-black shadow-sm hover:bg-red-700 transition"
              >
                Cadastre-se
              </button>
            )}

            {customer && (
              <button
                onClick={handleOpenBenefits}
                className="hidden md:block bg-red-600 text-white px-5 py-3 rounded-full font-black shadow-sm hover:bg-red-700 transition"
              >
                Benefícios
              </button>
            )}

            {customer && (
              <button
                onClick={logoutCustomer}
                className="hidden md:block bg-zinc-100 text-zinc-700 px-5 py-3 rounded-full font-black border border-zinc-200"
              >
                Sair
              </button>
            )}

            {!customer && (
              <button
                onClick={handleOpenRegister}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-red-600 bg-white flex items-center justify-center shadow-sm hover:scale-105 transition"
              >
                <img
                  src="/icons/iconeregistro.png"
                  alt="Registro"
                  className="w-6 h-6 md:w-7 md:h-7 object-contain"
                />
              </button>
            )}

            {/* BOTAO CONTA / LOGIN */}
            <button
              onClick={handleOpenLogin}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-red-600 bg-white flex items-center justify-center shadow-sm hover:scale-105 transition"
            >
              <img
                src="/icons/iconelogado.png"
                alt="Conta"
                className="w-6 h-6 md:w-7 md:h-7 object-contain"
              />
            </button>
          </div>
        </div>

        {/* FAIXA MOBILE */}
        <div className="md:hidden w-full bg-white border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-zinc-500 leading-tight">
                {customer ? "Bem-vindo" : "Programa de fidelidade"}
              </p>
              <p className="text-sm font-black text-[#20242b] truncate">
                {customer ? customer.name : "Cadastre-se e ganhe benefícios"}
              </p>
            </div>

            {customer ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenBenefits}
                  className="bg-red-600 text-white px-3 py-2 rounded-full text-xs font-black shadow-sm"
                >
                  Benefícios
                </button>

                <button
                  type="button"
                  onClick={handleOpenLogin}
                  className="bg-zinc-900 text-white px-3 py-2 rounded-full text-xs font-black shadow-sm"
                >
                  Minha conta
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenRegister}
                  className="bg-red-600 text-white px-3 py-2 rounded-full text-xs font-black shadow-sm"
                >
                  Cadastrar
                </button>

                <button
                  type="button"
                  onClick={handleOpenLogin}
                  className="bg-zinc-900 text-white px-3 py-2 rounded-full text-xs font-black shadow-sm"
                >
                  Entrar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BANNER */}
        <div className="relative h-[220px] md:h-[320px] overflow-hidden">
          {config?.bannerImage ? (
            <img
              src={getAssetUrl(config.bannerImage)}
              alt="Banner"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-red-700 to-red-500" />
          )}

          {/* ESCURECER */}
          <div className="absolute inset-0 bg-black/40" />

          {(config?.title || config?.subtitle) && (
            <div className="absolute left-4 right-4 md:left-10 md:right-10 top-8 md:top-12 text-white drop-shadow-xl">
              {config?.title && (
                <h1 className="text-3xl md:text-5xl font-black leading-tight max-w-4xl">
                  {config.title}
                </h1>
              )}

              {config?.subtitle && (
                <p className="mt-2 text-sm md:text-xl font-bold text-white/90 max-w-3xl">
                  {config.subtitle}
                </p>
              )}
            </div>
          )}

          {/* STATUS */}
          <button
            onClick={() => setShowHours(!showHours)}
            className={`absolute left-4 md:left-10 bottom-5 px-6 py-3 rounded-full font-black shadow-xl text-sm md:text-base ${
              isOpen ? "bg-green-500 text-white" : "bg-red-600 text-white"
            }`}
          >
            ● {isOpen ? "Aberto" : "Fechado"}
          </button>
        </div>

        {config?.address && (
          <div className="bg-white border-b border-zinc-200">
            <div className="max-w-7xl mx-auto px-5 md:px-8 py-4">
              <p className="text-sm md:text-base font-bold text-[#20242b]">
                📍 {config.address}
              </p>
            </div>
          </div>
        )}

      </header>

      {customerMessage && !showRegisterModal && !showLoginModal && (
        <div className="max-w-6xl mx-auto mt-4 px-5">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm font-bold">
            {customerMessage}
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-red-600 mb-2">
              Cadastro de cliente
            </h2>

            <p className="text-sm text-zinc-500 mb-4">
              Cadastre-se para participar do programa de fidelidade.
            </p>

            <div className="space-y-3">
              <input
                maxLength={200}
                placeholder="Nome completo"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, name: e.target.value })
                }
                className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
              />

              <input
                maxLength={13}
                placeholder="WhatsApp"
                value={registerForm.whatsapp}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    whatsapp: onlyNumbers(e.target.value),
                  })
                }
                className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
              />

              <input
                type="password"
                minLength={4}
                maxLength={15}
                placeholder="Senha de 4 a 15 caracteres"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    password: e.target.value,
                  })
                }
                className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
              />

              <input
                maxLength={11}
                placeholder="CPF opcional"
                value={registerForm.cpf}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    cpf: onlyNumbers(e.target.value),
                  })
                }
                className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
              />

              <div className="pt-2">
                <p className="text-sm font-black text-[#20242b] mb-2">
                  Endereço para entrega
                </p>

                <div className="space-y-3">
                  <input
                    maxLength={120}
                    placeholder="Nome da rua"
                    value={registerForm.street}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, street: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
                  />

                  <input
                    maxLength={80}
                    placeholder="Bairro"
                    value={registerForm.neighborhood}
                    onChange={(e) =>
                      setRegisterForm({
                        ...registerForm,
                        neighborhood: e.target.value,
                      })
                    }
                    className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      maxLength={20}
                      placeholder="Número"
                      value={registerForm.houseNumber}
                      onChange={(e) =>
                        setRegisterForm({
                          ...registerForm,
                          houseNumber: e.target.value,
                        })
                      }
                      className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
                    />

                    <input
                      maxLength={8}
                      placeholder="CEP"
                      value={registerForm.cep}
                      onChange={(e) =>
                        setRegisterForm({
                          ...registerForm,
                          cep: onlyNumbers(e.target.value),
                        })
                      }
                      className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
                    />
                  </div>
                </div>
              </div>

              {customerMessage && (
                <p className="text-sm text-red-600 font-bold">
                  {customerMessage}
                </p>
              )}

              <button
                onClick={registerCustomer}
                disabled={customerLoading}
                className="w-full bg-red-600 text-white font-black p-4 rounded-xl disabled:opacity-60"
              >
                {customerLoading ? "Cadastrando..." : "Cadastrar"}
              </button>

              <button
                onClick={handleOpenLogin}
                className="w-full bg-zinc-100 text-zinc-700 font-black p-3 rounded-xl"
              >
                Já tenho cadastro
              </button>

              <button
                onClick={clearCatalogHash}
                className="w-full bg-zinc-800 text-white font-black p-3 rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <h2 className="text-2xl font-black text-red-600 mb-2">
              Entrar na conta
            </h2>

            {customer ? (
              <div className="space-y-3">
                <p className="text-zinc-600">
                  Você está logado como <strong>{customer.name}</strong>.
                </p>

                <p className="text-sm text-zinc-500">
                  Pontos: <strong>{customer.points || 0}</strong>
                </p>

                <p className="text-sm text-zinc-500">
                  Cashback: <strong>{formatMoney(customer.cashbackBalance || 0)}</strong>
                </p>

                <button
                  onClick={handleOpenBenefits}
                  className="w-full bg-red-600 text-white font-black p-4 rounded-xl"
                >
                  Ver benefícios do cadastro
                </button>

                <button
                  onClick={shareReferralLink}
                  className="w-full bg-green-500 text-white font-black p-4 rounded-xl"
                >
                  Enviar link de indicação
                </button>

                <button
                  onClick={clearCatalogHash}
                  className="w-full bg-red-600 text-white font-black p-4 rounded-xl"
                >
                  Continuar comprando
                </button>

                <button
                  onClick={() => {
                    logoutCustomer();
                    setShowLoginModal(false);
                  }}
                  className="w-full bg-zinc-800 text-white font-black p-3 rounded-xl"
                >
                  Sair da conta
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500 mb-4">
                  Informe seu WhatsApp e senha para acessar sua conta.
                </p>

                <input
                  maxLength={13}
                  placeholder="WhatsApp cadastrado"
                  value={loginForm.whatsapp}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      whatsapp: onlyNumbers(e.target.value),
                    })
                  }
                  className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
                />

                <input
                  type="password"
                  maxLength={15}
                  placeholder="Senha"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      password: e.target.value,
                    })
                  }
                  className="w-full border border-zinc-300 rounded-xl p-3 outline-none"
                />

                {customerMessage && (
                  <p className="text-sm text-red-600 font-bold">
                    {customerMessage}
                  </p>
                )}

                <button
                  onClick={loginCustomer}
                  disabled={customerLoading}
                  className="w-full bg-red-600 text-white font-black p-4 rounded-xl disabled:opacity-60"
                >
                  {customerLoading ? "Entrando..." : "Entrar"}
                </button>

                <button
                  onClick={handleOpenRegister}
                  className="w-full bg-zinc-100 text-zinc-700 font-black p-3 rounded-xl"
                >
                  Criar cadastro
                </button>

                <button
                  onClick={clearCatalogHash}
                  className="w-full bg-zinc-800 text-white font-black p-3 rounded-xl"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showHours && (
        <div className="max-w-6xl mx-auto mt-5 px-5">
          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-5">
            <h3 className="text-xl font-black text-red-600 mb-4">
              Horários de Funcionamento
            </h3>

            <div className="space-y-2">
              {config?.schedules &&
                Object.entries(config.schedules).map(([day, schedule]) => (
                  <div
                    key={day}
                    className="flex justify-between border-b border-zinc-200 pb-2 text-sm"
                  >
                    <strong>{daysLabels[day]}</strong>

                    {!schedule.active ? (
                      <span className="text-red-500">Fechado</span>
                    ) : schedule.hasLunchBreak ? (
                      <span>
                        {schedule.open} às {schedule.lunchStart} /{" "}
                        {schedule.lunchEnd} às {schedule.close}
                      </span>
                    ) : (
                      <span>
                        {schedule.open} às {schedule.close}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <main className="p-5 md:p-8 max-w-7xl mx-auto">
        <div className="space-y-8">
          <div className="space-y-12">
            {sections.map((section) => {
              const isCarousel = section.displayMode === "CAROUSEL";

              const renderProductCard = (item, carousel = false) => {
                const product = item.product;

                if (!product) return null;

                if (carousel) {
                  return (
                    <div
                      key={item._id}
                      className="w-full bg-white border border-zinc-200 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-3xl overflow-hidden relative flex flex-col min-h-[430px]"
                    >
                      <div className="w-full h-52 sm:h-56 md:h-60 bg-zinc-100 overflow-hidden">
                        {product.image ? (
                          <img
                            src={getAssetUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 font-black">
                            Sem imagem
                          </div>
                        )}
                      </div>

                      <div className="p-4 md:p-5 flex flex-col flex-1">
                        <h3 className="text-lg md:text-xl font-black text-[#20242b] line-clamp-2 pr-1">
                          {product.name}
                        </h3>

                        {item.description && (
                          <p className="text-zinc-500 text-sm mt-2 line-clamp-3">
                            {item.description}
                          </p>
                        )}

                        {customer && Number(product.clientPrice || 0) > 0 && (
                          <p className="text-xs font-bold text-green-600 mt-2">
                            Preço especial para cliente
                          </p>
                        )}

                        <div className="mt-auto pt-5 pr-14">
                          <p className="text-red-600 text-2xl md:text-3xl font-black leading-tight">
                            {formatMoney(getProductPrice(product, customer))}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => openItemModal(item)}
                        className="absolute right-4 bottom-4 bg-red-600 hover:bg-red-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-full font-black text-3xl shadow-xl flex items-center justify-center hover:scale-110 transition"
                      >
                        +
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={item._id}
                    className="bg-white border border-zinc-200 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-3xl overflow-hidden flex relative min-h-[160px]"
                  >
                    {product.image && (
                      <img
                        src={getAssetUrl(product.image)}
                        alt={product.name}
                        className="w-32 md:w-44 h-auto object-cover object-center shrink-0"
                      />
                    )}

                    <div className="p-4 md:p-5 flex-1 pr-16 md:pr-20 min-w-0">
                      <h3 className="text-base md:text-xl font-black text-[#20242b] line-clamp-2">
                        {product.name}
                      </h3>

                      {item.description && (
                        <p className="text-zinc-500 text-sm mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <p className="text-red-600 text-xl md:text-2xl font-black mt-3">
                        {formatMoney(getProductPrice(product, customer))}
                      </p>

                      {customer && Number(product.clientPrice || 0) > 0 && (
                        <p className="text-xs font-bold text-green-600 mt-1">
                          Preço especial para cliente
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => openItemModal(item)}
                      className="absolute right-4 bottom-4 bg-red-600 hover:bg-red-700 text-white w-12 h-12 md:w-16 md:h-16 rounded-full font-black text-3xl md:text-4xl shadow-xl flex items-center justify-center hover:scale-110 transition"
                    >
                      +
                    </button>
                  </div>
                );
              };

              return (
                <section key={section._id}>
                  <div className="flex items-end justify-between gap-3 mb-2">
                    <h2 className="text-3xl md:text-4xl font-black text-red-600">
                      {section.name}
                    </h2>

                    {isCarousel && section.products.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveCarousel(section._id, "prev", section.products.length)}
                          disabled={getCarouselPage(section._id) === 0}
                          className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border border-zinc-200 text-red-600 shadow-sm font-black disabled:opacity-35 disabled:cursor-not-allowed hover:bg-red-50 transition"
                          aria-label="Produtos anteriores"
                        >
                          ‹
                        </button>

                        <span className="hidden sm:inline-flex text-xs font-black text-zinc-500 bg-zinc-100 px-3 py-2 rounded-full">
                          {Math.min(
                            getCarouselPage(section._id) * getCarouselPageSize() + 1,
                            section.products.length
                          )}
                          -
                          {Math.min(
                            (getCarouselPage(section._id) + 1) * getCarouselPageSize(),
                            section.products.length
                          )}
                          {" "}de {section.products.length}
                        </span>

                        <button
                          type="button"
                          onClick={() => moveCarousel(section._id, "next", section.products.length)}
                          disabled={
                            getCarouselPage(section._id) >=
                            Math.max(0, Math.ceil(section.products.length / getCarouselPageSize()) - 1)
                          }
                          className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-red-600 text-white shadow-sm font-black disabled:opacity-35 disabled:cursor-not-allowed hover:bg-red-700 transition"
                          aria-label="Próximos produtos"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="h-1 bg-red-600 w-24 mb-6 rounded-full" />

                  {section.sectionBannerImage && (
                    <div className="mb-6 rounded-3xl overflow-hidden border border-red-100 bg-white shadow-sm">
                      <img
                        src={getAssetUrl(section.sectionBannerImage)}
                        alt={`Banner promocional ${section.name}`}
                        className="w-full h-28 sm:h-36 md:h-44 object-cover object-center"
                      />
                    </div>
                  )}

                  {isCarousel ? (
  <>
    {/* MOBILE */}
    <div className="md:hidden">
      <div
        className="
          flex
          gap-4
          overflow-x-auto
          snap-x
          snap-mandatory
          pb-2
          scrollbar-hide
        "
      >
        {section.products.map((item) => (
          <div
            key={item._id}
            className="
              min-w-[85%]
              snap-center
              flex-shrink-0
            "
          >
            {renderProductCard(item, true)}
          </div>
        ))}
      </div>
    </div>

    {/* DESKTOP */}
    <div className="hidden md:block relative">
      <button
        type="button"
        onClick={() =>
          moveCarousel(
            section._id,
            "prev",
            section.products.length
          )
        }
        disabled={getCarouselPage(section._id) === 0}
        className="
          absolute
          left-0
          top-1/2
          -translate-y-1/2
          -translate-x-6
          z-20
          w-12
          h-12
          rounded-full
          bg-white
          border
          border-zinc-200
          text-red-600
          shadow-xl
          font-black
          text-3xl
          flex
          items-center
          justify-center
          disabled:opacity-0
        "
      >
        ‹
      </button>

      <div className="grid grid-cols-3 gap-5 overflow-hidden">
        {section.products
          .slice(
            getCarouselPage(section._id) * 3,
            getCarouselPage(section._id) * 3 + 3
          )
          .map((item) =>
            renderProductCard(item, true)
          )}
      </div>

      <button
        type="button"
        onClick={() =>
          moveCarousel(
            section._id,
            "next",
            section.products.length
          )
        }
        disabled={
          getCarouselPage(section._id) >=
          Math.max(
            0,
            Math.ceil(section.products.length / 3) - 1
          )
        }
        className="
          absolute
          right-0
          top-1/2
          -translate-y-1/2
          translate-x-6
          z-20
          w-12
          h-12
          rounded-full
          bg-red-600
          text-white
          shadow-xl
          font-black
          text-3xl
          flex
          items-center
          justify-center
          disabled:opacity-0
        "
      >
        ›
      </button>
    </div>
  </>
) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {section.products.map((item) => renderProductCard(item))}
                    </div>
                  )}
                </section>
              );
            })}

            {sections.length === 0 && (
              <p className="text-zinc-500">Nenhum produto disponível no catálogo.</p>
            )}
          </div>

          {!customer && (
            <aside className="max-w-md mx-auto">
              <LoyaltyPreview onClick={handleOpenRegister} />
            </aside>
          )}
        </div>
      </main>

      {cartQuantity > 0 && (
        <button
          onClick={() => pushCatalogHash("cart")}
          className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-red-600 hover:bg-red-700 text-white px-5 py-4 rounded-2xl font-black shadow-xl z-40 text-sm md:text-base"
        >
          Ver carrinho • {cartQuantity} item(ns) • {formatMoney(finalCartTotal)}
        </button>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-[#20242b] rounded-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
            {selectedItem.product.image && (
              <img
                src={getAssetUrl(selectedItem.product.image)}
                alt={selectedItem.product.name}
                className="w-full h-64 object-cover object-center"
              />
            )}

            <div className="p-5">
              <h2 className="text-3xl font-black text-red-600">
                {selectedItem.product.name}
              </h2>

              {selectedItem.description && (
                <p className="text-zinc-600 mt-2">{selectedItem.description}</p>
              )}

              {hasWeightVariationAlert(selectedItem) && (
                <div className="mt-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
                  <div className="flex gap-3">
                    <span className="text-xl shrink-0">⚠️</span>
                    <p className="text-sm font-bold leading-relaxed">
                      {weightVariationAlertText}
                    </p>
                  </div>
                </div>
              )}

              {selectedItem.weightOptions?.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-black mb-2">Escolha o peso</h3>

                  {message && (
                    <p className="text-red-500 text-sm mb-2">{message}</p>
                  )}

                  <div className="space-y-2">
                    {selectedItem.weightOptions.map((weight) => {
                      const basePrice = getProductPrice(selectedItem.product, customer);
                      const price = basePrice * (Number(weight) / 1000);

                      return (
                        <button
                          key={weight}
                          onClick={() => setSelectedWeight(weight)}
                          className={`w-full flex justify-between items-center border rounded-xl p-4 ${
                            Number(selectedWeight) === Number(weight)
                              ? "border-red-600 bg-red-50"
                              : "border-zinc-200"
                          }`}
                        >
                          <span className="font-bold">{formatWeight(weight)}</span>
                          <span className="font-black">{formatMoney(price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {getAvailableCuts(selectedItem).length > 0 && (
                <div className="mt-5">
                  <h3 className="font-black mb-2">Escolha o Preparo</h3>

                  {message && (
                    <p className="text-red-500 text-sm mb-2">{message}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {getAvailableCuts(selectedItem).map((cut) => (
                      <button
                        key={cut}
                        type="button"
                        onClick={() => setSelectedCut(cut)}
                        className={`border rounded-xl p-3 text-sm font-black ${
                          selectedCut === cut || (getAvailableCuts(selectedItem).length === 1 && !selectedCut)
                            ? "border-red-600 bg-red-50 text-red-600"
                            : "border-zinc-200 text-zinc-700"
                        }`}
                      >
                        {cut}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-500 mt-2">
                    Escolha opição, antes de adicionar ao carrinho.
                  </p>
                </div>
              )}

              {!selectedItem.weightOptions?.length && (
                <p className="text-2xl font-black text-red-600 mt-4">
                  {formatMoney(getProductPrice(selectedItem.product, customer))}
                </p>
              )}

              <div className="mt-5">
                <label className="text-sm font-bold text-zinc-500">
                  Observações do item
                </label>

                <textarea
                  maxLength={250}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ex: sem cebola, ponto da carne..."
                  className="w-full border border-zinc-300 rounded-xl p-3 mt-2 outline-none"
                />

                <p className="text-xs text-zinc-400 text-right">
                  {observation.length}/250
                </p>
              </div>

              <div className="flex items-center gap-4 mt-5">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 rounded-full bg-zinc-200 font-black text-xl"
                >
                  -
                </button>

                <span className="text-xl font-black">{quantity}</span>

                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-11 h-11 rounded-full bg-red-600 text-white font-black text-xl"
                >
                  +
                </button>

                <button
                  onClick={addToCart}
                  className="flex-1 bg-red-600 text-white p-4 rounded-xl font-black"
                >
                  Adicionar • {formatMoney(getItemTotal())}
                </button>
              </div>

              <button
                onClick={closeItemModal}
                className="w-full mt-3 bg-zinc-800 text-white font-black p-3 rounded-xl"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-end">
          <div className="bg-white text-[#20242b] w-full max-w-md h-full p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-2xl font-black text-red-600">
                {checkoutStep ? "Finalizar Pedido" : "Carrinho"}
              </h2>

              <button
                onClick={() => {
                  if (checkoutStep) {
                    pushCatalogHash("cart");
                  } else {
                    clearCatalogHash();
                  }
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold"
              >
                Voltar
              </button>
            </div>

            {checkoutStep ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOrderType("ENTREGA")}
                    className={`p-4 rounded-xl font-black ${
                      orderType === "ENTREGA"
                        ? "bg-red-600 text-white"
                        : "bg-zinc-200"
                    }`}
                  >
                    🛵 Entrega
                  </button>

                  <button
                    onClick={() => setOrderType("RETIRADA")}
                    className={`p-4 rounded-xl font-black ${
                      orderType === "RETIRADA"
                        ? "bg-red-600 text-white"
                        : "bg-zinc-200"
                    }`}
                  >
                    🏪 Retirada
                  </button>
                </div>

                <input
                  maxLength={200}
                  placeholder="Nome"
                  value={checkout.name}
                  onChange={(e) =>
                    setCheckout({ ...checkout, name: e.target.value })
                  }
                  className="w-full border rounded-xl p-3"
                />

                <input
                  maxLength={13}
                  placeholder="WhatsApp. Ex: 43 99999-9999"
                  value={checkout.whatsapp}
                  onChange={(e) =>
                    setCheckout({
                      ...checkout,
                      whatsapp: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="w-full border rounded-xl p-3"
                />

                <select
                  value={checkout.pickupTime}
                  onChange={(e) =>
                    setCheckout({ ...checkout, pickupTime: e.target.value })
                  }
                  className="w-full border rounded-xl p-3"
                >
                  <option value="">Escolha o horário</option>

                  {generateAvailableTimes().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>

                {orderType === "ENTREGA" && (
                  <>
                    {customer?.deliveryAddress && (
                      <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm font-bold">
                        Endereço preenchido automaticamente pelo seu cadastro.
                      </div>
                    )}

                    <input
                      maxLength={120}
                      placeholder="Nome da rua"
                      value={checkout.street}
                      onChange={(e) =>
                        setCheckout({ ...checkout, street: e.target.value })
                      }
                      className="w-full border rounded-xl p-3"
                    />

                    <input
                      maxLength={80}
                      placeholder="Bairro"
                      value={checkout.neighborhood}
                      onChange={(e) =>
                        setCheckout({ ...checkout, neighborhood: e.target.value })
                      }
                      className="w-full border rounded-xl p-3"
                    />

                    <input
                      maxLength={20}
                      placeholder="Número da casa"
                      value={checkout.houseNumber}
                      onChange={(e) =>
                        setCheckout({ ...checkout, houseNumber: e.target.value })
                      }
                      className="w-full border rounded-xl p-3"
                    />

                    <input
                      maxLength={8}
                      placeholder="CEP opcional"
                      value={checkout.cep}
                      onChange={(e) =>
                        setCheckout({
                          ...checkout,
                          cep: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className="w-full border rounded-xl p-3"
                    />

                    <select
                      value={checkout.paymentMethod}
                      onChange={(e) =>
                        setCheckout({
                          ...checkout,
                          paymentMethod: e.target.value,
                        })
                      }
                      className="w-full border rounded-xl p-3"
                    >
                      <option value="">Forma de pagamento</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Pix">Pix</option>
                    </select>

                    {checkout.paymentMethod === "Dinheiro" && (
                      <input
                        maxLength={20}
                        placeholder="Troco para quanto? Opcional"
                        value={checkout.changeFor}
                        onChange={(e) =>
                          setCheckout({ ...checkout, changeFor: e.target.value })
                        }
                        className="w-full border rounded-xl p-3"
                      />
                    )}
                  </>
                )}

                <textarea
                  maxLength={300}
                  placeholder="Mensagem para a loja"
                  value={checkout.storeMessage}
                  onChange={(e) =>
                    setCheckout({ ...checkout, storeMessage: e.target.value })
                  }
                  className="w-full border rounded-xl p-3"
                />

                <button
                  onClick={finishOrder}
                  className="w-full bg-green-500 text-white font-black p-4 rounded-xl"
                >
                  Finalizar e acompanhar pelo WhatsApp
                </button>

                <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 shadow-sm">
                  <img
                    src="/icons/whatsaploja.jpeg"
                    alt="Mini tutorial para finalizar o pedido pelo WhatsApp"
                    className="w-full h-auto object-cover block"
                  />
                </div>
              </div>
            ) : (
              <>
                {cart.length === 0 && (
                  <p className="text-zinc-500">Seu carrinho está vazio.</p>
                )}

                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.cartId}
                      className="border border-zinc-200 rounded-2xl p-4"
                    >
                      <div className="flex gap-3">
                        {item.image && (
                          <img
                            src={getAssetUrl(item.image)}
                            alt={item.name}
                            className="w-16 h-16 object-cover object-center rounded-xl"
                          />
                        )}

                        <div className="flex-1">
                          <h3 className="font-black">{item.name}</h3>

                          {item.weight && (
                            <p className="text-sm text-zinc-500">
                              Peso: {formatWeight(item.weight)}
                            </p>
                          )}

                          {item.cut && (
                            <p className="text-sm text-zinc-500">
                              Corte: {item.cut}
                            </p>
                          )}

                          {item.observation && (
                            <p className="text-sm text-zinc-500">
                              Obs: {item.observation}
                            </p>
                          )}

                          <p className="font-black text-red-600 mt-1">
                            {formatMoney(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 mt-3">
                        <button
                          onClick={() => decreaseCartItem(item.cartId)}
                          className="w-8 h-8 rounded-full bg-zinc-200 font-black"
                        >
                          -
                        </button>

                        <span className="font-black">{item.quantity}</span>

                        <button
                          onClick={() => increaseCartItem(item.cartId)}
                          className="w-8 h-8 rounded-full bg-red-600 text-white font-black"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {!customer && (
                  <LoyaltyPreview compact disabled />
                )}

                {cart.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                    {cashbackDiscount > 0 && (
                      <div className="flex justify-between text-sm font-bold text-green-600 mb-2">
                        <span>Cashback aplicado</span>
                        <span>- {formatMoney(cashbackDiscount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xl font-black">
                      <span>Total</span>
                      <span>{formatMoney(finalCartTotal)}</span>
                    </div>

                    <button
                      onClick={() => pushCatalogHash("checkout")}
                      className="w-full bg-red-600 text-white font-black p-4 rounded-xl mt-4"
                    >
                      Finalizar pedido
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showBenefitsPage && (
        <BenefitsPage
          customer={customer}
          onClose={clearCatalogHash}
          onRegister={() => {
            handleOpenRegister();
          }}
        />
      )}

    </div>
  );
}

export default PublicCatalog;