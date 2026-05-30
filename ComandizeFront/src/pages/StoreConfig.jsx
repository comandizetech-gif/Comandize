import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000/api/store-config";

const days = [
  { key: "domingo", label: "Domingo" },
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
];

const defaultSchedule = {
  active: true,
  open: "08:00",
  lunchStart: "",
  lunchEnd: "",
  close: "18:00",
  hasLunchBreak: false,
};

function StoreConfig() {
  const [message, setMessage] = useState("");
  const [bannerImage, setBannerImage] = useState(null);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    address: "",
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

  const loadConfig = async () => {
    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    setForm({
      title: data.title || "",
      subtitle: data.subtitle || "",
      address: data.address || "",
      schedules: data.schedules || form.schedules,
    });
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const updateSchedule = (day, field, value) => {
    setForm({
      ...form,
      schedules: {
        ...form.schedules,
        [day]: {
          ...form.schedules[day],
          [field]: value,
        },
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const formData = new FormData();

    formData.append("title", form.title);
    formData.append("subtitle", form.subtitle);
    formData.append("address", form.address);
    formData.append("schedules", JSON.stringify(form.schedules));

    if (bannerImage) {
      formData.append("bannerImage", bannerImage);
    }

    const response = await fetch(API_URL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    setMessage(data.message);

    if (response.ok) {
      loadConfig();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-[#1f2937]">
      {message && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          {message}
        </div>
      )}

      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
        <h3 className="text-2xl font-black text-[#ff9811] mb-4">
          Configuração do Catálogo Público
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            maxLength={80}
            placeholder="Texto maior sobre o banner. Ex: Carnes Nobres"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
          />

          <input
            maxLength={120}
            placeholder="Subtítulo sobre o banner. Ex: Carnes frescas todos os dias"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
          />

          <input
            maxLength={160}
            placeholder="Endereço exibido abaixo da imagem do banner"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="md:col-span-2 bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-3 outline-none"
          />

          <label className="md:col-span-2 bg-[#f8fafc] border-2 border-dashed border-[#d1d5db] hover:border-[#ff9811] rounded-2xl p-6 shadow-sm cursor-pointer transition text-center">
            <span className="block text-3xl mb-2">🖼️</span>
            <strong className="block text-[#ff9811]">
              Adicionar imagem do banner
            </strong>
            <small className="block text-slate-500 mt-1">
              Clique para escolher uma imagem. Tamanho máximo: 5MB.
            </small>
            {bannerImage && (
              <span className="block text-green-400 text-sm font-bold mt-3">
                Imagem selecionada: {bannerImage.name}
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];

                if (file && file.size > 5 * 1024 * 1024) {
                  alert("Imagem máxima permitida: 5MB.");
                  return;
                }

                setBannerImage(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
        <h3 className="text-2xl font-black text-[#ff9811] mb-4">
          Horários de Funcionamento
        </h3>

        <div className="space-y-4">
          {days.map((day) => {
            const schedule = form.schedules[day.key] || defaultSchedule;

            return (
              <div
                key={day.key}
                className="bg-[#f8fafc] border border-[#d1d5db] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <strong>{day.label}</strong>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={schedule.active}
                      onChange={(e) =>
                        updateSchedule(day.key, "active", e.target.checked)
                      }
                    />
                    Aberto nesse dia
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input
                    type="time"
                    value={schedule.open || ""}
                    onChange={(e) =>
                      updateSchedule(day.key, "open", e.target.value)
                    }
                    className="bg-white border border-[#d1d5db] rounded-xl p-3"
                  />

                  <label className="flex items-center gap-2 bg-white border border-[#d1d5db] rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={schedule.hasLunchBreak}
                      onChange={(e) =>
                        updateSchedule(
                          day.key,
                          "hasLunchBreak",
                          e.target.checked
                        )
                      }
                    />
                    Fecha almoço
                  </label>

                  <input
                    type="time"
                    disabled={!schedule.hasLunchBreak}
                    value={schedule.lunchStart || ""}
                    onChange={(e) =>
                      updateSchedule(day.key, "lunchStart", e.target.value)
                    }
                    className="bg-white border border-[#d1d5db] rounded-xl p-3 disabled:opacity-40"
                  />

                  <input
                    type="time"
                    disabled={!schedule.hasLunchBreak}
                    value={schedule.lunchEnd || ""}
                    onChange={(e) =>
                      updateSchedule(day.key, "lunchEnd", e.target.value)
                    }
                    className="bg-white border border-[#d1d5db] rounded-xl p-3 disabled:opacity-40"
                  />

                  <input
                    type="time"
                    value={schedule.close || ""}
                    onChange={(e) =>
                      updateSchedule(day.key, "close", e.target.value)
                    }
                    className="bg-white border border-[#d1d5db] rounded-xl p-3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs text-slate-500 mt-2">
                  <span>Abertura</span>
                  <span>Almoço?</span>
                  <span>Início almoço</span>
                  <span>Fim almoço</span>
                  <span>Fechamento</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="w-full bg-[#ff9811] hover:bg-[#e88708] text-white font-black p-5 rounded-2xl">
        Salvar Configurações
      </button>
    </form>
  );
}

export default StoreConfig;