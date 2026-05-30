import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:3000/api/customers/admin";
const PAGE_SIZE = 20;

function onlyNumbers(value = "") {
  return String(value).replace(/\D/g, "");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function daysSince(value) {
  if (!value) return null;

  const diff = Date.now() - new Date(value).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getHeatStatus(lastOrderDate) {
  const days = daysSince(lastOrderDate);

  if (days === null) {
    return {
      label: "Sem compra",
      badge: "bg-[#6b7280] text-[#374151]",
      dot: "bg-[#9ca3af]",
      text: "text-[#6b7280]",
    };
  }

  if (days <= 7) {
    return {
      label: "Ativo",
      badge: "bg-green-500 text-white",
      dot: "bg-green-500",
      text: "text-green-400",
    };
  }

  if (days <= 20) {
    return {
      label: "Esfriando",
      badge: "bg-orange-500 text-white",
      dot: "bg-orange-500",
      text: "text-orange-400",
    };
  }

  return {
    label: "Parado",
    badge: "bg-red-500 text-white",
    dot: "bg-red-500",
    text: "text-red-400",
  };
}

function emptyForm() {
  return {
    name: "",
    whatsapp: "",
    password: "",
    cpf: "",
    points: "",
    cashbackBalance: "",
    active: true,
    address: {
      street: "",
      neighborhood: "",
      houseNumber: "",
      cep: "",
    },
  };
}

function Customers() {
  const [activeTab, setActiveTab] = useState("create");
  const [form, setForm] = useState(emptyForm());

  const [customers, setCustomers] = useState([]);
  const [anonymousCustomers, setAnonymousCustomers] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [details, setDetails] = useState(null);

  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [anonymousSearch, setAnonymousSearch] = useState("");

  const [page, setPage] = useState(1);
  const [anonymousPage, setAnonymousPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: PAGE_SIZE,
  });

  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const loadCustomers = async (pageToLoad = page, searchTerm = search) => {
    try {
      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: String(PAGE_SIZE),
        search: searchTerm,
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Erro ao carregar clientes.");
        setCustomers([]);
        return;
      }

      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      setPagination({
        total: data.total || 0,
        totalPages: data.totalPages || 1,
        limit: data.limit || PAGE_SIZE,
      });
      setPage(data.page || pageToLoad);
    } catch {
      setMessage("Erro de conexão ao carregar clientes.");
    }
  };

  const loadAnonymousCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/anonymous`, {
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Erro ao carregar clientes não cadastrados.");
        setAnonymousCustomers([]);
        return;
      }

      setAnonymousCustomers(Array.isArray(data) ? data : []);
      setAnonymousPage(1);
    } catch {
      setMessage("Erro de conexão ao carregar clientes não cadastrados.");
    }
  };

  useEffect(() => {
    if (activeTab === "list") {
      loadCustomers(1, "");
    }

    if (activeTab === "anonymous") {
      loadAnonymousCustomers();
    }
  }, [activeTab]);

  const filteredAnonymousCustomers = useMemo(() => {
    const term = anonymousSearch.toLowerCase();
    const phone = onlyNumbers(anonymousSearch);

    return anonymousCustomers.filter((customer) => {
      return (
        String(customer.name || "").toLowerCase().includes(term) ||
        String(customer.whatsapp || "").includes(phone || anonymousSearch)
      );
    });
  }, [anonymousCustomers, anonymousSearch]);

  const anonymousTotalPages =
    Math.ceil(filteredAnonymousCustomers.length / PAGE_SIZE) || 1;

  const paginatedAnonymousCustomers = filteredAnonymousCustomers.slice(
    (anonymousPage - 1) * PAGE_SIZE,
    anonymousPage * PAGE_SIZE
  );

  const updateForm = (field, value) => {
    setForm((old) => ({ ...old, [field]: value }));
  };

  const updateAddress = (field, value) => {
    setForm((old) => ({
      ...old,
      address: { ...old.address, [field]: value },
    }));
  };

  const fillFormFromCustomer = (customer) => {
    setForm({
      name: customer.name || "",
      whatsapp: customer.whatsapp || "",
      password: "",
      cpf: customer.cpf || "",
      points: customer.points || "",
      cashbackBalance: customer.cashbackBalance || "",
      active: customer.active,
      address: {
        street: customer.deliveryAddress?.street || "",
        neighborhood: customer.deliveryAddress?.neighborhood || "",
        houseNumber: customer.deliveryAddress?.houseNumber || "",
        cep: customer.deliveryAddress?.cep || "",
      },
    });
  };

  const fillFormFromAnonymous = (customer) => {
    setForm({
      ...emptyForm(),
      name: customer.name || "",
      whatsapp: customer.whatsapp || "",
    });

    setSelectedCustomer(null);
    setActiveTab("create");
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const editing = Boolean(selectedCustomer);
      const url = editing ? `${API_URL}/${selectedCustomer._id}` : API_URL;
      const method = editing ? "PUT" : "POST";

      const body = {
        ...form,
        whatsapp: onlyNumbers(form.whatsapp),
        cpf: onlyNumbers(form.cpf),
        points: Number(form.points || 0),
        cashbackBalance: Number(form.cashbackBalance || 0),
        address: {
          ...form.address,
          cep: onlyNumbers(form.address.cep),
        },
      };

      if (editing && !body.password) delete body.password;

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setMessage(data.message || "Operação concluída.");

      if (response.ok) {
        setForm(emptyForm());
        setSelectedCustomer(null);
        setActiveTab("list");
        loadCustomers(1, "");
      }
    } catch {
      setMessage("Erro de conexão ao salvar cliente.");
    }
  };

  const openDetails = async (customer) => {
    try {
      setSelectedCustomer(customer);

      const response = await fetch(`${API_URL}/${customer._id}`, {
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Erro ao buscar detalhes.");
        return;
      }

      setDetails(data);
    } catch {
      setMessage("Erro de conexão ao buscar detalhes.");
    }
  };

  const closeDetails = () => {
    setSelectedCustomer(null);
    setDetails(null);
  };

  const editSelected = () => {
    if (!details?.customer) return;

    fillFormFromCustomer(details.customer);
    setActiveTab("create");
    setDetails(null);
  };

  const copyReferralLink = async () => {
    if (!details?.customer) return;

    const link = `${window.location.origin}/catalogo/${details.customer.catalogUrl}?ref=${details.customer.referralCode}`;

    await navigator.clipboard.writeText(link);
    setMessage("Link de indicação copiado.");
  };

  const searchCustomers = (e) => {
    e.preventDefault();
    loadCustomers(1, search);
  };

  const searchAnonymous = (e) => {
    e.preventDefault();
    setAnonymousPage(1);
  };

  const openWhatsApp = (phone) => {
    const cleanPhone = onlyNumbers(phone);

    if (!cleanPhone) {
      alert("Cliente sem WhatsApp.");
      return;
    }

    const text = "Olá! Sentimos sua falta. Temos novidades esperando por você 😄";
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 text-[#374151]">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#ff9811]">👥 Clientes</h2>
          <p className="text-[#6b7280] text-sm">
            Cadastre clientes, acompanhe compras e identifique clientes parados.
          </p>
        </div>

        <div className="bg-[#f9fafb] rounded-xl p-1 grid grid-cols-1 md:grid-cols-3 gap-1">
          <button
            onClick={() => {
              setActiveTab("create");
              setSelectedCustomer(null);
              setForm(emptyForm());
            }}
            className={`px-5 py-3 rounded-lg font-black text-sm ${
              activeTab === "create"
                ? "bg-[#ff9811] text-white"
                : "text-[#374151]"
            }`}
          >
            Cadastrar
          </button>

          <button
            onClick={() => setActiveTab("list")}
            className={`px-5 py-3 rounded-lg font-black text-sm ${
              activeTab === "list"
                ? "bg-[#ff9811] text-white"
                : "text-[#374151]"
            }`}
          >
            Clientes
          </button>

          <button
            onClick={() => setActiveTab("anonymous")}
            className={`px-5 py-3 rounded-lg font-black text-sm ${
              activeTab === "anonymous"
                ? "bg-[#ff9811] text-white"
                : "text-[#374151]"
            }`}
          >
            Não cadastrados
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 text-sm">
          {message}
        </div>
      )}

      {activeTab === "create" && (
        <form
          onSubmit={saveCustomer}
          className="bg-white border border-[#e5e7eb] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-[#ff9811]">
              {selectedCustomer ? "Editar cliente" : "Cadastrar cliente"}
            </h3>

            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setForm(emptyForm());
                }}
                className="bg-[#f3f4f6] px-4 py-2 rounded-xl text-sm font-bold"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <input placeholder="Nome completo" value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" required />
          <input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => updateForm("whatsapp", onlyNumbers(e.target.value))} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" required />
          <input placeholder={selectedCustomer ? "Nova senha opcional (4 a 15 caracteres)" : "Senha (4 a 15 caracteres)"} value={form.password} onChange={(e) => updateForm("password", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" minLength={4} maxLength={15} required={!selectedCustomer} />
          <input placeholder="CPF opcional" value={form.cpf} onChange={(e) => updateForm("cpf", onlyNumbers(e.target.value))} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" />
          <input type="number" placeholder="Pontos" value={form.points} onChange={(e) => updateForm("points", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" />
          <input type="number" step="0.01" placeholder="Saldo cashback" value={form.cashbackBalance} onChange={(e) => updateForm("cashbackBalance", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" />

          <div className="md:col-span-2">
            <h4 className="text-[#ff9811] font-black mb-2">
              📍 Endereço de entrega
            </h4>
          </div>

          <input placeholder="Rua" value={form.address.street} onChange={(e) => updateAddress("street", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" />
          <input placeholder="Bairro" value={form.address.neighborhood} onChange={(e) => updateAddress("neighborhood", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" />
          <input placeholder="Número" value={form.address.houseNumber} onChange={(e) => updateAddress("houseNumber", e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" />
          <input placeholder="CEP" value={form.address.cep} onChange={(e) => updateAddress("cep", onlyNumbers(e.target.value))} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none" />

          <label className="md:col-span-2 flex items-center gap-3 bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3">
            <input type="checkbox" checked={form.active} onChange={(e) => updateForm("active", e.target.checked)} />
            <span className="font-bold">Cliente ativo</span>
          </label>

          <button className="md:col-span-2 bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-black">
            {selectedCustomer ? "Atualizar cliente" : "Cadastrar cliente"}
          </button>
        </form>
      )}

      {activeTab === "list" && (
        <div className="space-y-4">
          <form onSubmit={searchCustomers} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-3">
            <input placeholder="Buscar por nome, WhatsApp, CPF ou código de indicação" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 flex-1 outline-none text-[#374151] placeholder:text-[#9ca3af]" />
            <button className="bg-[#ff9811] text-white px-6 py-3 rounded-xl font-black">Buscar</button>
          </form>

          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[1100px]">
                <thead className="text-[#6b7280] border-b border-[#e5e7eb]">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">WhatsApp</th>
                    <th className="p-3">Pontos</th>
                    <th className="p-3">Cashback</th>
                    <th className="p-3">Pedidos</th>
                    <th className="p-3">Gasto</th>
                    <th className="p-3">Última compra</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => {
                    const lastOrderDate =
                      customer.stats?.lastOrderDate ||
                      customer.lastOrderDate ||
                      customer.stats?.lastPurchaseDate ||
                      null;

                    const heat = getHeatStatus(lastOrderDate);
                    const days = daysSince(lastOrderDate);

                    return (
                      <tr key={customer._id} className="border-b border-[#e5e7eb]">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${heat.dot}`} />
                            <div>
                              <strong>{customer.name}</strong>
                              <small className="block text-[#6b7280]">
                                Ref: {customer.referralCode}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">{customer.whatsapp}</td>
                        <td className="p-3">{customer.points || 0}</td>
                        <td className="p-3">{formatMoney(customer.cashbackBalance || 0)}</td>
                        <td className="p-3">{customer.stats?.totalOrders || 0}</td>
                        <td className="p-3">{formatMoney(customer.stats?.totalSpent || 0)}</td>

                        <td className="p-3">
                          <span className={`font-bold ${heat.text}`}>
                            {formatDate(lastOrderDate)}
                            {days !== null ? ` • ${days} dia(s)` : ""}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-black ${heat.badge}`}>
                            {heat.label}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => openDetails(customer)} className="bg-[#ff9811] text-white px-3 py-2 rounded-lg font-black text-sm">Ver</button>
                            <button onClick={() => { setSelectedCustomer(customer); fillFormFromCustomer(customer); setActiveTab("create"); }} className="bg-blue-500 text-white px-3 py-2 rounded-lg font-black text-sm">Editar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {customers.map((customer) => {
                const lastOrderDate =
                  customer.stats?.lastOrderDate ||
                  customer.lastOrderDate ||
                  customer.stats?.lastPurchaseDate ||
                  null;

                const heat = getHeatStatus(lastOrderDate);
                const days = daysSince(lastOrderDate);

                return (
                  <CustomerMobileCard
                    key={customer._id}
                    customer={customer}
                    heat={heat}
                    days={days}
                    lastOrderDate={lastOrderDate}
                    onDetails={() => openDetails(customer)}
                    onEdit={() => {
                      setSelectedCustomer(customer);
                      fillFormFromCustomer(customer);
                      setActiveTab("create");
                    }}
                  />
                );
              })}
            </div>

            {customers.length === 0 && (
              <p className="text-[#6b7280] mt-4">Nenhum cliente encontrado.</p>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <button disabled={page <= 1} onClick={() => loadCustomers(page - 1, search)} className="bg-white border border-[#e5e7eb] disabled:opacity-50 px-5 py-3 rounded-xl font-bold shadow-sm">
              Página anterior
            </button>

            <span className="text-sm text-[#6b7280] text-center">
              Página {page} de {pagination.totalPages} • {pagination.total} cliente(s)
            </span>

            <button disabled={page >= pagination.totalPages} onClick={() => loadCustomers(page + 1, search)} className="bg-white border border-[#e5e7eb] disabled:opacity-50 px-5 py-3 rounded-xl font-bold shadow-sm">
              Próxima página
            </button>
          </div>
        </div>
      )}

      {activeTab === "anonymous" && (
        <div className="space-y-4">
          <form onSubmit={searchAnonymous} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-3">
            <input placeholder="Buscar por nome ou telefone" value={anonymousSearch} onChange={(e) => { setAnonymousSearch(e.target.value); setAnonymousPage(1); }} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 flex-1 outline-none text-[#374151] placeholder:text-[#9ca3af]" />
            <button className="bg-[#ff9811] text-white px-6 py-3 rounded-xl font-black">Buscar</button>
            <button type="button" onClick={loadAnonymousCustomers} className="bg-green-500 text-white px-6 py-3 rounded-xl font-black">Atualizar</button>
          </form>

          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[980px]">
                <thead className="text-[#6b7280] border-b border-[#e5e7eb]">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">WhatsApp</th>
                    <th className="p-3">Pedidos</th>
                    <th className="p-3">Gasto</th>
                    <th className="p-3">Última compra</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedAnonymousCustomers.map((customer) => {
                    const heat = getHeatStatus(customer.lastOrderDate);
                    const days = daysSince(customer.lastOrderDate);

                    return (
                      <tr key={customer.whatsapp} className="border-b border-[#e5e7eb]">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${heat.dot}`} />
                            <strong>{customer.name || "Cliente"}</strong>
                          </div>
                        </td>

                        <td className="p-3">{customer.whatsapp}</td>
                        <td className="p-3">{customer.totalOrders || 0}</td>
                        <td className="p-3 font-bold text-[#ff9811]">
                          {formatMoney(customer.totalSpent || 0)}
                        </td>

                        <td className="p-3">
                          <span className={`font-bold ${heat.text}`}>
                            {formatDate(customer.lastOrderDate)}
                            {days !== null ? ` • ${days} dia(s)` : ""}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-black ${heat.badge}`}>
                            {heat.label}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => openWhatsApp(customer.whatsapp)} className="bg-green-500 text-white px-3 py-2 rounded-lg font-black text-sm">WhatsApp</button>
                            <button onClick={() => fillFormFromAnonymous(customer)} className="bg-[#ff9811] text-white px-3 py-2 rounded-lg font-black text-sm">Cadastrar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {paginatedAnonymousCustomers.map((customer) => {
                const heat = getHeatStatus(customer.lastOrderDate);
                const days = daysSince(customer.lastOrderDate);

                return (
                  <AnonymousMobileCard
                    key={customer.whatsapp}
                    customer={customer}
                    heat={heat}
                    days={days}
                    onWhatsApp={() => openWhatsApp(customer.whatsapp)}
                    onRegister={() => fillFormFromAnonymous(customer)}
                  />
                );
              })}
            </div>

            {paginatedAnonymousCustomers.length === 0 && (
              <p className="text-[#6b7280] mt-4">
                Nenhum cliente não cadastrado encontrado.
              </p>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <button disabled={anonymousPage <= 1} onClick={() => setAnonymousPage(anonymousPage - 1)} className="bg-white border border-[#e5e7eb] disabled:opacity-50 px-5 py-3 rounded-xl font-bold shadow-sm">
              Página anterior
            </button>

            <span className="text-sm text-[#6b7280] text-center">
              Página {anonymousPage} de {anonymousTotalPages} • {filteredAnonymousCustomers.length} cliente(s)
            </span>

            <button disabled={anonymousPage >= anonymousTotalPages} onClick={() => setAnonymousPage(anonymousPage + 1)} className="bg-white border border-[#e5e7eb] disabled:opacity-50 px-5 py-3 rounded-xl font-bold shadow-sm">
              Próxima página
            </button>
          </div>
        </div>
      )}

      {details && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-[#374151] w-full max-w-6xl max-h-[94vh] rounded-3xl overflow-hidden border border-[#e5e7eb] shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex justify-between gap-3 items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-[#ff9811]">👤 {details.customer.name}</h2>
                <p className="text-xs text-[#6b7280]">
                  WhatsApp: {details.customer.whatsapp} • Cadastro: {formatDate(details.customer.createdAt)}
                </p>
              </div>

              <button onClick={closeDetails} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
                Fechar
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                  <p className="text-xs text-[#6b7280]">Total gasto</p>
                  <h3 className="text-2xl font-black text-[#ff9811]">
                    {formatMoney(details.stats.totalSpent)}
                  </h3>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                  <p className="text-xs text-[#6b7280]">Pedidos</p>
                  <h3 className="text-2xl font-black text-[#ff9811]">
                    {details.stats.totalOrders}
                  </h3>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                  <p className="text-xs text-[#6b7280]">Pontos</p>
                  <h3 className="text-2xl font-black text-[#ff9811]">
                    {details.customer.points || 0}
                  </h3>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                  <p className="text-xs text-[#6b7280]">Cashback</p>
                  <h3 className="text-2xl font-black text-[#ff9811]">
                    {formatMoney(details.customer.cashbackBalance || 0)}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                  <h3 className="font-black text-[#ff9811] mb-3">
                    Dados do cliente
                  </h3>

                  <div className="space-y-2 text-sm text-[#6b7280]">
                    <p><strong>CPF:</strong> {details.customer.cpf || "Não informado"}</p>
                    <p><strong>Endereço:</strong> {details.customer.deliveryAddress?.street || "-"}, {details.customer.deliveryAddress?.houseNumber || "-"} - {details.customer.deliveryAddress?.neighborhood || "-"}</p>
                    <p><strong>CEP:</strong> {details.customer.deliveryAddress?.cep || "-"}</p>
                    <p><strong>Status:</strong> {details.customer.active ? "Ativo" : "Inativo"}</p>
                    <p><strong>Código indicação:</strong> {details.customer.referralCode}</p>
                    <p><strong>Indicado por:</strong> {details.referredBy?.name || "Ninguém"}</p>
                    <p><strong>Indicação válida até:</strong> {formatDate(details.customer.referralValidUntil)}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <button onClick={copyReferralLink} className="bg-green-500 text-white p-3 rounded-xl font-black text-sm">
                      Copiar link indicação
                    </button>

                    <button onClick={editSelected} className="bg-[#ff9811] text-white p-3 rounded-xl font-black text-sm">
                      Editar cliente
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                  <h3 className="font-black text-[#ff9811] mb-3">
                    Clientes indicados
                  </h3>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {details.referredCustomers?.map((item) => (
                      <div key={item._id} className="bg-[#f9fafb] rounded-xl p-3 text-sm">
                        <strong>{item.name}</strong>
                        <p className="text-[#6b7280]">
                          {item.whatsapp} • {formatDate(item.createdAt)}
                        </p>
                      </div>
                    ))}

                    {details.referredCustomers?.length === 0 && (
                      <p className="text-[#6b7280] text-sm">
                        Nenhum cliente indicado ainda.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                <h3 className="font-black text-[#ff9811] mb-3">
                  Histórico de pedidos
                </h3>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="border-b border-[#e5e7eb] text-[#6b7280]">
                      <tr>
                        <th className="p-3">Pedido</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Subtotal</th>
                        <th className="p-3">Desconto</th>
                        <th className="p-3">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {details.orders?.map((order) => (
                        <tr key={order._id} className="border-b border-[#e5e7eb]">
                          <td className="p-3">#{String(order._id).slice(-6)}</td>
                          <td className="p-3">{formatDate(order.createdAt)}</td>
                          <td className="p-3">{order.type}</td>
                          <td className="p-3">{order.status}</td>
                          <td className="p-3">{formatMoney(order.subtotal)}</td>
                          <td className="p-3">{formatMoney(order.discount)}</td>
                          <td className="p-3 font-black text-[#ff9811]">{formatMoney(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {details.orders?.map((order) => (
                    <OrderHistoryMobileCard key={order._id} order={order} />
                  ))}
                </div>

                {details.orders?.length === 0 && (
                  <p className="text-[#6b7280] mt-4">
                    Cliente ainda não possui pedidos.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerMobileCard({ customer, heat, days, lastOrderDate, onDetails, onEdit }) {
  return (
    <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${heat.dot}`} />
            <h4 className="font-black text-[#374151] truncate">{customer.name}</h4>
          </div>
          <p className="text-xs text-[#6b7280] mt-1">📱 {customer.whatsapp}</p>
          <p className="text-xs text-[#6b7280]">Ref: {customer.referralCode || "-"}</p>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${heat.badge}`}>
          {heat.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3">
          <p className="text-xs text-[#6b7280]">Pontos</p>
          <strong className="text-[#ff9811]">{customer.points || 0}</strong>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3">
          <p className="text-xs text-[#6b7280]">Cashback</p>
          <strong className="text-[#ff9811]">{formatMoney(customer.cashbackBalance || 0)}</strong>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3">
          <p className="text-xs text-[#6b7280]">Pedidos</p>
          <strong>{customer.stats?.totalOrders || 0}</strong>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3">
          <p className="text-xs text-[#6b7280]">Gasto</p>
          <strong>{formatMoney(customer.stats?.totalSpent || 0)}</strong>
        </div>
      </div>

      <div className="mt-3 bg-white border border-[#e5e7eb] rounded-xl p-3 text-sm">
        <p className="text-xs text-[#6b7280]">Última compra</p>
        <strong className={heat.text}>
          {formatDate(lastOrderDate)}
          {days !== null ? ` • ${days} dia(s)` : ""}
        </strong>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={onDetails} className="bg-[#ff9811] text-white px-3 py-3 rounded-xl font-black text-sm">Ver detalhes</button>
        <button onClick={onEdit} className="bg-blue-500 text-white px-3 py-3 rounded-xl font-black text-sm">Editar</button>
      </div>
    </div>
  );
}

function AnonymousMobileCard({ customer, heat, days, onWhatsApp, onRegister }) {
  return (
    <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${heat.dot}`} />
            <h4 className="font-black text-[#374151] truncate">{customer.name || "Cliente"}</h4>
          </div>
          <p className="text-xs text-[#6b7280] mt-1">📱 {customer.whatsapp}</p>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${heat.badge}`}>
          {heat.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3">
          <p className="text-xs text-[#6b7280]">Pedidos</p>
          <strong>{customer.totalOrders || 0}</strong>
        </div>
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-3">
          <p className="text-xs text-[#6b7280]">Gasto</p>
          <strong className="text-[#ff9811]">{formatMoney(customer.totalSpent || 0)}</strong>
        </div>
      </div>

      <div className="mt-3 bg-white border border-[#e5e7eb] rounded-xl p-3 text-sm">
        <p className="text-xs text-[#6b7280]">Última compra</p>
        <strong className={heat.text}>
          {formatDate(customer.lastOrderDate)}
          {days !== null ? ` • ${days} dia(s)` : ""}
        </strong>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={onWhatsApp} className="bg-green-500 text-white px-3 py-3 rounded-xl font-black text-sm">WhatsApp</button>
        <button onClick={onRegister} className="bg-[#ff9811] text-white px-3 py-3 rounded-xl font-black text-sm">Cadastrar</button>
      </div>
    </div>
  );
}

function OrderHistoryMobileCard({ order }) {
  return (
    <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between gap-3">
        <div>
          <h4 className="font-black text-[#374151]">#{String(order._id).slice(-6)}</h4>
          <p className="text-xs text-[#6b7280]">{formatDate(order.createdAt)}</p>
        </div>
        <span className="bg-white border border-[#e5e7eb] px-3 py-1 rounded-full text-xs font-black">
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <p>Tipo: <strong>{order.type}</strong></p>
        <p>Subtotal: <strong>{formatMoney(order.subtotal)}</strong></p>
        <p>Desconto: <strong>{formatMoney(order.discount)}</strong></p>
        <p>Total: <strong className="text-[#ff9811]">{formatMoney(order.total)}</strong></p>
      </div>
    </div>
  );
}


export default Customers;
