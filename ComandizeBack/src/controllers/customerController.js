import crypto from "crypto";
import Customer from "../models/Customer.js";
import User from "../models/User.js";
import Order from "../models/Order.js";

const registerAttempts = new Map();

function onlyNumbers(value = "") {
  return String(value).replace(/\D/g, "");
}

function maskCpf(cpf = "") {
  const clean = onlyNumbers(cpf);
  if (clean.length !== 11) return "";
  return `${clean.slice(0, 3)}.***.***-${clean.slice(-2)}`;
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function hashPassword(password = "") {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function isValidPassword(password = "") {
  return String(password).length >= 4 && String(password).length <= 15;
}

function sanitizeAddress(address = {}) {
  return {
    street: String(address.street || "").slice(0, 120),
    neighborhood: String(address.neighborhood || "").slice(0, 80),
    houseNumber: String(address.houseNumber || "").slice(0, 20),
    cep: onlyNumbers(address.cep || "").slice(0, 8),
  };
}

function checkSpam(ip) {
  const now = Date.now();
  const data = registerAttempts.get(ip) || {
    attempts: [],
    blockedUntil: 0,
    penalty: 30,
  };

  if (data.blockedUntil > now) {
    return { blocked: true, wait: Math.ceil((data.blockedUntil - now) / 1000) };
  }

  data.attempts = data.attempts.filter((time) => now - time < 60000);
  data.attempts.push(now);

  if (data.attempts.length > 3) {
    data.blockedUntil = now + data.penalty * 1000;
    data.penalty = Math.min(data.penalty * 2, 900);
    registerAttempts.set(ip, data);
    return { blocked: true, wait: Math.ceil((data.blockedUntil - now) / 1000) };
  }

  registerAttempts.set(ip, data);
  return { blocked: false };
}

function formatCustomer(customer) {
  return {
    _id: customer._id,
    name: customer.name,
    whatsapp: customer.whatsapp,
    cpf: maskCpf(customer.cpf),
    deliveryAddress: customer.deliveryAddress || {
      street: "",
      neighborhood: "",
      houseNumber: "",
      cep: "",
    },
    points: customer.points,
    cashbackBalance: customer.cashbackBalance,
    referralCode: customer.referralCode,
    referralValidUntil: customer.referralValidUntil,
    catalogUrl: customer.catalogUrl,
    active: customer.active,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function formatAdminCustomer(customer) {
  return {
    _id: customer._id,
    name: customer.name,
    whatsapp: customer.whatsapp,
    cpf: customer.cpf || "",
    deliveryAddress: customer.deliveryAddress || {
      street: "",
      neighborhood: "",
      houseNumber: "",
      cep: "",
    },
    points: customer.points || 0,
    cashbackBalance: customer.cashbackBalance || 0,
    referralCode: customer.referralCode,
    referredBy: customer.referredBy,
    referralValidUntil: customer.referralValidUntil,
    catalogUrl: customer.catalogUrl,
    active: customer.active,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export const registerCustomer = async (req, res) => {
  try {
    const spam = checkSpam(req.ip);

    if (spam.blocked) {
      return res.status(429).json({
        message: `Muitas tentativas. Aguarde ${spam.wait} segundos.`,
      });
    }

    const { catalogUrl } = req.params;
    const { name, whatsapp, password, cpf = "", address = {}, referralCode = "" } = req.body;

    const store = await User.findOne({ catalogUrl, active: true });

    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada ou inativa." });
    }

    const cleanPhone = onlyNumbers(whatsapp);
    const cleanCpf = onlyNumbers(cpf);

    if (!name || name.length > 200) {
      return res.status(400).json({ message: "Nome obrigatório com no máximo 200 caracteres." });
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return res.status(400).json({ message: "Telefone inválido." });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "A senha deve ter entre 4 e 15 caracteres." });
    }

    if (cleanCpf && cleanCpf.length !== 11) {
      return res.status(400).json({ message: "CPF inválido." });
    }

    const alreadyExists = await Customer.findOne({ store: store._id, whatsapp: cleanPhone });

    if (alreadyExists) {
      return res.status(409).json({ message: "Cliente já cadastrado. Faça login para continuar." });
    }

    let referredBy = null;
    let referralValidUntil = null;

    if (referralCode) {
      const refCustomer = await Customer.findOne({
        store: store._id,
        referralCode: referralCode.toUpperCase(),
        active: true,
      });

      if (refCustomer) {
        referredBy = refCustomer._id;
        referralValidUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      }
    }

    const customer = await Customer.create({
      store: store._id,
      catalogUrl,
      name: String(name).slice(0, 200),
      whatsapp: cleanPhone,
      passwordHash: hashPassword(password),
      cpf: cleanCpf,
      deliveryAddress: sanitizeAddress(address),
      referralCode: generateReferralCode(),
      referredBy,
      referralValidUntil,
    });

    return res.status(201).json({
      message: "Cadastro realizado com sucesso.",
      customer: formatCustomer(customer),
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao cadastrar cliente.", error: error.message });
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const { catalogUrl } = req.params;
    const { whatsapp, password } = req.body;

    const cleanPhone = onlyNumbers(whatsapp);

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "Informe uma senha válida." });
    }

    const customer = await Customer.findOne({
      catalogUrl,
      whatsapp: cleanPhone,
      active: true,
    });

    if (!customer || customer.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ message: "WhatsApp ou senha inválidos." });
    }

    return res.json({
      message: "Login realizado com sucesso.",
      customer: formatCustomer(customer),
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao fazer login.", error: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { name, whatsapp, cpf = "", address = {}, password = "" } = req.body;

    const updateData = {
      name: String(name || "").slice(0, 200),
      whatsapp: onlyNumbers(whatsapp),
      cpf: onlyNumbers(cpf),
      deliveryAddress: sanitizeAddress(address),
    };

    if (password) {
      if (!isValidPassword(password)) {
        return res.status(400).json({ message: "A senha deve ter entre 4 e 15 caracteres." });
      }
      updateData.passwordHash = hashPassword(password);
    }

    const customer = await Customer.findByIdAndUpdate(customerId, updateData, { new: true });

    if (!customer) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    return res.json({ message: "Dados atualizados.", customer: formatCustomer(customer) });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar cliente.", error: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { active: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    return res.json({ message: "Conta excluída com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao excluir conta.", error: error.message });
  }
};

export const getCustomerProfile = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId);

    if (!customer || !customer.active) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    return res.json(formatCustomer(customer));
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar perfil.", error: error.message });
  }
};

export const getReferralMessage = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    const catalogLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/catalogo/${customer.catalogUrl}?ref=${customer.referralCode}`;
    const message = `Use meu link para comprar e participar do programa de fidelidade: ${catalogLink}`;

    return res.json({
      referralCode: customer.referralCode,
      message,
      whatsappLink: `https://wa.me/?text=${encodeURIComponent(message)}`,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao gerar indicação.", error: error.message });
  }
};

export const createCustomerAdmin = async (req, res) => {
  try {
    const {
      name,
      whatsapp,
      password,
      cpf = "",
      address = {},
      points = 0,
      cashbackBalance = 0,
      active = true,
    } = req.body;

    const cleanPhone = onlyNumbers(whatsapp);
    const cleanCpf = onlyNumbers(cpf);

    if (!name || name.length > 200) {
      return res.status(400).json({ message: "Nome obrigatório com no máximo 200 caracteres." });
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return res.status(400).json({ message: "WhatsApp inválido." });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "A senha deve ter entre 4 e 15 caracteres." });
    }

    if (cleanCpf && cleanCpf.length !== 11) {
      return res.status(400).json({ message: "CPF inválido." });
    }

    const alreadyExists = await Customer.findOne({
      store: req.user._id,
      whatsapp: cleanPhone,
    });

    if (alreadyExists) {
      return res.status(409).json({ message: "Já existe cliente com esse WhatsApp." });
    }

    const customer = await Customer.create({
      store: req.user._id,
      catalogUrl: req.user.catalogUrl,
      name: String(name).slice(0, 200),
      whatsapp: cleanPhone,
      passwordHash: hashPassword(password),
      cpf: cleanCpf,
      deliveryAddress: sanitizeAddress(address),
      points: Math.max(0, Number(points || 0)),
      cashbackBalance: Math.max(0, Number(cashbackBalance || 0)),
      referralCode: generateReferralCode(),
      active: Boolean(active),
    });

    return res.status(201).json({
      message: "Cliente cadastrado com sucesso.",
      customer: formatAdminCustomer(customer),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao cadastrar cliente no painel.",
      error: error.message,
    });
  }
};

export const listCustomersAdmin = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;

    const currentPage = Math.max(1, Number(page || 1));
    const perPage = Math.min(50, Math.max(1, Number(limit || 20)));
    const term = String(search || "").trim();

    const filter = { store: req.user._id };

    if (term) {
      const phone = onlyNumbers(term);

      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { whatsapp: { $regex: phone || term, $options: "i" } },
        { cpf: { $regex: phone || term, $options: "i" } },
        { referralCode: { $regex: term, $options: "i" } },
      ];
    }

    const total = await Customer.countDocuments(filter);

    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const data = await Promise.all(
      customers.map(async (customer) => {
        const phone = onlyNumbers(customer.whatsapp);

        const orders = await Order.find({
          store: req.user._id,
          $or: [
            { customerAccount: customer._id },
            { "customer.whatsapp": phone },
          ],
        }).select("total status");

        const finalizedOrders = orders.filter(
          (order) => order.status === "FINALIZADO"
        );

        const totalSpent = orders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        const finalizedSpent = finalizedOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        return {
          ...formatAdminCustomer(customer),
          stats: {
            totalOrders: orders.length,
            totalSpent,
            finalizedOrders: finalizedOrders.length,
            finalizedSpent,
          },
        };
      })
    );

    return res.json({
      customers: data,
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage) || 1,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao listar clientes.",
      error: error.message,
    });
  }
};

export const getCustomerDetailsAdmin = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      store: req.user._id,
    }).populate("referredBy", "name whatsapp referralCode");

    if (!customer) {
      return res.status(404).json({
        message: "Cliente não encontrado.",
      });
    }

    const phone = onlyNumbers(customer.whatsapp);

    // IMPORTANTE:
    // Busca por customerAccount OU pelo WhatsApp.
    // Assim pedidos antigos, feitos antes de salvar customerAccount,
    // também aparecem no histórico do cliente.
    const orders = await Order.find({
      store: req.user._id,
      $or: [
        { customerAccount: customer._id },
        { "customer.whatsapp": phone },
      ],
    }).sort({ createdAt: -1 });

    const referredCustomers = await Customer.find({
      store: req.user._id,
      referredBy: customer._id,
    })
      .sort({ createdAt: -1 })
      .select("name whatsapp createdAt referralValidUntil active");

    const finalizedOrders = orders.filter(
      (order) => order.status === "FINALIZADO"
    );

    const totalSpent = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const finalizedSpent = finalizedOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    return res.json({
      customer: formatAdminCustomer(customer),
      referredBy: customer.referredBy,
      referredCustomers,
      stats: {
        totalOrders: orders.length,
        totalSpent,
        finalizedOrders: finalizedOrders.length,
        finalizedSpent,
      },
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar detalhes do cliente.",
      error: error.message,
    });
  }
};

export const updateCustomerAdmin = async (req, res) => {
  try {
    const {
      name,
      whatsapp,
      password = "",
      cpf = "",
      address = {},
      points = 0,
      cashbackBalance = 0,
      active = true,
    } = req.body;

    const updateData = {
      name: String(name || "").slice(0, 200),
      whatsapp: onlyNumbers(whatsapp),
      cpf: onlyNumbers(cpf),
      deliveryAddress: sanitizeAddress(address),
      points: Math.max(0, Number(points || 0)),
      cashbackBalance: Math.max(0, Number(cashbackBalance || 0)),
      active: Boolean(active),
    };

    if (password) {
      if (!isValidPassword(password)) {
        return res.status(400).json({ message: "A senha deve ter entre 4 e 15 caracteres." });
      }
      updateData.passwordHash = hashPassword(password);
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.customerId, store: req.user._id },
      updateData,
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    return res.json({
      message: "Cliente atualizado com sucesso.",
      customer: formatAdminCustomer(customer),
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar cliente.", error: error.message });
  }
};

export const updateCustomerBalanceAdmin = async (req, res) => {
  try {
    const { points, cashbackBalance } = req.body;

    const updateData = {};

    if (points !== undefined) updateData.points = Math.max(0, Number(points || 0));
    if (cashbackBalance !== undefined) {
      updateData.cashbackBalance = Math.max(0, Number(cashbackBalance || 0));
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.customerId, store: req.user._id },
      updateData,
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    return res.json({
      message: "Saldo atualizado com sucesso.",
      customer: formatAdminCustomer(customer),
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar saldo.", error: error.message });
  }
};
// ADICIONE NO customerController.js

export const listAnonymousCustomersAdmin = async (req, res) => {
  try {
    const orders = await Order.find({
      store: req.user._id,
    }).sort({
      createdAt: -1,
    });

    const customers = await Customer.find({
      store: req.user._id,
    }).select("whatsapp");

    const registeredPhones = customers.map((customer) =>
      onlyNumbers(customer.whatsapp)
    );

    const grouped = {};

    for (const order of orders) {
      const phone = onlyNumbers(order.customer?.whatsapp || "");

      if (!phone) continue;

      // ignora clientes cadastrados
      if (registeredPhones.includes(phone)) {
        continue;
      }

      if (!grouped[phone]) {
        grouped[phone] = {
          whatsapp: phone,
          name: order.customer?.name || "Cliente",
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt,
          lastStatus: order.status,
        };
      }

      grouped[phone].totalOrders += 1;

      if (order.status === "FINALIZADO") {
        grouped[phone].totalSpent += Number(order.total || 0);
      }

      if (
        new Date(order.createdAt) >
        new Date(grouped[phone].lastOrderDate)
      ) {
        grouped[phone].lastOrderDate = order.createdAt;
        grouped[phone].lastStatus = order.status;
      }
    }

    const data = Object.values(grouped);

    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao listar clientes não cadastrados.",
      error: error.message,
    });
  }
};

