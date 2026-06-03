import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import Product from "../models/Product.js";

const baseTypes = ["carne", "frango", "linguiças", "pizza", "lanches", "insumo"];
const MAX_PRODUCTS_PER_STORE = 5000;
const PRODUCT_CREATE_LIMIT = 20;
const PRODUCT_CREATE_WINDOW_MS = 60 * 1000;

const createBuckets = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "..", "uploads");
const PRODUCT_UPLOAD_DIR = path.join(UPLOAD_ROOT, "products");

function ensureProductUploadDir() {
  fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
}

function slugify(value = "produto") {
  return String(value || "produto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60) || "produto";
}

function deleteLocalImage(imagePath = "") {
  try {
    if (!imagePath || !imagePath.startsWith("/uploads/products/")) return;

    const fileName = path.basename(imagePath);
    const absolutePath = path.join(PRODUCT_UPLOAD_DIR, fileName);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch {
    // Não trava a operação se falhar ao apagar arquivo antigo.
  }
}

function cleanString(value = "", limit = 80) {
  return String(value || "").trim().slice(0, limit);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function parseRecipeItems(body) {
  if (!toBoolean(body.recipeEnabled)) return [];

  let items = [];

  if (body.recipeItems) {
    try {
      items =
        typeof body.recipeItems === "string"
          ? JSON.parse(body.recipeItems)
          : body.recipeItems;
    } catch {
      items = [];
    }
  }

  // Compatibilidade com a versão antiga de 1 item só.
  if ((!Array.isArray(items) || items.length === 0) && body.recipeSourceProduct) {
    items = [
      {
        product: body.recipeSourceProduct,
        quantity: body.recipeDeductQuantity || 1,
      },
    ];
  }

  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      product: cleanString(item.product || "", 80),
      quantity: Math.max(0.001, toNumber(item.quantity, 1)),
    }))
    .filter((item) => item.product && item.quantity > 0)
    .slice(0, 30);
}

function checkProductCreateLimit(userId) {
  const key = String(userId);
  const now = Date.now();
  const current = createBuckets.get(key) || [];
  const recent = current.filter((time) => now - time < PRODUCT_CREATE_WINDOW_MS);

  if (recent.length >= PRODUCT_CREATE_LIMIT) {
    createBuckets.set(key, recent);
    return false;
  }

  recent.push(now);
  createBuckets.set(key, recent);
  return true;
}

async function saveProductImage(file, productName = "produto") {
  if (!file) return "";

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error("Formato de imagem inválido. Use JPEG, PNG ou WEBP.");
    error.statusCode = 400;
    throw error;
  }

  ensureProductUploadDir();

  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${slugify(productName)}.jpg`;
  const absolutePath = path.join(PRODUCT_UPLOAD_DIR, fileName);

  await sharp(file.buffer)
    .rotate()
    .resize({ width: 700, withoutEnlargement: true })
    .jpeg({ quality: 65, mozjpeg: true })
    .toFile(absolutePath);

  return `/uploads/products/${fileName}`;
}

function buildProductPayload(body, { editing = false } = {}) {
  const recipeEnabled = toBoolean(body.recipeEnabled);
  const recipeItems = recipeEnabled ? parseRecipeItems(body) : [];

  const payload = {
    name: cleanString(body.name, 80),
    sku: cleanString(body.sku, 80),
    barcode: cleanString(body.barcode, 80),
    companyName: cleanString(body.companyName, 80),
    measureType: ["UNIDADE", "KILO"].includes(body.measureType) ? body.measureType : "UNIDADE",
    productType: cleanString(body.productType, 80),
    showInCatalog: toBoolean(body.showInCatalog),
    catalogSection: cleanString(body.catalogSection, 80),
    entryPrice: Math.max(0, toNumber(body.entryPrice, 0)),
    salePrice: Math.max(0, toNumber(body.salePrice, 0)),
    clientPrice: toNullableNumber(body.clientPrice),
    cashbackPercent: Math.min(100, Math.max(0, toNumber(body.cashbackPercent, 0))),
    lossPercent: Math.min(100, Math.max(0, toNumber(body.lossPercent, 0))),
    promotionalPrice: toNullableNumber(body.promotionalPrice),
    stock: Math.max(0, toNumber(body.stock, 0)),
    active: body.active === undefined ? true : toBoolean(body.active),
    priority: toNumber(body.priority, 0),
    recipeEnabled,
    recipeItems,
    // Campos antigos ficam preenchidos só por compatibilidade.
    recipeSourceProduct: recipeItems[0]?.product || null,
    recipeDeductQuantity: recipeItems[0]?.quantity || 1,
  };

  if (editing && body.stock === undefined) delete payload.stock;

  return payload;
}

async function validateProductPayload(payload, userId, currentProductId = null) {
  if (!payload.name || !payload.sku || !payload.productType) {
    return "Preencha nome, SKU e tipo do produto.";
  }

  if (payload.entryPrice <= 0 || payload.salePrice <= 0) {
    return "Preço de entrada e preço de venda precisam ser maiores que zero.";
  }

  const skuExists = await Product.findOne({
    user: userId,
    sku: payload.sku,
    ...(currentProductId ? { _id: { $ne: currentProductId } } : {}),
  });

  if (skuExists) return "Já existe um produto com esse SKU.";

  const escapedName = escapeRegex(payload.name);
  const nameExists = await Product.findOne({
    user: userId,
    name: { $regex: `^${escapedName}$`, $options: "i" },
    ...(currentProductId ? { _id: { $ne: currentProductId } } : {}),
  });

  if (nameExists) return "Já existe um produto com esse nome.";

  if (payload.recipeEnabled) {
    if (!payload.recipeItems.length) {
      return "Adicione pelo menos um produto origem da receita.";
    }

    const repeated = new Set();

    for (const item of payload.recipeItems) {
      if (currentProductId && String(item.product) === String(currentProductId)) {
        return "O produto não pode usar ele mesmo como item da receita.";
      }

      if (repeated.has(String(item.product))) {
        return "O mesmo produto origem foi adicionado mais de uma vez na receita.";
      }

      repeated.add(String(item.product));

      const source = await Product.findOne({ _id: item.product, user: userId });

      if (!source) return "Produto origem da receita não encontrado.";
    }
  }

  return null;
}

export const getProductsSyncStatus = async (req, res) => {
  try {
    const [summary] = await Product.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          lastUpdatedAt: { $max: "$updatedAt" },
        },
      },
    ]);

    const total = summary?.total || 0;
    const lastUpdatedAt = summary?.lastUpdatedAt
      ? new Date(summary.lastUpdatedAt).toISOString()
      : "empty";

    return res.json({
      total,
      lastUpdatedAt,
      version: `${total}-${lastUpdatedAt}`,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao verificar atualização dos produtos.",
      error: error.message,
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    if (!checkProductCreateLimit(req.user._id)) {
      return res.status(429).json({
        message: "Limite atingido. Você pode cadastrar no máximo 20 produtos por minuto.",
      });
    }

    const totalProducts = await Product.countDocuments({ user: req.user._id });

    if (totalProducts >= MAX_PRODUCTS_PER_STORE) {
      return res.status(403).json({
        message: `Limite máximo de ${MAX_PRODUCTS_PER_STORE} produtos atingido para esta loja.`,
      });
    }

    const payload = buildProductPayload(req.body);
    const validationError = await validateProductPayload(payload, req.user._id);

    if (validationError) return res.status(400).json({ message: validationError });

    const imagePath = await saveProductImage(req.file, payload.name);

    const product = await Product.create({
      user: req.user._id,
      ...payload,
      image: imagePath,
    });

    await product.populate([
      { path: "recipeItems.product", select: "name sku stock measureType" },
      { path: "recipeSourceProduct", select: "name sku stock measureType" },
    ]);

    return res.status(201).json({ message: "Produto cadastrado com sucesso.", product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Já existe um produto com esse SKU." });
    }

    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Erro ao cadastrar produto.",
      error: error.message,
    });
  }
};

export const listProducts = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortDir = "desc",
      page = 1,
      limit = 30,
      all = "false",
    } = req.query;

    const filter = { user: req.user._id };
    const term = cleanString(search, 80);

    if (term) {
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { sku: { $regex: term, $options: "i" } },
        { barcode: { $regex: term, $options: "i" } },
        { productType: { $regex: term, $options: "i" } },
      ];
    }

    const sortMap = {
      name: { name: sortDir === "asc" ? 1 : -1 },
      stock: { stock: sortDir === "asc" ? 1 : -1, name: 1 },
      margin: { marginValue: sortDir === "asc" ? 1 : -1, name: 1 },
      createdAt: { createdAt: sortDir === "asc" ? 1 : -1 },
    };

    const populateOptions = [
      { path: "recipeItems.product", select: "name sku stock measureType" },
      { path: "recipeSourceProduct", select: "name sku stock measureType" },
    ];

    if (all === "true") {
      const perPageForAll = Math.min(5, Math.max(1, Number(limit) || 5));

      const products = await Product.find(filter)
        .populate(populateOptions)
        .sort({ name: 1 })
        .limit(perPageForAll)
        .select("name sku stock measureType salePrice entryPrice recipeEnabled recipeItems recipeSourceProduct recipeDeductQuantity");

      return res.json(products);
    }

    const currentPage = Math.max(1, Number(page));
    const perPage = Math.min(30, Math.max(1, Number(limit)));

    let products;
    let total;

    if (sortBy === "margin") {
      const aggregate = [
        { $match: filter },
        {
          $addFields: {
            marginValue: {
              $subtract: [{ $ifNull: ["$salePrice", 0] }, { $ifNull: ["$entryPrice", 0] }],
            },
          },
        },
        { $sort: sortMap.margin },
        { $skip: (currentPage - 1) * perPage },
        { $limit: perPage },
      ];

      const [items, count] = await Promise.all([
        Product.aggregate(aggregate),
        Product.countDocuments(filter),
      ]);

      products = await Product.populate(items, populateOptions);
      total = count;
    } else {
      total = await Product.countDocuments(filter);
      products = await Product.find(filter)
        .populate(populateOptions)
        .sort(sortMap[sortBy] || sortMap.createdAt)
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    }

    return res.json({
      products,
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage) || 1,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar produtos.", error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user._id });

    if (!product) return res.status(404).json({ message: "Produto não encontrado." });

    const payload = buildProductPayload(req.body, { editing: true });
    const validationError = await validateProductPayload(payload, req.user._id, product._id);

    if (validationError) return res.status(400).json({ message: validationError });

    Object.keys(payload).forEach((key) => {
      product[key] = payload[key];
    });

    if (req.file) {
      const oldImage = product.image;
      product.image = await saveProductImage(req.file, payload.name || product.name);
      deleteLocalImage(oldImage);
    }

    await product.save();
    await product.populate([
      { path: "recipeItems.product", select: "name sku stock measureType" },
      { path: "recipeSourceProduct", select: "name sku stock measureType" },
    ]);

    return res.json({ message: "Produto atualizado com sucesso.", product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Já existe um produto com esse SKU." });
    }

    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Erro ao atualizar produto.",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const usedAsRecipe = await Product.findOne({
      user: req.user._id,
      $or: [
        { recipeSourceProduct: req.params.id },
        { "recipeItems.product": req.params.id },
      ],
    });

    if (usedAsRecipe) {
      return res.status(400).json({
        message: "Este produto está sendo usado como origem de receita em outro produto.",
      });
    }

    const product = await Product.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!product) return res.status(404).json({ message: "Produto não encontrado." });

    deleteLocalImage(product.image);

    return res.json({ message: "Produto excluído com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao excluir produto.", error: error.message });
  }
};

export const addStock = async (req, res) => {
  try {
    const quantity = Math.max(0, toNumber(req.body.quantity, 0));

    if (quantity <= 0) return res.status(400).json({ message: "Informe uma quantidade válida." });

    const product = await Product.findOne({ _id: req.params.id, user: req.user._id });

    if (!product) return res.status(404).json({ message: "Produto não encontrado." });

    product.stock += quantity;
    await product.save();

    return res.json({ message: "Estoque acrescentado com sucesso.", product });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao acrescentar estoque.", error: error.message });
  }
};

export const getProductTypes = async (req, res) => {
  try {
    const userTypes = await Product.distinct("productType", { user: req.user._id });
    const types = [...new Set([...baseTypes, ...userTypes])];
    return res.json(types);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar tipos.", error: error.message });
  }
};
