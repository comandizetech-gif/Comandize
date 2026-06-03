import User from "../models/User.js";
import CatalogSection from "../models/CatalogSection.js";
import StoreConfig from "../models/StoreConfig.js";

const dayMap = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado",
};

const todayKeyString = () => new Date().toISOString().slice(0, 10);

const normalizeDomain = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];

const isStoreOpenBySchedule = (schedule) => {
  if (!schedule || !schedule.active) return false;

  const now = new Date();
  const current = now.toTimeString().slice(0, 5);
  const isInsideMainHours = current >= schedule.open && current <= schedule.close;

  if (!isInsideMainHours) return false;

  if (
    schedule.hasLunchBreak &&
    schedule.lunchStart &&
    schedule.lunchEnd &&
    current >= schedule.lunchStart &&
    current <= schedule.lunchEnd
  ) {
    return false;
  }

  return true;
};

const getCatalogOpenStatus = (config, todaySchedule) => {
  const manualIsValidToday =
    config?.manualCatalogStatus &&
    config.manualCatalogStatus !== "AUTO" &&
    config.manualCatalogDate === todayKeyString();

  if (manualIsValidToday && config.manualCatalogStatus === "OPEN") {
    return { isOpen: true, mode: "OPEN", label: "Aberto manualmente pelo painel até virar o dia" };
  }

  if (manualIsValidToday && config.manualCatalogStatus === "CLOSED") {
    return { isOpen: false, mode: "CLOSED", label: "Fechado manualmente pelo painel até virar o dia" };
  }

  return {
    isOpen: isStoreOpenBySchedule(todaySchedule),
    mode: "AUTO",
    label: "Status calculado pelo horário de funcionamento",
  };
};

export const getPublicCatalog = async (req, res) => {
  try {
    const lookup = String(req.params.catalogUrl || "").trim().toLowerCase();
    const normalizedDomain = normalizeDomain(lookup);
    const today = dayMap[new Date().getDay()];

    const store = await User.findOne({
      active: true,
      $or: [
        { catalogUrl: lookup },
        { customDomain: normalizedDomain },
        { customDomain: `www.${normalizedDomain}` },
      ],
    }).select("storeName catalogUrl customDomain phone");

    if (!store) {
      return res.status(404).json({ message: "Catálogo não encontrado ou loja inativa." });
    }

    const config = await StoreConfig.findOne({ user: store._id });

    if (config?.manualCatalogStatus !== "AUTO" && config.manualCatalogDate !== todayKeyString()) {
      config.manualCatalogStatus = "AUTO";
      config.manualCatalogDate = "";
      await config.save();
    }

    const todaySchedule = config?.schedules?.[today];
    const catalogStatus = getCatalogOpenStatus(config, todaySchedule);

    // IMPORTANTE:
    // A ordem do catálogo público precisa seguir a mesma ordem definida no CatalogManager.
    // Antes estava por createdAt e ignorava os botões Subir/Descer.
    const sections = await CatalogSection.find({ user: store._id })
      .populate("products.product")
      .sort({ order: 1, createdAt: 1 });

    const visibleSections = sections
      .map((section) => {
        const products = section.products
          .filter((item) => item.visible && item.product && item.availableDays.includes(today))
          .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

        return {
          _id: section._id,
          name: section.name,
          order: section.order || 0,
          displayMode: section.displayMode,
          sectionBannerImage: section.sectionBannerImage,
          products,
        };
      })
      .filter((section) => section.products.length > 0);

    return res.json({
      store,
      config,
      isOpen: catalogStatus.isOpen,
      catalogStatus,
      today,
      todaySchedule,
      sections: visibleSections,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao carregar catálogo.", error: error.message });
  }
};
