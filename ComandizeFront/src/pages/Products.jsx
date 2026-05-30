import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:3000/api/products";
const PAGE_SIZE = 30;
const CACHE_PREFIX = "comandize_products_cache_v1";

function getCacheKey({ page, search, sortBy, sortDir }) {
  return `${CACHE_PREFIX}:${page}:${search || ""}:${sortBy}:${sortDir}`;
}

function readProductCache(key, syncVersion) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (parsed.syncVersion !== syncVersion) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveProductCache(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Se o navegador/celular ficar sem espaço, remove caches antigos e segue normal.
    Object.keys(localStorage)
      .filter((itemKey) => itemKey.startsWith(CACHE_PREFIX))
      .forEach((itemKey) => localStorage.removeItem(itemKey));
  }
}

function clearProductCache() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignora falhas de cache.
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function calculateMargin(product, mode) {
  const entry = Number(product.entryPrice || 0);
  const sale = Number(product.salePrice || 0);

  if (mode === "markup") {
    if (entry <= 0) return 0;
    return ((sale - entry) / entry) * 100;
  }

  return sale - entry;
}

function emptyForm() {
  return {
    name: "",
    sku: "",
    barcode: "",
    companyName: "",
    measureType: "UNIDADE",
    image: null,
    productType: "carne",
    entryPrice: "",
    salePrice: "",
    clientPrice: "",
    cashbackPercent: "",
    lossPercent: "",
    promotionalPrice: "",
    stock: "",
    active: true,
    priority: "",
    recipeEnabled: false,
    recipeItems: [{ product: "", quantity: "1" }],
  };
}

function Products() {
  const [products, setProducts] = useState([]);
  const [recipeProducts, setRecipeProducts] = useState([]);
  const [types, setTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockToAdd, setStockToAdd] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [marginMode, setMarginMode] = useState("fixed");
  const [imageDragActive, setImageDragActive] = useState(false);

  const [form, setForm] = useState(emptyForm());

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const handleUnauthorized = () => {
    setProducts([]);
    setTypes([]);
    setMessage("Sessão expirada. Clique em Sair e faça login novamente.");
  };

  const getSyncVersion = async () => {
    const response = await fetch(`${API_URL}/sync-status`, {
      headers: getHeaders(),
    });

    const data = await response.json();

    if (response.status === 401) {
      handleUnauthorized();
      return null;
    }

    if (!response.ok) return null;

    return data.version || `${data.total || 0}-${data.lastUpdatedAt || "empty"}`;
  };

  const loadProducts = async (customPage = page, customSearch = appliedSearch, forceRefresh = false) => {
    try {
      setLoading(true);

      const cacheKey = getCacheKey({
        page: customPage,
        search: customSearch,
        sortBy,
        sortDir,
      });

      const syncVersion = await getSyncVersion();

      if (syncVersion && !forceRefresh) {
        const cached = readProductCache(cacheKey, syncVersion);

        if (cached) {
          setProducts(cached.products || []);
          setPage(cached.page || customPage);
          setPagination(cached.pagination || { total: 0, totalPages: 1 });
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams({
        page: String(customPage),
        limit: String(PAGE_SIZE),
        search: customSearch,
        sortBy,
        sortDir,
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: getHeaders(),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setProducts([]);
        setMessage(data.message || "Erro ao carregar produtos.");
        return;
      }

      const list = Array.isArray(data) ? data : data.products || [];
      const nextPagination = {
        total: data.total || list.length,
        totalPages: data.totalPages || 1,
      };

      setProducts(list);
      setPage(data.page || customPage);
      setPagination(nextPagination);

      if (syncVersion) {
        saveProductCache(cacheKey, {
          syncVersion,
          products: list,
          page: data.page || customPage,
          pagination: nextPagination,
          savedAt: Date.now(),
        });
      }
    } catch {
      setProducts([]);
      setMessage("Erro de conexão ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  };

  const loadRecipeProducts = async () => {
    try {
      const response = await fetch(`${API_URL}?all=true`, {
        headers: getHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        setRecipeProducts(Array.isArray(data) ? data : []);
      }
    } catch {
      setRecipeProducts([]);
    }
  };

  const loadTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/types`, {
        headers: getHeaders(),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      setTypes(response.ok && Array.isArray(data) ? data : []);
    } catch {
      setTypes([]);
    }
  };

  useEffect(() => {
    loadProducts(1, "");
    loadRecipeProducts();
    loadTypes();
  }, []);

  useEffect(() => {
    loadProducts(1, appliedSearch);
  }, [sortBy, sortDir]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingProduct(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (value.length > 80 && type === "text") return;

    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const buildFormData = () => {
    const formData = new FormData();

    Object.keys(form).forEach((key) => {
      const value = form[key];

      if (key === "recipeItems") return;

      if (value !== null && value !== "") {
        formData.append(key, value);
      }
    });

    const cleanedRecipeItems = form.recipeEnabled
      ? form.recipeItems
          .filter((item) => item.product && Number(item.quantity || 0) > 0)
          .map((item) => ({
            product: item.product,
            quantity: Number(item.quantity || 0),
          }))
      : [];

    formData.set("recipeEnabled", form.recipeEnabled ? "true" : "false");
    formData.set("recipeItems", JSON.stringify(cleanedRecipeItems));

    return formData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const url = editingProduct ? `${API_URL}/${editingProduct._id}` : API_URL;
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: buildFormData(),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      setMessage(data.message || "Operação concluída.");

      if (response.ok) {
        clearProductCache();
        resetForm();
        setShowForm(false);
        await loadProducts(editingProduct ? page : 1, appliedSearch, true);
        await loadRecipeProducts();
        await loadTypes();
      }
    } catch {
      setMessage("Erro de conexão ao salvar produto.");
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      companyName: product.companyName || "",
      measureType: product.measureType || "UNIDADE",
      image: null,
      productType: product.productType || "carne",
      entryPrice: product.entryPrice || "",
      salePrice: product.salePrice || "",
      clientPrice: product.clientPrice || "",
      cashbackPercent: product.cashbackPercent || "",
      lossPercent: product.lossPercent || "",
      promotionalPrice: product.promotionalPrice || "",
      stock: product.stock || "",
      active: product.active !== false,
      priority: product.priority || "",
      recipeEnabled: Boolean(product.recipeEnabled),
      recipeItems:
        Array.isArray(product.recipeItems) && product.recipeItems.length > 0
          ? product.recipeItems.map((item) => ({
              product: item.product?._id || item.product || "",
              quantity: item.quantity || "1",
            }))
          : product.recipeSourceProduct
          ? [
              {
                product: product.recipeSourceProduct?._id || product.recipeSourceProduct || "",
                quantity: product.recipeDeductQuantity || "1",
              },
            ]
          : [{ product: "", quantity: "1" }],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Tem certeza que deseja excluir este produto?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      setMessage(data.message || "Produto excluído.");
      clearProductCache();
      loadProducts(page, appliedSearch, true);
      loadRecipeProducts();
    } catch {
      setMessage("Erro de conexão ao excluir produto.");
    }
  };

  const handleAddStock = async (id) => {
    const quantity = stockToAdd[id];

    if (!quantity || Number(quantity) <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}/add-stock`, {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      setMessage(data.message || "Estoque atualizado.");
      setStockToAdd({ ...stockToAdd, [id]: "" });
      clearProductCache();
      loadProducts(page, appliedSearch, true);
      loadRecipeProducts();
    } catch {
      setMessage("Erro de conexão ao atualizar estoque.");
    }
  };

  const searchProducts = (e) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    loadProducts(1, searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    loadProducts(1, "");
  };

  const goToPage = (nextPage) => {
    loadProducts(nextPage, appliedSearch);
  };

  const recipeOptions = useMemo(() => {
    return recipeProducts.filter(
      (product) => !editingProduct || String(product._id) !== String(editingProduct._id)
    );
  }, [recipeProducts, editingProduct]);

  const updateRecipeItem = (index, field, value) => {
    setForm((old) => ({
      ...old,
      recipeItems: old.recipeItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addRecipeItem = () => {
    setForm((old) => ({
      ...old,
      recipeItems: [...old.recipeItems, { product: "", quantity: "1" }],
    }));
  };

  const removeRecipeItem = (index) => {
    setForm((old) => ({
      ...old,
      recipeItems:
        old.recipeItems.length <= 1
          ? [{ product: "", quantity: "1" }]
          : old.recipeItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  return (
    <div className="space-y-6 text-[#374151]">
      {message && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 text-sm text-[#374151] shadow-sm">
          {message}
        </div>
      )}

      <button
        onClick={() => {
          resetForm();
          setShowForm(!showForm);
        }}
        className="w-full bg-[#ff9811] hover:bg-[#fb8c00] text-white transition p-5 rounded-2xl font-black text-lg"
      >
        {showForm ? "Fechar cadastro" : "Cadastrar produto novo"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-[#ff9811]">
                {editingProduct ? "Editar produto" : "Cadastrar produto"}
              </h3>
              <p className="text-xs text-[#6b7280]">
                A imagem só é enviada ao banco quando você clica em salvar.
              </p>
            </div>

            {editingProduct && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-[#f3f4f6] border border-[#d1d5db] text-[#374151] px-4 py-2 rounded-xl text-sm font-bold"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <input name="name" placeholder="Nome do produto" maxLength={80} value={form.name} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" required />
          <input name="sku" placeholder="Código SKU" maxLength={80} value={form.sku} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" required />
          <input name="barcode" placeholder="Código de barra opcional" maxLength={80} value={form.barcode} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" />
          <input name="companyName" placeholder="Nome da empresa opcional" maxLength={80} value={form.companyName} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" />

          <select name="measureType" value={form.measureType} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]">
            <option value="UNIDADE">Unidade</option>
            <option value="KILO">Kilo/Peso</option>
          </select>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setImageDragActive(true);
            }}
            onDragLeave={() => setImageDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setImageDragActive(false);

              const file = e.dataTransfer.files?.[0];

              if (file && file.size > 5 * 1024 * 1024) {
                alert("A imagem deve ter no máximo 5MB.");
                return;
              }

              if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                alert("Use imagem JPEG, PNG ou WEBP.");
                return;
              }

              setForm({ ...form, image: file || null });
            }}
            className={`bg-[#f9fafb] border-2 border-dashed rounded-xl p-4 outline-none cursor-pointer transition flex items-center gap-4 ${
              imageDragActive ? "border-[#ff9811] bg-orange-950/20" : "border-[#d1d5db]"
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-[#d1d5db] flex items-center justify-center text-2xl shrink-0">
              📷
            </div>

            <div className="min-w-0">
              <strong className="block text-[#ff9811]">Adicionar imagem</strong>
              <small className="block text-[#6b7280] truncate">
                Clique ou arraste aqui • JPEG, PNG ou WEBP • até 5MB
              </small>
              {form.image && (
                <small className="block text-green-400 font-bold truncate mt-1">
                  Selecionado: {form.image.name}
                </small>
              )}
              {!form.image && editingProduct?.image && (
                <small className="block text-[#6b7280] font-bold truncate mt-1">
                  Imagem atual mantida se não escolher outra.
                </small>
              )}
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];

                if (file && file.size > 5 * 1024 * 1024) {
                  alert("A imagem deve ter no máximo 5MB.");
                  return;
                }

                setForm({ ...form, image: file || null });
              }}
            />
          </label>

          <div className="md:col-span-2">
            <input
              name="productType"
              list="productTypes"
              placeholder="Tipo de produto"
              maxLength={80}
              value={form.productType}
              onChange={handleChange}
              className="w-full bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]"
              required
            />

            <datalist id="productTypes">
              {types.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>

          <input name="entryPrice" type="number" step="0.01" placeholder="Preço de entrada" value={form.entryPrice} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" required />
          <input name="salePrice" type="number" step="0.01" placeholder="Preço de venda" value={form.salePrice} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" required />
          <input name="clientPrice" type="number" step="0.01" placeholder="Preço cliente opcional" value={form.clientPrice} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" />
          <input name="lossPercent" type="number" step="0.01" min="0" max="100" placeholder="Quebra % opcional. Ex: 8" value={form.lossPercent} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" />
          <input name="stock" type="number" step="0.001" placeholder="Estoque / peso / quantidade" value={form.stock} onChange={handleChange} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]" />

          <div className="md:col-span-2 bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="recipeEnabled"
                checked={form.recipeEnabled}
                onChange={handleChange}
              />
              <span className="font-black text-[#ff9811]">Usar receita / descontar estoque de outro produto</span>
            </label>

            {form.recipeEnabled && (
              <div className="space-y-3">
                {form.recipeItems.map((recipeItem, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[1fr_180px_110px] gap-3"
                  >
                    <select
                      value={recipeItem.product}
                      onChange={(e) => updateRecipeItem(index, "product", e.target.value)}
                      className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]"
                      required={form.recipeEnabled}
                    >
                      <option value="">Selecione o produto origem. Ex: Coxão mole peça</option>
                      {recipeOptions.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} • SKU {product.sku} • Estoque {formatNumber(product.stock)}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.001"
                      placeholder="Qtd. descontada"
                      value={recipeItem.quantity}
                      onChange={(e) => updateRecipeItem(index, "quantity", e.target.value)}
                      className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]"
                      required={form.recipeEnabled}
                    />

                    <button
                      type="button"
                      onClick={() => removeRecipeItem(index)}
                      className="bg-red-500 hover:bg-red-600 px-3 rounded-xl font-black"
                    >
                      Remover
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRecipeItem}
                  className="bg-[#ff9811] text-white px-4 py-3 rounded-xl font-black text-sm"
                >
                  + Adicionar item da receita
                </button>
              </div>
            )}

            <p className="text-xs text-[#6b7280]">
              Exemplo: um kit pode descontar 0,300kg de carne, 0,300kg de frango e 1 unidade de outro produto quando o pedido for finalizado.
            </p>
          </div>

          <button className="md:col-span-2 bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-black">
            {editingProduct ? "Atualizar produto" : "Cadastrar produto"}
          </button>
        </form>
      )}

      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h4 className="text-2xl font-black">Lista de Produtos</h4>
            <p className="text-xs text-[#6b7280]">
              Mostrando até {PAGE_SIZE} produtos por página. Imagens e dados ficam em cache local e só são recarregados quando há alteração.
            </p>
          </div>

          <button
            onClick={() => setMarginMode(marginMode === "fixed" ? "markup" : "fixed")}
            className="bg-[#f9fafb] border border-[#d1d5db] px-4 py-3 rounded-xl font-black text-sm"
          >
            Margem: {marginMode === "fixed" ? "Fixa" : "Markup %"}
          </button>
        </div>

        <form onSubmit={searchProducts} className="grid grid-cols-1 lg:grid-cols-[1fr_180px_150px_130px_110px] gap-3">
          <input
            placeholder="Buscar por nome, SKU, código de barra ou tipo"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]"
          />

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]">
            <option value="createdAt">Mais recentes</option>
            <option value="name">Ordem alfabética</option>
            <option value="stock">Estoque</option>
            <option value="margin">Margem</option>
          </select>

          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="bg-[#f9fafb] border border-[#d1d5db] rounded-xl p-3 outline-none text-[#374151] placeholder:text-[#9ca3af]">
            <option value="desc">Maior primeiro</option>
            <option value="asc">Menor primeiro</option>
          </select>

          <button className="bg-[#ff9811] text-white rounded-xl p-3 font-black">
            Buscar
          </button>

          <button type="button" onClick={clearSearch} className="bg-[#f3f4f6] border border-[#d1d5db] text-[#374151] rounded-xl p-3 font-black">
            Limpar
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1280px]">
            <thead className="text-[#374151] border-b border-[#e5e7eb]">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Entrada</th>
                <th className="p-3">Venda</th>
                <th className="p-3">Margem</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Quebra</th>
                <th className="p-3">Estoque</th>
                <th className="p-3">Receita</th>
                <th className="p-3">Acrescentar</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const margin = calculateMargin(product, marginMode);
                const stock = Number(product.stock || 0);

                return (
                  <tr key={product._id} className="border-b border-[#e5e7eb]">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-11 h-11 rounded-xl object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-[#f9fafb] flex items-center justify-center text-sm">
                            📦
                          </div>
                        )}

                        <div>
                          <strong>{product.name}</strong>
                          <small className="block text-[#6b7280]">
                            {product.active === false ? "Inativo" : "Ativo"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">{product.sku}</td>
                    <td className="p-3">{product.productType}</td>
                    <td className="p-3">{formatMoney(product.entryPrice)}</td>
                    <td className="p-3">{formatMoney(product.salePrice)}</td>
                    <td className="p-3 font-black text-[#ff9811]">
                      {marginMode === "fixed" ? formatMoney(margin) : `${margin.toFixed(2)}%`}
                    </td>
                    <td className="p-3">{product.clientPrice ? formatMoney(product.clientPrice) : "-"}</td>
                    <td className="p-3">{Number(product.lossPercent || 0) > 0 ? `${formatNumber(product.lossPercent)}%` : "-"}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${stock <= 0 ? "bg-red-500 text-[#374151]" : "bg-[#f9fafb] text-[#374151]"}`}>
                        {formatNumber(stock)}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {product.recipeEnabled && Array.isArray(product.recipeItems) && product.recipeItems.length > 0 ? (
                        <div>
                          <strong className="text-green-400">Ativa</strong>
                          {product.recipeItems.slice(0, 2).map((item, index) => (
                            <small key={index} className="block text-[#6b7280]">
                              {item.product?.name || "Produto"} • -{formatNumber(item.quantity)}
                            </small>
                          ))}
                          {product.recipeItems.length > 2 && (
                            <small className="block text-[#9ca3af]">
                              +{product.recipeItems.length - 2} item(ns)
                            </small>
                          )}
                        </div>
                      ) : product.recipeEnabled && product.recipeSourceProduct ? (
                        <div>
                          <strong className="text-green-400">Ativa</strong>
                          <small className="block text-[#6b7280]">
                            {product.recipeSourceProduct.name} • -{formatNumber(product.recipeDeductQuantity)}
                          </small>
                        </div>
                      ) : (
                        <span className="text-[#6b7280]">-</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="+Qtd"
                          value={stockToAdd[product._id] || ""}
                          onChange={(e) =>
                            setStockToAdd({
                              ...stockToAdd,
                              [product._id]: e.target.value,
                            })
                          }
                          className="w-20 bg-[#f9fafb] border border-[#d1d5db] rounded-lg p-2 outline-none text-[#374151] placeholder:text-[#9ca3af]"
                        />

                        <button
                          type="button"
                          onClick={() => handleAddStock(product._id)}
                          className="bg-blue-500 hover:bg-blue-600 px-3 rounded-lg font-bold"
                        >
                          Acrescentar
                        </button>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="bg-yellow-500 hover:bg-yellow-600 px-3 py-2 rounded-lg text-black font-black"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(product._id)}
                          className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg font-black"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && <p className="text-[#6b7280] mt-4">Carregando produtos...</p>}

          {!loading && products.length === 0 && (
            <p className="text-[#6b7280] mt-4">Nenhum produto encontrado.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="bg-[#f9fafb] disabled:opacity-50 px-5 py-3 rounded-xl font-bold"
          >
            Página anterior
          </button>

          <span className="text-sm text-[#6b7280]">
            Página {page} de {pagination.totalPages} • {pagination.total} produto(s)
          </span>

          <button
            disabled={page >= pagination.totalPages}
            onClick={() => goToPage(page + 1)}
            className="bg-[#f9fafb] disabled:opacity-50 px-5 py-3 rounded-xl font-bold"
          >
            Próxima página
          </button>
        </div>
      </div>
    </div>
  );
}

export default Products;
