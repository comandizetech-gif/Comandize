import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://comandize.com.br";
const API_URL = `${API_BASE_URL}/api/store-config`;
const SUB_ACCOUNTS_URL = `${API_BASE_URL}/api/sub-accounts`;

const days = [
  { key: "domingo", label: "Domingo" },
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
];

const pageOptions = ["Delivery", "Pedidos", "Históricos", "Produtos", "Catálogo Online", "Clientes", "Relatórios", "Entregadores", "Configuração"];

const defaultSchedule = { active: true, open: "08:00", lunchStart: "", lunchEnd: "", close: "18:00", hasLunchBreak: false };

function emptySubAccountForm() {
  return {
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "ATTENDANT",
    active: true,
    permissions: pageOptions.map((page) => ({ page, canView: page === "Delivery", canManage: false })),
  };
}

function StoreConfig() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [message, setMessage] = useState("");
  const [bannerImage, setBannerImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subAccounts, setSubAccounts] = useState([]);
  const [subAccountForm, setSubAccountForm] = useState(emptySubAccountForm());
  const [editingSubAccount, setEditingSubAccount] = useState(null);
  const [showSubAccountForm, setShowSubAccountForm] = useState(true);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    address: "",
    customDomain: "",
    schedules: {
      domingo: { ...defaultSchedule, active: false },
      segunda: { ...defaultSchedule },
      terca: { ...defaultSchedule },
      quarta: { ...defaultSchedule },
      quinta: { ...defaultSchedule },
      sexta: { ...defaultSchedule },
      sabado: { ...defaultSchedule, active: false },
    },
  });

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const loadConfig = async () => {
    try {
      const response = await fetch(API_URL, { headers });
      const data = await response.json();
      if (response.status === 401) return handleUnauthorized();
      if (!response.ok) return setMessage(data.message || "Erro ao carregar configuração.");
      setForm((old) => ({
        title: data.title || "",
        subtitle: data.subtitle || "",
        address: data.address || "",
        customDomain: data.customDomain || "",
        schedules: data.schedules || old.schedules,
      }));
    } catch {
      setMessage("Erro de conexão ao carregar configuração.");
    }
  };

  const loadSubAccounts = async () => {
    try {
      const response = await fetch(SUB_ACCOUNTS_URL, { headers });
      const data = await response.json();
      if (response.status === 401) return handleUnauthorized();
      if (response.status === 403) return setSubAccounts([]);
      if (!response.ok) return setMessage(data.message || "Erro ao carregar subcontas.");
      setSubAccounts(Array.isArray(data) ? data : []);
    } catch {
      setMessage("Erro de conexão ao carregar subcontas.");
    }
  };

  useEffect(() => {
    loadConfig();
    loadSubAccounts();
  }, []);

  const updateSchedule = (day, field, value) => {
    setForm({ ...form, schedules: { ...form.schedules, [day]: { ...form.schedules[day], [field]: value } } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("subtitle", form.subtitle);
      formData.append("address", form.address);
      formData.append("customDomain", form.customDomain);
      formData.append("schedules", JSON.stringify(form.schedules));
      if (bannerImage) formData.append("bannerImage", bannerImage);
      const response = await fetch(API_URL, { method: "PUT", headers, body: formData });
      const data = await response.json();
      if (response.status === 401) return handleUnauthorized();
      setMessage(data.message || "Configurações salvas.");
      if (response.ok) {
        setBannerImage(null);
        loadConfig();
      }
    } catch {
      setMessage("Erro de conexão ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (page, field, value) => {
    setSubAccountForm((old) => ({
      ...old,
      permissions: old.permissions.map((permission) => {
        if (permission.page !== page) return permission;
        const updated = { ...permission, [field]: value };
        if (field === "canView" && !value) updated.canManage = false;
        if (field === "canManage" && value) updated.canView = true;
        return updated;
      }),
    }));
  };

  const resetSubAccountForm = () => {
    setSubAccountForm(emptySubAccountForm());
    setEditingSubAccount(null);
  };

  const editSubAccount = (account) => {
    const permissions = pageOptions.map((page) => {
      const current = account.permissions?.find((item) => item.page === page);
      return { page, canView: Boolean(current?.canView), canManage: Boolean(current?.canManage) };
    });
    setEditingSubAccount(account);
    setShowSubAccountForm(true);
    setSubAccountForm({ name: account.name || "", email: account.email || "", phone: account.phone || "", password: "", confirmPassword: "", role: account.role || "ATTENDANT", active: account.active !== false, permissions });
  };

  const saveSubAccount = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!subAccountForm.name || !subAccountForm.email) return setMessage("Preencha nome e e-mail da subconta.");
    if (!editingSubAccount && (!subAccountForm.password || !subAccountForm.confirmPassword)) return setMessage("Preencha a senha e confirmação de senha.");
    if ((subAccountForm.password || subAccountForm.confirmPassword) && subAccountForm.password !== subAccountForm.confirmPassword) return setMessage("As duas senhas não conferem.");
    try {
      const url = editingSubAccount ? `${SUB_ACCOUNTS_URL}/${editingSubAccount._id}` : SUB_ACCOUNTS_URL;
      const response = await fetch(url, { method: editingSubAccount ? "PUT" : "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(subAccountForm) });
      const data = await response.json();
      if (response.status === 401) return handleUnauthorized();
      setMessage(data.message || "Subconta salva.");
      if (response.ok) {
        resetSubAccountForm();
        loadSubAccounts();
      }
    } catch {
      setMessage("Erro de conexão ao salvar subconta.");
    }
  };

  const toggleSubAccountStatus = async (id) => {
    try {
      const response = await fetch(`${SUB_ACCOUNTS_URL}/${id}/toggle-status`, { method: "PATCH", headers });
      const data = await response.json();
      if (response.status === 401) return handleUnauthorized();
      setMessage(data.message || "Status atualizado.");
      if (response.ok) loadSubAccounts();
    } catch {
      setMessage("Erro ao alterar status da subconta.");
    }
  };

  const deleteSubAccount = async (id) => {
    if (!window.confirm("Deseja excluir esta subconta?")) return;
    try {
      const response = await fetch(`${SUB_ACCOUNTS_URL}/${id}`, { method: "DELETE", headers });
      const data = await response.json();
      if (response.status === 401) return handleUnauthorized();
      setMessage(data.message || "Subconta excluída.");
      if (response.ok) loadSubAccounts();
    } catch {
      setMessage("Erro ao excluir subconta.");
    }
  };

  return (
    <div className="space-y-6 text-[#1f2937]">
      {message && <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 shadow-sm">{message}</div>}

      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3 shadow-sm flex flex-col md:flex-row gap-2">
        {[{ key: "catalog", label: "Catálogo" }, { key: "hours", label: "Horários" }, { key: "accounts", label: "Subcontas" }].map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex-1 p-3 rounded-xl font-black ${activeTab === tab.key ? "bg-[#ff9811] text-white" : "bg-[#f8fafc] text-[#374151]"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={activeTab === "accounts" ? "hidden" : "space-y-6"}>
        {activeTab === "catalog" && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
            <h3 className="text-2xl font-black text-[#ff9811] mb-4">Configuração do Catálogo Público</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input maxLength={80} placeholder="Texto maior sobre o banner. Ex: Carnes Nobres" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" />
              <input maxLength={120} placeholder="Subtítulo sobre o banner. Ex: Carnes frescas todos os dias" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" />
              <input maxLength={160} placeholder="Endereço exibido abaixo da imagem do banner" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="md:col-span-2 bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" />

              <div className="md:col-span-2 bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
                <label className="block text-sm font-black text-[#ff9811]">Domínio próprio do catálogo</label>
                <input
                  maxLength={160}
                  placeholder="Ex: carnessanrafael.com.br"
                  value={form.customDomain}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customDomain: e.target.value
                        .toLowerCase()
                        .replace(/^https?:\/\//, "")
                        .replace(/^www\./, "")
                        .replace(/\/.*$/, "")
                        .trim(),
                    })
                  }
                  className="w-full bg-white border border-[#d1d5db] rounded-xl p-3 outline-none"
                />
                <p className="text-xs text-slate-600">
                  Use somente o domínio, sem https:// e sem barra. Exemplo: carnessanrafael.com.br.
                  O DNS do cliente deve apontar para a VPS do COMANDIZE.
                </p>
              </div>
              <label className="md:col-span-2 bg-[#f8fafc] border-2 border-dashed border-[#d1d5db] hover:border-[#ff9811] rounded-2xl p-6 shadow-sm cursor-pointer transition text-center">
                <span className="block text-3xl mb-2">🖼️</span>
                <strong className="block text-[#ff9811]">Adicionar imagem do banner</strong>
                <small className="block text-slate-500 mt-1">Clique para escolher uma imagem. Tamanho máximo: 5MB.</small>
                {bannerImage && <span className="block text-green-500 text-sm font-bold mt-3">Imagem selecionada: {bannerImage.name}</span>}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files[0]; if (file && file.size > 5 * 1024 * 1024) return alert("Imagem máxima permitida: 5MB."); setBannerImage(file || null); }} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {activeTab === "hours" && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
            <h3 className="text-2xl font-black text-[#ff9811] mb-4">Horários de Funcionamento</h3>
            <div className="space-y-4">
              {days.map((day) => {
                const schedule = form.schedules[day.key] || defaultSchedule;
                return (
                  <div key={day.key} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4"><strong>{day.label}</strong><label className="flex items-center gap-2"><input type="checkbox" checked={schedule.active} onChange={(e) => updateSchedule(day.key, "active", e.target.checked)} />Aberto nesse dia</label></div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input type="time" value={schedule.open || ""} onChange={(e) => updateSchedule(day.key, "open", e.target.value)} className="bg-white border border-[#d1d5db] rounded-xl p-3" />
                      <label className="flex items-center gap-2 bg-white border border-[#d1d5db] rounded-xl p-3"><input type="checkbox" checked={schedule.hasLunchBreak} onChange={(e) => updateSchedule(day.key, "hasLunchBreak", e.target.checked)} />Fecha almoço</label>
                      <input type="time" disabled={!schedule.hasLunchBreak} value={schedule.lunchStart || ""} onChange={(e) => updateSchedule(day.key, "lunchStart", e.target.value)} className="bg-white border border-[#d1d5db] rounded-xl p-3 disabled:opacity-40" />
                      <input type="time" disabled={!schedule.hasLunchBreak} value={schedule.lunchEnd || ""} onChange={(e) => updateSchedule(day.key, "lunchEnd", e.target.value)} className="bg-white border border-[#d1d5db] rounded-xl p-3 disabled:opacity-40" />
                      <input type="time" value={schedule.close || ""} onChange={(e) => updateSchedule(day.key, "close", e.target.value)} className="bg-white border border-[#d1d5db] rounded-xl p-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <button disabled={loading} className="w-full bg-[#ff9811] hover:bg-[#e88708] text-white font-black p-5 rounded-2xl disabled:opacity-60">{loading ? "Salvando..." : "Salvar Configurações"}</button>
      </form>

      {activeTab === "accounts" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div><h3 className="text-2xl font-black text-[#ff9811]">Subcontas da loja</h3><p className="text-sm text-slate-500">Crie usuários auxiliares com acesso limitado às páginas do painel.</p></div>
            <button type="button" onClick={() => { resetSubAccountForm(); setShowSubAccountForm(!showSubAccountForm); }} className="bg-[#ff9811] text-white px-5 py-3 rounded-xl font-black">{showSubAccountForm ? "Fechar cadastro" : "Nova subconta"}</button>
          </div>

          {showSubAccountForm && (
            <form onSubmit={saveSubAccount} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-3"><div><h4 className="text-xl font-black text-[#ff9811]">{editingSubAccount ? "Editar subconta" : "Cadastrar subconta"}</h4><p className="text-xs text-slate-500">A senha nova é opcional ao editar. Se preencher, confirme no segundo campo.</p></div>{editingSubAccount && <button type="button" onClick={resetSubAccountForm} className="bg-[#f8fafc] border border-[#d1d5db] px-4 py-2 rounded-xl font-bold">Cancelar edição</button>}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Nome do usuário" value={subAccountForm.name} onChange={(e) => setSubAccountForm({ ...subAccountForm, name: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" required />
                <input type="email" placeholder="E-mail para login" value={subAccountForm.email} onChange={(e) => setSubAccountForm({ ...subAccountForm, email: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" required />
                <input placeholder="Telefone opcional" value={subAccountForm.phone} onChange={(e) => setSubAccountForm({ ...subAccountForm, phone: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" />
                <select value={subAccountForm.role} onChange={(e) => setSubAccountForm({ ...subAccountForm, role: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"><option value="MANAGER">Gerente</option><option value="ATTENDANT">Atendente</option><option value="KITCHEN">Cozinha</option><option value="DELIVERY">Entregador</option></select>
                <input type="password" placeholder={editingSubAccount ? "Nova senha opcional" : "Senha"} value={subAccountForm.password} onChange={(e) => setSubAccountForm({ ...subAccountForm, password: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" required={!editingSubAccount} />
                <input type="password" placeholder="Confirmar senha" value={subAccountForm.confirmPassword} onChange={(e) => setSubAccountForm({ ...subAccountForm, confirmPassword: e.target.value })} className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none" required={!editingSubAccount} />
                <label className="md:col-span-2 flex items-center gap-3 bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3"><input type="checkbox" checked={subAccountForm.active} onChange={(e) => setSubAccountForm({ ...subAccountForm, active: e.target.checked })} /><span className="font-bold">Subconta {subAccountForm.active ? "ativa" : "inativa"}</span></label>
              </div>
              <div className="border border-[#e5e7eb] rounded-2xl overflow-hidden"><div className="bg-[#f8fafc] p-4"><h4 className="font-black text-[#ff9811]">Permissões por página</h4><p className="text-xs text-slate-500">Visualizar libera o menu. Gerenciar permite criar, editar, excluir e alterar dados.</p></div><div className="divide-y divide-[#e5e7eb]">{subAccountForm.permissions.map((permission) => (<div key={permission.page} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><strong>{permission.page}</strong><div className="flex items-center gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={permission.canView} onChange={(e) => updatePermission(permission.page, "canView", e.target.checked)} />Visualizar</label><label className="flex items-center gap-2"><input type="checkbox" checked={permission.canManage} onChange={(e) => updatePermission(permission.page, "canManage", e.target.checked)} />Gerenciar</label></div></div>))}</div></div>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-black">{editingSubAccount ? "Atualizar subconta" : "Cadastrar subconta"}</button>
            </form>
          )}

          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[850px]"><thead className="border-b border-[#e5e7eb] text-slate-600"><tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Perfil</th><th className="p-3">Status</th><th className="p-3">Páginas</th><th className="p-3">Ações</th></tr></thead><tbody>{subAccounts.map((account) => { const visiblePages = account.permissions?.filter((item) => item.canView) || []; return (<tr key={account._id} className="border-b border-[#e5e7eb]"><td className="p-3"><strong>{account.name}</strong><small className="block text-slate-500">{account.phone || "-"}</small></td><td className="p-3">{account.email}</td><td className="p-3">{account.role}</td><td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-black ${account.active ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>{account.active ? "Ativa" : "Inativa"}</span></td><td className="p-3 text-sm text-slate-600">{visiblePages.length ? visiblePages.map((item) => item.page).join(", ") : "Nenhuma"}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => editSubAccount(account)} className="bg-[#ff9811] text-white px-3 py-2 rounded-lg font-black text-sm">Editar</button><button type="button" onClick={() => toggleSubAccountStatus(account._id)} className="bg-blue-500 text-white px-3 py-2 rounded-lg font-black text-sm">{account.active ? "Inativar" : "Ativar"}</button><button type="button" onClick={() => deleteSubAccount(account._id)} className="bg-red-500 text-white px-3 py-2 rounded-lg font-black text-sm">Excluir</button></div></td></tr>); })}</tbody></table>
            {subAccounts.length === 0 && <p className="text-slate-500 mt-4">Nenhuma subconta cadastrada ainda.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreConfig;
