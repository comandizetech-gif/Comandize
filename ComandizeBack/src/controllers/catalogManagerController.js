import CatalogSection from "../models/CatalogSection.js";
import Product from "../models/Product.js";

const validDays = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

const validCuts = [
  "Nenhum",
  "Bife",
  "Moida",
  "Picadinho",
  "Assado",
  "Congelado",
  "Strogonof",
  "Corte Grelha",
  "Quente",
  "Gelado",
];

const validDisplayModes = ["NORMAL", "CAROUSEL"];

const getUserId = (req) => req.user?._id || req.user?.id;

const normalizeWeightOptions = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(Number)
      .filter((number) => Number.isFinite(number) && number > 0);
  }

  return String(value || "")
    .split(",")
    .map((item) => Number(String(item).trim()))
    .filter((number) => Number.isFinite(number) && number > 0);
};

const normalizeCuts = (value) => {
  const cuts = Array.isArray(value) ? value : [value];
  const filtered = cuts.filter((cut) => validCuts.includes(cut));

  if (!filtered.length) return ["Nenhum"];

  if (filtered.includes("Nenhum") && filtered.length > 1) {
    return filtered.filter((cut) => cut !== "Nenhum");
  }

  return filtered;
};

const normalizeDays = (value) => {
  const days = Array.isArray(value) ? value : [];
  const filtered = days.filter((day) => validDays.includes(day));

  return filtered.length ? filtered : validDays;
};

const normalizeDisplayMode = (value) => {
  const mode = String(value || "NORMAL").toUpperCase();
  return validDisplayModes.includes(mode) ? mode : "NORMAL";
};

const normalizeImage = (value) => {
  const image = String(value || "").trim();
  return image.length > 0 ? image : "";
};

const normalizeSectionOrders = async (userId) => {
  const sections = await CatalogSection.find({ user: userId }).sort({
    order: 1,
    createdAt: 1,
  });

  for (let index = 0; index < sections.length; index += 1) {
    if (sections[index].order !== index) {
      sections[index].order = index;
      await sections[index].save();
    }
  }

  return sections;
};


export const listSections = async (req, res) => {
  try {
    const userId = getUserId(req);

    const sections = await CatalogSection.find({ user: userId })
      .populate("products.product")
      .sort({ order: 1, createdAt: 1 });

    return res.json(sections);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao listar categorias.",
      error: error.message,
    });
  }
};

export const createSection = async (req, res) => {
  try {
    const userId = getUserId(req);
    const name = String(req.body.name || "").trim();
    const displayMode = normalizeDisplayMode(req.body.displayMode);

    if (!name) {
      return res.status(400).json({ message: "Informe o nome da categoria." });
    }

    const lastSection = await CatalogSection.findOne({ user: userId })
      .sort({ order: -1, createdAt: -1 })
      .select("order");

    const section = await CatalogSection.create({
      user: userId,
      name,
      displayMode,
      order: Number(lastSection?.order || 0) + 1,
      sectionBannerImage: "",
      products: [],
    });

    return res.status(201).json({
      message: "Categoria criada com sucesso.",
      section,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao criar categoria.",
      error: error.message,
    });
  }
};

export const updateSectionDisplayMode = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sectionId } = req.params;
    const displayMode = normalizeDisplayMode(req.body.displayMode);

    const section = await CatalogSection.findOneAndUpdate(
      { _id: sectionId, user: userId },
      { displayMode },
      { new: true }
    ).populate("products.product");

    if (!section) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    return res.json({
      message:
        displayMode === "CAROUSEL"
          ? "Categoria alterada para carrossel lateral."
          : "Categoria alterada para faixa normal.",
      section,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao alterar modo da categoria.",
      error: error.message,
    });
  }
};


export const updateSectionBanner = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sectionId } = req.params;
    const sectionBannerImage = normalizeImage(req.body.sectionBannerImage);

    const section = await CatalogSection.findOneAndUpdate(
      { _id: sectionId, user: userId },
      { sectionBannerImage },
      { new: true }
    ).populate("products.product");

    if (!section) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    return res.json({
      message: sectionBannerImage
        ? "Banner promocional da faixa salvo."
        : "Banner promocional da faixa removido.",
      section,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao salvar banner promocional da faixa.",
      error: error.message,
    });
  }
};

export const moveSection = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sectionId } = req.params;
    const direction = req.body.direction === "down" ? "down" : "up";

    const sections = await normalizeSectionOrders(userId);
    const currentIndex = sections.findIndex(
      (section) => String(section._id) === String(sectionId)
    );

    if (currentIndex === -1) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= sections.length) {
      return res.json({
        message:
          direction === "up"
            ? "Esta faixa já está no topo."
            : "Esta faixa já está no final.",
      });
    }

    const currentSection = sections[currentIndex];
    const nextSection = sections[nextIndex];

    const currentOrder = currentSection.order;
    currentSection.order = nextSection.order;
    nextSection.order = currentOrder;

    await currentSection.save();
    await nextSection.save();

    return res.json({
      message:
        direction === "up"
          ? "Faixa movida para cima."
          : "Faixa movida para baixo.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao mover faixa.",
      error: error.message,
    });
  }
};

export const deleteSection = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sectionId } = req.params;

    const deleted = await CatalogSection.findOneAndDelete({
      _id: sectionId,
      user: userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    return res.json({ message: "Categoria excluída com sucesso." });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao excluir categoria.",
      error: error.message,
    });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const userId = getUserId(req);
    const q = String(req.query.q || "").trim();

    if (q.length < 2) return res.json([]);

    const products = await Product.find({
      user: userId,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
      ],
    })
      .select("name sku measureType salePrice clientPrice image")
      .limit(10)
      .sort({ name: 1 });

    return res.json(products);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar produtos.",
      error: error.message,
    });
  }
};

export const addProductToSection = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sectionId } = req.params;
    const { productId } = req.body;

    const product = await Product.findOne({ _id: productId, user: userId });

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado." });
    }

    const section = await CatalogSection.findOne({
      _id: sectionId,
      user: userId,
    });

    if (!section) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    const alreadyAdded = section.products.some(
      (item) => String(item.product) === String(productId)
    );

    if (alreadyAdded) {
      return res.status(400).json({
        message: "Este produto já está nesta categoria.",
      });
    }

    section.products.push({ product: productId });
    await section.save();

    return res.status(201).json({
      message: "Produto adicionado ao catálogo.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao adicionar produto.",
      error: error.message,
    });
  }
};

export const updateCatalogItem = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sectionId, itemId } = req.params;

    const section = await CatalogSection.findOne({
      _id: sectionId,
      user: userId,
    });

    if (!section) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    const item = section.products.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item não encontrado." });
    }

    if (typeof req.body.visible === "boolean") {
      item.visible = req.body.visible;
    }

    if (req.body.description !== undefined) {
      item.description = String(req.body.description || "")
        .trim()
        .slice(0, 250);
    }

    if (req.body.weightOptions !== undefined) {
      item.weightOptions = normalizeWeightOptions(req.body.weightOptions);
    }

    if (req.body.cuts !== undefined) {
      item.cuts = normalizeCuts(req.body.cuts);
    }

    if (req.body.priority !== undefined) {
      item.priority = Number(req.body.priority || 0);
    }

    if (req.body.availableDays !== undefined) {
      item.availableDays = normalizeDays(req.body.availableDays);
    }

    await section.save();

    return res.json({ message: "Configurações salvas com sucesso." });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao salvar configurações.",
      error: error.message,
    });
  }
};

export const removeProductFromSection = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sectionId, itemId } = req.params;

    const section = await CatalogSection.findOne({
      _id: sectionId,
      user: userId,
    });

    if (!section) {
      return res.status(404).json({ message: "Categoria não encontrada." });
    }

    const item = section.products.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item não encontrado." });
    }

    item.deleteOne();
    await section.save();

    return res.json({ message: "Produto removido da categoria." });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao remover produto.",
      error: error.message,
    });
  }
};
