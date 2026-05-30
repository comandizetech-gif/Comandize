import { useEffect, useState } from "react";
import { FaCog } from "react-icons/fa";

const API_URL = "http://localhost:3000/api/catalog-manager";

const days = [
  { key: "domingo", label: "Dom" },
  { key: "segunda", label: "Seg" },
  { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" },
  { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" },
  { key: "sabado", label: "Sáb" },
];

function CatalogManager() {
  const [sections, setSections] = useState([]);
  const [sectionName, setSectionName] = useState("");
  const [search, setSearch] = useState({});
  const [results, setResults] = useState({});
  const [openConfig, setOpenConfig] = useState(null);
  const [configForm, setConfigForm] = useState({});
  const [loadingAction, setLoadingAction] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const loadSections = async () => {
    try {
      const response = await fetch(`${API_URL}/sections`, {
        headers: authHeaders,
      });

      const data = await response.json();
      setSections(Array.isArray(data) ? data : []);
    } catch {
      setMessage("Erro ao carregar categorias do catálogo.");
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const createSection = async () => {
    if (!sectionName.trim()) return;
    if (loadingAction) return;

    setLoadingAction(true);

    try {
      const response = await fetch(`${API_URL}/sections`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: sectionName }),
      });

      const data = await response.json();
      setMessage(data.message || "Categoria criada.");

      if (response.ok) {
        setSectionName("");
        await loadSections();
      }
    } catch {
      setMessage("Erro ao criar categoria.");
    } finally {
      setTimeout(() => setLoadingAction(false), 700);
    }
  };

  const searchProducts = async (sectionId, value) => {
    setSearch({ ...search, [sectionId]: value });

    if (value.length < 2) {
      setResults({ ...results, [sectionId]: [] });
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/products/search?q=${encodeURIComponent(value)}`,
        { headers: authHeaders }
      );

      const data = await response.json();

      setResults({
        ...results,
        [sectionId]: Array.isArray(data) ? data.slice(0, 5) : [],
      });
    } catch {
      setResults({ ...results, [sectionId]: [] });
    }
  };

  const addProduct = async (sectionId, productId) => {
    if (loadingAction) return;

    setLoadingAction(true);

    try {
      const response = await fetch(`${API_URL}/sections/${sectionId}/products`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();
      setMessage(data.message || "Produto adicionado.");

      setSearch({ ...search, [sectionId]: "" });
      setResults({ ...results, [sectionId]: [] });

      await loadSections();
    } catch {
      setMessage("Erro ao adicionar produto.");
    } finally {
      setTimeout(() => setLoadingAction(false), 700);
    }
  };

  const removeProduct = async (sectionId, itemId) => {
    if (loadingAction) return;

    const confirmRemove = window.confirm("Remover produto desta categoria?");
    if (!confirmRemove) return;

    setLoadingAction(true);

    try {
      const response = await fetch(
        `${API_URL}/sections/${sectionId}/items/${itemId}`,
        {
          method: "DELETE",
          headers: authHeaders,
        }
      );

      const data = await response.json();
      setMessage(data.message || "Produto removido.");

      await loadSections();
    } catch {
      setMessage("Erro ao remover produto.");
    } finally {
      setTimeout(() => setLoadingAction(false), 700);
    }
  };

  const deleteSection = async (sectionId) => {
    const confirmDelete = window.confirm(
      "Excluir esta categoria e remover os produtos dela?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/sections/${sectionId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await response.json();
      setMessage(data.message || "Categoria excluída.");
      loadSections();
    } catch {
      setMessage("Erro ao excluir categoria.");
    }
  };

  const openItemConfig = (sectionId, item) => {
    const key = `${sectionId}-${item._id}`;

    setOpenConfig(openConfig === key ? null : key);

    setConfigForm({
      description: item.description || "",
      weightOptions: (item.weightOptions || []).join(", "),
      tags: (item.tags || []).join(", "),
      priority: item.priority || 0,
      availableDays:
        item.availableDays && item.availableDays.length > 0
          ? item.availableDays
          : days.map((day) => day.key),
      visible: item.visible ?? true,
    });
  };

  const updateItemConfig = async (sectionId, itemId) => {
    if (loadingAction) return;

    setLoadingAction(true);

    try {
      const response = await fetch(
        `${API_URL}/sections/${sectionId}/items/${itemId}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(configForm),
        }
      );

      const data = await response.json();
      setMessage(data.message || "Configurações salvas.");

      if (response.ok) {
        setOpenConfig(null);
        await loadSections();
      }
    } catch {
      setMessage("Erro ao salvar configurações.");
    } finally {
      setTimeout(() => setLoadingAction(false), 700);
    }
  };

  const updateVisible = async (sectionId, item, visible) => {
    if (loadingAction) return;

    setLoadingAction(true);

    try {
      const response = await fetch(
        `${API_URL}/sections/${sectionId}/items/${item._id}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ visible }),
        }
      );

      const data = await response.json();
      setMessage(data.message || "Visibilidade atualizada.");

      await loadSections();
    } catch {
      setMessage("Erro ao atualizar visibilidade.");
    } finally {
      setTimeout(() => setLoadingAction(false), 700);
    }
  };

  const toggleDay = (dayKey) => {
    const currentDays = configForm.availableDays || [];

    if (currentDays.includes(dayKey)) {
      setConfigForm({
        ...configForm,
        availableDays: currentDays.filter((day) => day !== dayKey),
      });
    } else {
      setConfigForm({
        ...configForm,
        availableDays: [...currentDays, dayKey],
      });
    }
  };

  return (
    <div className="space-y-6 text-gray-700">
      {message && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-4 text-sm font-semibold shadow-sm">
          {message}
        </div>
      )}

      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <h4 className="text-xl font-black text-orange-500">
            📂 Criar nova categoria
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            Organize os produtos em categorias para aparecerem no catálogo online.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            maxLength={80}
            placeholder="Ex: Carne, Frango, Pizzas, Bebidas"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            className="flex-1 bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />

          <button
            onClick={createSection}
            disabled={loadingAction}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl shadow-md disabled:opacity-50"
          >
            Criar Categoria
          </button>
        </div>
      </div>

      {sections.map((section) => (
        <div
          key={section._id}
          className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h4 className="text-2xl font-black text-orange-500">
                {section.name}
              </h4>
              <p className="text-gray-500 text-sm">
                {section.products.length} produto(s)
              </p>
            </div>

            <button
              onClick={() => deleteSection(section._id)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold w-full sm:w-auto"
            >
              Excluir Categoria
            </button>
          </div>

          <div className="relative mb-5">
            <input
              type="text"
              placeholder="Buscar produto por nome ou SKU..."
              value={search[section._id] || ""}
              onChange={(e) => searchProducts(section._id, e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />

            {results[section._id]?.length > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl">
                {results[section._id].map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addProduct(section._id, product._id)}
                    disabled={loadingAction}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 disabled:opacity-50"
                  >
                    <span className="text-gray-700 font-semibold">
                      {product.name}
                      <small className="block text-gray-500 font-normal">
                        SKU: {product.sku} — {product.measureType}
                      </small>
                    </span>

                    <strong className="text-orange-500">
                      R$ {Number(product.salePrice).toFixed(2)}
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {section.products.map((item) => {
              const product = item.product;
              const configKey = `${section._id}-${item._id}`;

              if (!product) return null;

              return (
                <div
                  key={item._id}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="min-w-0">
                      <h5 className="font-black text-gray-800 truncate">
                        {product.name}
                      </h5>
                      <p className="text-gray-500 text-sm">
                        SKU: {product.sku} — R$ {Number(product.salePrice).toFixed(2)}
                      </p>

                      {item.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <input
                          type="checkbox"
                          checked={item.visible}
                          disabled={loadingAction}
                          onChange={(e) =>
                            updateVisible(section._id, item, e.target.checked)
                          }
                        />
                        Mostrar
                      </label>

                      <button
                        onClick={() => openItemConfig(section._id, item)}
                        className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl flex items-center justify-center"
                      >
                        <FaCog />
                      </button>

                      <button
                        onClick={() => removeProduct(section._id, item._id)}
                        disabled={loadingAction}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  {openConfig === configKey && (
                    <div className="mt-5 border-t border-gray-200 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <textarea
                        maxLength={250}
                        placeholder="Descrição do produto no catálogo"
                        value={configForm.description || ""}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            description: e.target.value,
                          })
                        }
                        className="md:col-span-2 bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />

                      {product.measureType === "KILO" && (
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 font-semibold mb-2">
                            Opções de peso para o cliente escolher
                          </label>

                          <textarea
                            rows={3}
                            placeholder="Digite os pesos separados por vírgula. Ex: 500, 600, 700, 800, 1000"
                            value={configForm.weightOptions || ""}
                            onChange={(e) =>
                              setConfigForm({
                                ...configForm,
                                weightOptions: e.target.value,
                              })
                            }
                            className="bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none w-full resize-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                          />

                          <p className="text-xs text-gray-500 mt-2">
                            Exemplo correto: 500, 600, 700, 800, 1000. No catálogo aparecerá como 500g, 600g, 700g, 800g e 1kg.
                          </p>
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder="Filtros/tags. Ex: carne moida, bovina, promoção"
                        value={configForm.tags || ""}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            tags: e.target.value,
                          })
                        }
                        className="bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />

                      <input
                        type="number"
                        placeholder="Prioridade"
                        value={configForm.priority || 0}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            priority: e.target.value,
                          })
                        }
                        className="bg-white border border-gray-300 rounded-xl p-3 text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />

                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 font-semibold mb-2">
                          Dias que este item aparece no catálogo
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {days.map((day) => (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => toggleDay(day.key)}
                              className={`px-4 py-2 rounded-xl font-bold transition ${
                                configForm.availableDays?.includes(day.key)
                                  ? "bg-orange-500 text-white shadow-sm"
                                  : "bg-white border border-gray-200 text-gray-700 hover:bg-orange-50"
                              }`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => updateItemConfig(section._id, item._id)}
                        disabled={loadingAction}
                        className="md:col-span-2 bg-orange-500 hover:bg-orange-600 text-white font-black p-4 rounded-xl shadow-md disabled:opacity-50"
                      >
                        Salvar Configurações
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {section.products.length === 0 && (
              <p className="text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
                Nenhum produto nesta categoria.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CatalogManager;
