import DeliveryPerson from "../models/DeliveryPerson.js";
import DeliverySetting from "../models/DeliverySetting.js";

const onlyNumbers = (value = "") => String(value).replace(/\D/g, "");
const positiveMoney = (value = 0) => Math.max(0, Number(value || 0));

const buildBody = (body) => ({
  name: String(body.name || "").slice(0, 80),
  whatsapp: onlyNumbers(body.whatsapp).slice(0, 20),
  address: String(body.address || "").slice(0, 80),
  salary: positiveMoney(body.salary),
  earningPerKm: positiveMoney(body.earningPerKm),
  deliveryPercent: Math.min(100, Math.max(0, Number(body.deliveryPercent || 0))),
  active: Boolean(body.active),
});

const buildSettingBody = (body) => ({
  minimumFee: positiveMoney(body.minimumFee),
  minKmIncluded: positiveMoney(body.minKmIncluded),
  pricePerKm: positiveMoney(body.pricePerKm),
  extraFee: positiveMoney(body.extraFee),
  active: body.active === undefined ? true : Boolean(body.active),
});

export const getDeliverySettings = async (req, res) => {
  try {
    const settings = await DeliverySetting.findOneAndUpdate(
      { user: req.user._id },
      { $setOnInsert: { user: req.user._id, minimumFee: 3, minKmIncluded: 1, pricePerKm: 2, extraFee: 0, active: true } },
      { new: true, upsert: true }
    );

    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar configuração de entrega.", error: error.message });
  }
};

export const updateDeliverySettings = async (req, res) => {
  try {
    const data = buildSettingBody(req.body);

    const settings = await DeliverySetting.findOneAndUpdate(
      { user: req.user._id },
      { ...data, user: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({ message: "Configuração de entrega atualizada.", settings });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao salvar configuração de entrega.", error: error.message });
  }
};

export const simulateDeliveryFee = async (req, res) => {
  try {
    const distanceKm = positiveMoney(req.query.distanceKm || req.body.distanceKm);
    const settings = await DeliverySetting.findOne({ user: req.user._id });
    const minimumFee = positiveMoney(settings?.minimumFee ?? 3);
    const minKmIncluded = positiveMoney(settings?.minKmIncluded ?? 1);
    const pricePerKm = positiveMoney(settings?.pricePerKm ?? 2);
    const extraFee = positiveMoney(settings?.extraFee ?? 0);
    const extraKm = Math.max(0, distanceKm - minKmIncluded);
    const calculatedFee = distanceKm > 0 ? minimumFee + extraKm * pricePerKm + extraFee : 0;

    return res.json({ distanceKm, minimumFee, minKmIncluded, pricePerKm, extraFee, calculatedFee });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao simular taxa.", error: error.message });
  }
};

export const createDeliveryPerson = async (req, res) => {
  try {
    const data = buildBody(req.body);
    if (!data.name || !data.whatsapp) {
      return res.status(400).json({ message: "Nome e WhatsApp são obrigatórios." });
    }

    const deliveryPerson = await DeliveryPerson.create({ ...data, user: req.user._id });
    return res.status(201).json({ message: "Entregador cadastrado com sucesso.", deliveryPerson });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "Este WhatsApp já está cadastrado." });
    return res.status(500).json({ message: "Erro ao cadastrar entregador.", error: error.message });
  }
};

export const listDeliveryPersons = async (req, res) => {
  try {
    const { search = "", status = "TODOS" } = req.query;
    const filter = { user: req.user._id };

    if (status === "ATIVO") filter.active = true;
    if (status === "INATIVO") filter.active = false;

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { whatsapp: { $regex: onlyNumbers(search), $options: "i" } },
        { address: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const deliveryPersons = await DeliveryPerson.find(filter).sort({ active: -1, name: 1 });
    return res.json(deliveryPersons);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar entregadores.", error: error.message });
  }
};

export const getDeliveryPerson = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findOne({ _id: req.params.id, user: req.user._id });
    if (!deliveryPerson) return res.status(404).json({ message: "Entregador não encontrado." });
    return res.json(deliveryPerson);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar entregador.", error: error.message });
  }
};

export const updateDeliveryPerson = async (req, res) => {
  try {
    const data = buildBody(req.body);
    if (!data.name || !data.whatsapp) {
      return res.status(400).json({ message: "Nome e WhatsApp são obrigatórios." });
    }

    const deliveryPerson = await DeliveryPerson.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      data,
      { new: true, runValidators: true }
    );

    if (!deliveryPerson) return res.status(404).json({ message: "Entregador não encontrado." });
    return res.json({ message: "Entregador atualizado com sucesso.", deliveryPerson });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "Este WhatsApp já está cadastrado." });
    return res.status(500).json({ message: "Erro ao atualizar entregador.", error: error.message });
  }
};

export const toggleDeliveryPersonStatus = async (req, res) => {
  try {
    const current = await DeliveryPerson.findOne({ _id: req.params.id, user: req.user._id });
    if (!current) return res.status(404).json({ message: "Entregador não encontrado." });

    current.active = !current.active;
    await current.save();

    return res.json({ message: "Status do entregador atualizado.", deliveryPerson: current });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao alterar status.", error: error.message });
  }
};

export const deleteDeliveryPerson = async (req, res) => {
  try {
    const deliveryPerson = await DeliveryPerson.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deliveryPerson) return res.status(404).json({ message: "Entregador não encontrado." });
    return res.json({ message: "Entregador excluído com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao excluir entregador.", error: error.message });
  }
};
