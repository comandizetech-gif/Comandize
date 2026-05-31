import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import StoreConfig from "../models/StoreConfig.js";

const dayKeys = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const todayKeyString = () => new Date().toISOString().slice(0, 10);

const UPLOAD_DIR = path.resolve("uploads", "store-banners");
const PUBLIC_UPLOAD_PREFIX = "/uploads/store-banners";

function safeId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
}

function isLocalUpload(value = "") {
  return String(value).startsWith(PUBLIC_UPLOAD_PREFIX);
}

async function removeOldUploadIfNeeded(oldPath) {
  try {
    if (!isLocalUpload(oldPath)) return;
    const filename = path.basename(oldPath);
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // Ignora se o arquivo antigo não existir.
  }
}

async function saveBannerImage(file, userId) {
  if (!file) return "";

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error("Formato de imagem inválido. Use JPEG, PNG ou WEBP.");
    error.statusCode = 400;
    throw error;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${safeId(userId)}-${Date.now()}.jpg`;
  const absolutePath = path.join(UPLOAD_DIR, filename);

  await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toFile(absolutePath);

  return `${PUBLIC_UPLOAD_PREFIX}/${filename}`;
}

function getScheduleStatus(config) {
  if (!config) return false;

  const manualIsValidToday =
    config.manualCatalogStatus &&
    config.manualCatalogStatus !== "AUTO" &&
    config.manualCatalogDate === todayKeyString();

  if (manualIsValidToday && config.manualCatalogStatus === "OPEN") return true;
  if (manualIsValidToday && config.manualCatalogStatus === "CLOSED") return false;

  const now = new Date();
  const dayKey = dayKeys[now.getDay()];
  const schedule = config.schedules?.[dayKey];

  if (!schedule?.active) return false;

  const current = now.toTimeString().slice(0, 5);
  const isInsideMainTime = current >= schedule.open && current <= schedule.close;
  const isLunchClosed =
    schedule.hasLunchBreak &&
    schedule.lunchStart &&
    schedule.lunchEnd &&
    current >= schedule.lunchStart &&
    current <= schedule.lunchEnd;

  return isInsideMainTime && !isLunchClosed;
}

function getEffectiveManualStatus(config) {
  if (!config) return "AUTO";

  const manualIsValidToday =
    config.manualCatalogStatus !== "AUTO" &&
    config.manualCatalogDate === todayKeyString();

  return manualIsValidToday ? config.manualCatalogStatus : "AUTO";
}

async function ensureConfig(req) {
  let config = await StoreConfig.findOne({ user: req.user._id });

  if (!config) {
    config = await StoreConfig.create({
      user: req.user._id,
      title: req.user.storeName,
      subtitle: "Cardápio Online",
    });
  }

  if (config.manualCatalogStatus !== "AUTO" && config.manualCatalogDate !== todayKeyString()) {
    config.manualCatalogStatus = "AUTO";
    config.manualCatalogDate = "";
    await config.save();
  }

  return config;
}

export const getMyStoreConfig = async (req, res) => {
  try {
    const config = await ensureConfig(req);
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar configurações.", error: error.message });
  }
};

export const getMyCatalogStatus = async (req, res) => {
  try {
    const config = await ensureConfig(req);
    const manualCatalogStatus = getEffectiveManualStatus(config);

    return res.json({
      isOpen: getScheduleStatus(config),
      manualCatalogStatus,
      manualCatalogDate: config.manualCatalogDate || "",
      message:
        manualCatalogStatus === "AUTO"
          ? "Status calculado pelo horário de funcionamento."
          : "Status definido manualmente pelo painel somente para hoje.",
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar status do catálogo.", error: error.message });
  }
};

export const updateCatalogStatus = async (req, res) => {
  try {
    const { manualCatalogStatus } = req.body;
    const allowed = ["AUTO", "OPEN", "CLOSED"];

    if (!allowed.includes(manualCatalogStatus)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    const config = await StoreConfig.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          manualCatalogStatus,
          manualCatalogDate: manualCatalogStatus === "AUTO" ? "" : todayKeyString(),
          title: req.user.storeName,
        },
      },
      { new: true, upsert: true }
    );

    return res.json({
      message:
        manualCatalogStatus === "OPEN"
          ? "Catálogo aberto manualmente até virar o dia."
          : manualCatalogStatus === "CLOSED"
          ? "Catálogo fechado manualmente até virar o dia."
          : "Catálogo voltou para modo automático.",
      isOpen: getScheduleStatus(config),
      manualCatalogStatus: getEffectiveManualStatus(config),
      manualCatalogDate: config.manualCatalogDate || "",
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar status do catálogo.", error: error.message });
  }
};

export const updateMyStoreConfig = async (req, res) => {
  try {
    const { title, subtitle, address, schedules, manualCatalogStatus } = req.body;
    const currentConfig = await StoreConfig.findOne({ user: req.user._id });

    const updateData = {
      title: String(title || "").slice(0, 80),
      subtitle: String(subtitle || "").slice(0, 120),
      address: String(address || "").slice(0, 160),
    };

    if (["AUTO", "OPEN", "CLOSED"].includes(manualCatalogStatus)) {
      updateData.manualCatalogStatus = manualCatalogStatus;
      updateData.manualCatalogDate = manualCatalogStatus === "AUTO" ? "" : todayKeyString();
    }

    if (schedules) {
      updateData.schedules = typeof schedules === "string" ? JSON.parse(schedules) : schedules;
    }

    if (req.file) {
      const newBannerPath = await saveBannerImage(req.file, req.user._id);
      updateData.bannerImage = newBannerPath;
      await removeOldUploadIfNeeded(currentConfig?.bannerImage);
    }

    const config = await StoreConfig.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, upsert: true }
    );

    return res.json({ message: "Configurações atualizadas com sucesso.", config });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Erro ao atualizar configurações.",
      error: error.message,
    });
  }
};
