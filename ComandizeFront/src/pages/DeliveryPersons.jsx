import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://comandize.com.br";

const API_URL = `${API_BASE_URL}/api/delivery-persons`;
const SETTINGS_URL = `${API_BASE_URL}/api/delivery-persons/settings`;

function onlyNumbers(value = "") {
  return String(value).replace(/\D/g, "");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function emptyForm() {
  return {
    name: "",
    whatsapp: "",
    address: "",
    salary: "",
    earningPerKm: "",
    deliveryPercent: "",
    active: true,
  };
}

function DeliveryPersons() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingDeliveryPerson, setEditingDeliveryPerson] = useState(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [showForm, setShowForm] = useState(true);
  const [settings, setSettings] = useState({
    minimumFee: 3,
    minKmIncluded: 1,
    pricePerKm: 2,
    extraFee: 0,
    active: true,
  });

  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const loadSettings = async () => {
    try {
      const response = await fetch(SETTINGS_URL, { headers });
      const data = await response.json();
      if (response.ok) setSettings(data);
    } catch {
      setMessage("Erro ao carregar configuração de entrega.");
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch(SETTINGS_URL, {
        method: "PUT",
        headers,
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      setMessage(data.message || "Configuração salva.");
      if (response.ok) setSettings(data.settings);
    } catch {
      setMessage("Erro ao salvar configuração de entrega.");
    }
  };

  const updateSettings = (field, value) => {
    setSettings((old) => ({ ...old, [field]: value }));
  };

  const loadDeliveryPersons = async () => {
    try {
      const params = new URLSearchParams({ search, status });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Erro ao carregar entregadores.");
        setDeliveryPersons([]);
        return;
      }

      setDeliveryPersons(Array.isArray(data) ? data : []);
    } catch {
      setMessage("Erro de conexão ao carregar entregadores.");
    }
  };

  useEffect(() => {
    loadDeliveryPersons();
    loadSettings();
  }, []);

  const updateForm = (field, value) => {
    setForm((old) => ({ ...old, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingDeliveryPerson(null);
  };

  const fillForm = (deliveryPerson) => {
    setEditingDeliveryPerson(deliveryPerson);
    setShowForm(true);

    setForm({
      name: deliveryPerson.name || "",
      whatsapp: deliveryPerson.whatsapp || "",
      address: deliveryPerson.address || "",
      salary: deliveryPerson.salary || "",
      earningPerKm: deliveryPerson.earningPerKm || "",
      deliveryPercent: deliveryPerson.deliveryPercent || "",
      active: deliveryPerson.active,
    });
  };

  const saveDeliveryPerson = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const editing = Boolean(editingDeliveryPerson);
      const url = editing
        ? `${API_URL}/${editingDeliveryPerson._id}`
        : API_URL;

      const method = editing ? "PUT" : "POST";

      const body = {
        name: form.name,
        whatsapp: onlyNumbers(form.whatsapp),
        address: form.address,
        salary: Number(form.salary || 0),
        earningPerKm: Number(form.earningPerKm || 0),
        deliveryPercent: Number(form.deliveryPercent || 0),
        active: Boolean(form.active),
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setMessage(data.message || "Operação concluída.");

      if (response.ok) {
        resetForm();
        loadDeliveryPersons();
      }
    } catch {
      setMessage("Erro de conexão ao salvar entregador.");
    }
  };

  const toggleStatus = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}/toggle-status`, {
        method: "PATCH",
        headers,
      });

      const data = await response.json();
      setMessage(data.message || "Status atualizado.");

      if (response.ok) {
        loadDeliveryPersons();
      }
    } catch {
      setMessage("Erro ao alterar status.");
    }
  };

  const deleteDeliveryPerson = async (id) => {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir este entregador?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();
      setMessage(data.message || "Entregador excluído.");

      if (response.ok) {
        loadDeliveryPersons();
      }
    } catch {
      setMessage("Erro ao excluir entregador.");
    }
  };

  const searchDeliveryPersons = (e) => {
    e.preventDefault();
    loadDeliveryPersons();
  };

  return (
    <div className="space-y-6 text-[#1f2937]">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#ff9811]">🛻 Entregadores</h2>
          <p className="text-slate-600 text-sm">
            Cadastre entregadores, controle status e regras de ganhos.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-[#ff9811] text-white px-6 py-3 rounded-xl font-black"
        >
          {showForm ? "Fechar cadastro" : "Novo entregador"}
        </button>
      </div>

      {message && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 text-sm">
          {message}
        </div>
      )}


      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-xl font-black text-[#ff9811]">⚙️ Regra geral da taxa de entrega</h3>
          <p className="text-slate-600 text-sm">Essa regra vale para todos os entregadores. Exemplo: até 1 km cobra R$ 3,00; acima disso soma valor por KM.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="text-sm text-slate-600">
            Taxa mínima
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.minimumFee}
              onChange={(e) => updateSettings("minimumFee", Number(e.target.value || 0))}
              className="mt-1 w-full bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#1f2937]"
            />
          </label>

          <label className="text-sm text-slate-600">
            KM incluso na mínima
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.minKmIncluded}
              onChange={(e) => updateSettings("minKmIncluded", Number(e.target.value || 0))}
              className="mt-1 w-full bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#1f2937]"
            />
          </label>

          <label className="text-sm text-slate-600">
            Valor por KM excedente
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.pricePerKm}
              onChange={(e) => updateSettings("pricePerKm", Number(e.target.value || 0))}
              className="mt-1 w-full bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#1f2937]"
            />
          </label>

          <label className="text-sm text-slate-600">
            Tarifa extra opcional
            <input
              type="number"
              step="0.01"
              min="0"
              value={settings.extraFee}
              onChange={(e) => updateSettings("extraFee", Number(e.target.value || 0))}
              className="mt-1 w-full bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#1f2937]"
            />
          </label>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-4">
          <p className="text-sm text-slate-600">
            Exemplo: se o cliente estiver a 1 km, cobra {formatMoney(settings.minimumFee)}. Se estiver a 3 km, cobra {formatMoney(Number(settings.minimumFee || 0) + Math.max(0, Number(settings.minKmIncluded || 0) ? 3 - Number(settings.minKmIncluded || 0) : 3) * Number(settings.pricePerKm || 0) + Number(settings.extraFee || 0))}.
          </p>
          <button type="button" onClick={saveSettings} className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-black">
            Salvar regra
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={saveDeliveryPerson}
          className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-[#ff9811]">
              {editingDeliveryPerson ? "Editar entregador" : "Cadastrar entregador"}
            </h3>

            {editingDeliveryPerson && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-zinc-700 px-4 py-2 rounded-xl text-sm font-bold"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <input
            placeholder="Nome do entregador"
            maxLength={80}
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
            required
          />

          <input
            placeholder="WhatsApp"
            maxLength={20}
            value={form.whatsapp}
            onChange={(e) => updateForm("whatsapp", onlyNumbers(e.target.value))}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
            required
          />

          <input
            placeholder="Endereço opcional"
            maxLength={80}
            value={form.address}
            onChange={(e) => updateForm("address", e.target.value)}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none md:col-span-2"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Salário opcional"
            value={form.salary}
            onChange={(e) => updateForm("salary", e.target.value)}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Ganho por KM opcional"
            value={form.earningPerKm}
            onChange={(e) => updateForm("earningPerKm", e.target.value)}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
          />

          <input
            type="number"
            step="0.01"
            placeholder="% por entrega opcional"
            value={form.deliveryPercent}
            onChange={(e) => updateForm("deliveryPercent", e.target.value)}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
          />

          <label className="flex items-center gap-3 bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => updateForm("active", e.target.checked)}
            />
            <span className="font-bold">
              Entregador {form.active ? "Ativo" : "Não Ativo"}
            </span>
          </label>

          <button className="md:col-span-2 bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-black">
            {editingDeliveryPerson ? "Atualizar entregador" : "Cadastrar entregador"}
          </button>
        </form>
      )}

      <form
        onSubmit={searchDeliveryPersons}
        className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-3"
      >
        <input
          placeholder="Buscar por nome, WhatsApp ou endereço"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 flex-1 outline-none"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
        >
          <option value="TODOS">Todos</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Não ativos</option>
        </select>

        <button className="bg-[#ff9811] text-white px-6 py-3 rounded-xl font-black">
          Buscar
        </button>
      </form>

      <div className="md:hidden space-y-3">
        {deliveryPersons.map((deliveryPerson) => (
          <div key={deliveryPerson._id} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-black text-lg text-[#1f2937] truncate">🛻 {deliveryPerson.name}</h3>
                <p className="text-sm text-slate-500 mt-1">📱 {deliveryPerson.whatsapp}</p>
              </div>
              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-black ${deliveryPerson.active ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                {deliveryPerson.active ? "Ativo" : "Não ativo"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-xl p-3">
                <p className="text-slate-500 text-xs">Salário</p>
                <strong>{formatMoney(deliveryPerson.salary)}</strong>
              </div>
              <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-xl p-3">
                <p className="text-slate-500 text-xs">Ganho/KM</p>
                <strong>{formatMoney(deliveryPerson.earningPerKm)}</strong>
              </div>
              <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-xl p-3">
                <p className="text-slate-500 text-xs">% entrega</p>
                <strong>{Number(deliveryPerson.deliveryPercent || 0)}%</strong>
              </div>
              <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-xl p-3">
                <p className="text-slate-500 text-xs">Endereço</p>
                <strong className="block truncate">{deliveryPerson.address || "-"}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-4">
              <button onClick={() => fillForm(deliveryPerson)} className="bg-[#ff9811] text-white px-4 py-3 rounded-xl font-black text-sm">Editar</button>
              <button onClick={() => toggleStatus(deliveryPerson._id)} className="bg-blue-500 text-white px-4 py-3 rounded-xl font-black text-sm">
                {deliveryPerson.active ? "Inativar" : "Ativar"}
              </button>
              <button onClick={() => deleteDeliveryPerson(deliveryPerson._id)} className="bg-red-500 text-white px-4 py-3 rounded-xl font-black text-sm">Excluir</button>
            </div>
          </div>
        ))}

        {deliveryPersons.length === 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-slate-500 shadow-sm">Nenhum entregador cadastrado.</div>
        )}
      </div>

      <div className="hidden md:block bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[1050px]">
          <thead className="text-slate-600 border-b border-[#e5e7eb]">
            <tr>
              <th className="p-3">Entregador</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Endereço</th>
              <th className="p-3">Salário</th>
              <th className="p-3">Ganho/KM</th>
              <th className="p-3">% Entrega</th>
              <th className="p-3">Status</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>

          <tbody>
            {deliveryPersons.map((deliveryPerson) => (
              <tr key={deliveryPerson._id} className="border-b border-slate-200">
                <td className="p-3">
                  <strong>{deliveryPerson.name}</strong>
                </td>

                <td className="p-3">{deliveryPerson.whatsapp}</td>
                <td className="p-3">{deliveryPerson.address || "-"}</td>
                <td className="p-3">{formatMoney(deliveryPerson.salary)}</td>
                <td className="p-3">{formatMoney(deliveryPerson.earningPerKm)}</td>
                <td className="p-3">{Number(deliveryPerson.deliveryPercent || 0)}%</td>

                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      deliveryPerson.active
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {deliveryPerson.active ? "Ativo" : "Não Ativo"}
                  </span>
                </td>

                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fillForm(deliveryPerson)}
                      className="bg-[#ff9811] text-white px-3 py-2 rounded-lg font-black text-sm"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => toggleStatus(deliveryPerson._id)}
                      className="bg-blue-500 px-3 py-2 rounded-lg font-black text-sm"
                    >
                      {deliveryPerson.active ? "Inativar" : "Ativar"}
                    </button>

                    <button
                      onClick={() => deleteDeliveryPerson(deliveryPerson._id)}
                      className="bg-red-500 px-3 py-2 rounded-lg font-black text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {deliveryPersons.length === 0 && (
          <p className="text-slate-500 mt-4">Nenhum entregador cadastrado.</p>
        )}
      </div>
    </div>
  );
}

export default DeliveryPersons;
