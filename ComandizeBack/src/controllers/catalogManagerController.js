import CatalogSection from "../models/CatalogSection.js";
import Product from "../models/Product.js";

const cutOptions = [
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

const normalizeTextArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeCutArray = (value) => {
  const values = normalizeTextArray(value).filter((item) => cutOptions.includes(item));

  if (values.length === 0 || values.includes("Nenhum")) {
    return ["Nenhum"];
  }

  return [...new Set(values)];
};

const normalizeNumberArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(Number).filter((item) => !Number.isNaN(item) && item > 0);
  }

  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item) && item > 0);
};

export const listSections = async (req, res) => {
  try {
    const sections = await CatalogSection.find({ user: req.user._id })
      .populate("products.product")
      .sort({ createdAt: 1 });

    return res.json(sections);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao listar faixas.",
      error: error.message,
    });
  }
};

export const createSection = async (req, res) => {
  try {
    const name = req.body.name?.trim();

    if (!name || name.length > 80) {
      return res.status(400).json({ message: "Nome da faixa inválido." });
    }

    const exists = await CatalogSection.findOne({
      user: req.user._id,
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (exists) {
      return res.status(400).json({ message: "Essa faixa já existe." });
    }

    const section = await CatalogSection.create({
      user: req.user._id,
      name,
      products: [],
    });

    return res.status(201).json({
      message: "Faixa criada com sucesso.",
      section,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao criar faixa.",
      error: error.message,
    });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const q = req.query.q?.trim();

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const products = await Product.find({
      user: req.user._id,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
      ],
    })
      .limit(5)
      .select("name sku salePrice productType measureType image");

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
    const { sectionId } = req.params;
    const { productId } = req.body;

    const section = await CatalogSection.findOne({
      _id: sectionId,
      user: req.user._id,
    });

    if (!section) {
      return res.status(404).json({ message: "Faixa não encontrada." });
    }

    const product = await Product.findOne({
      _id: productId,
      user: req.user._id,
    });

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado." });
    }

    const alreadyExists = section.products.some(
      (item) => item.product.toString() === productId
    );

    if (alreadyExists) {
      return res.status(400).json({ message: "Produto já está nessa faixa." });
    }

    section.products.push({
      product: productId,
      visible: true,
      description: "",
      weightOptions: product.measureType === "KILO" ? [500, 600, 700, 1000] : [],
      cuts: ["Nenhum"],
      priority: 0,
      availableDays: [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
      ],
    });

    await section.save();

    return res.json({ message: "Produto adicionado à faixa." });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao adicionar produto.",
      error: error.message,
    });
  }
};

export const updateCatalogItem = async (req, res) => {
  try {
    const { sectionId, itemId } = req.params;

    const section = await CatalogSection.findOne({
      _id: sectionId,
      user: req.user._id,
    });

    if (!section) {
      return res.status(404).json({ message: "Faixa não encontrada." });
    }

    const item = section.products.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item não encontrado." });
    }

    if (typeof req.body.visible === "boolean") {
      item.visible = req.body.visible;
    }

    if (req.body.description !== undefined) {
      item.description = String(req.body.description).slice(0, 250);
    }

    if (req.body.weightOptions !== undefined) {
      item.weightOptions = normalizeNumberArray(req.body.weightOptions);
    }

    if (req.body.cuts !== undefined) {
      item.cuts = normalizeCutArray(req.body.cuts);
    }

    if (req.body.priority !== undefined) {
      item.priority = Number(req.body.priority) || 0;
    }

    if (req.body.availableDays !== undefined) {
      item.availableDays = normalizeTextArray(req.body.availableDays);
    }

    await section.save();

    return res.json({
      message: "Item do catálogo atualizado.",
      item,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao atualizar item.",
      error: error.message,
    });
  }
};

export const removeProductFromSection = async (req, res) => {
  try {
    const { sectionId, itemId } = req.params;

    const section = await CatalogSection.findOne({
      _id: sectionId,
      user: req.user._id,
    });

    if (!section) {
      return res.status(404).json({ message: "Faixa não encontrada." });
    }

    section.products = section.products.filter(
      (item) => item._id.toString() !== itemId
    );

    await section.save();

    return res.json({ message: "Produto removido da faixa." });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao remover produto.",
      error: error.message,
    });
  }
};

export const deleteSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    await CatalogSection.findOneAndDelete({
      _id: sectionId,
      user: req.user._id,
    });

    return res.json({ message: "Faixa excluída." });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao excluir faixa.",
      error: error.message,
    });
  }
};