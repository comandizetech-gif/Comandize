import bcrypt from "bcryptjs";
import User from "../models/User.js";

const allowedPages = [
  "Delivery",
  "Pedidos",
  "Históricos",
  "Produtos",
  "Catálogo Online",
  "Clientes",
  "Relatórios",
  "Entregadores",
  "Configuração",
];

function normalizePermissions(rawPermissions = []) {
  const list = Array.isArray(rawPermissions) ? rawPermissions : [];
  return allowedPages.map((page) => {
    const found = list.find((item) => item.page === page);
    return { page, canView: Boolean(found?.canView), canManage: Boolean(found?.canManage) };
  });
}

function publicSubAccount(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active,
    permissions: user.permissions || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const listSubAccounts = async (req, res) => {
  try {
    const accounts = await User.find({ parentStore: req.user._id, isSubAccount: true }).select("-password").sort({ createdAt: -1 });
    return res.json(accounts.map(publicSubAccount));
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar subcontas.", error: error.message });
  }
};

export const createSubAccount = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 120);
    const email = String(req.body.email || "").trim().toLowerCase().slice(0, 160);
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    const phone = String(req.body.phone || "").trim().slice(0, 20);
    const role = req.body.role || "ATTENDANT";
    const permissions = normalizePermissions(req.body.permissions);

    if (!name || !email || !password || !confirmPassword) return res.status(400).json({ message: "Preencha nome, e-mail, senha e confirmação de senha." });
    if (password !== confirmPassword) return res.status(400).json({ message: "As duas senhas não conferem." });
    if (password.length < 4 || password.length > 30) return res.status(400).json({ message: "A senha deve ter entre 4 e 30 caracteres." });
    if (await User.findOne({ email })) return res.status(409).json({ message: "Este e-mail já está cadastrado." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const account = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      storeName: req.user.storeName,
      catalogUrl: `${req.user.catalogUrl}-${Date.now()}`,
      role,
      active: true,
      isSubAccount: true,
      parentStore: req.user._id,
      permissions,
    });

    return res.status(201).json({ message: "Subconta criada com sucesso.", account: publicSubAccount(account) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    return res.status(500).json({ message: "Erro ao criar subconta.", error: error.message });
  }
};

export const updateSubAccount = async (req, res) => {
  try {
    const account = await User.findOne({ _id: req.params.id, parentStore: req.user._id, isSubAccount: true });
    if (!account) return res.status(404).json({ message: "Subconta não encontrada." });

    const name = String(req.body.name || "").trim().slice(0, 120);
    const email = String(req.body.email || "").trim().toLowerCase().slice(0, 160);
    const phone = String(req.body.phone || "").trim().slice(0, 20);
    const role = req.body.role || account.role;
    const active = req.body.active === undefined ? account.active : Boolean(req.body.active);
    const permissions = normalizePermissions(req.body.permissions);
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (!name || !email) return res.status(400).json({ message: "Preencha nome e e-mail." });
    if (await User.findOne({ email, _id: { $ne: account._id } })) return res.status(409).json({ message: "Este e-mail já está cadastrado." });

    account.name = name;
    account.email = email;
    account.phone = phone;
    account.role = role;
    account.active = active;
    account.permissions = permissions;

    if (password || confirmPassword) {
      if (password !== confirmPassword) return res.status(400).json({ message: "As duas senhas não conferem." });
      if (password.length < 4 || password.length > 30) return res.status(400).json({ message: "A senha deve ter entre 4 e 30 caracteres." });
      account.password = await bcrypt.hash(password, 10);
    }

    await account.save();
    return res.json({ message: "Subconta atualizada com sucesso.", account: publicSubAccount(account) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    return res.status(500).json({ message: "Erro ao atualizar subconta.", error: error.message });
  }
};

export const deleteSubAccount = async (req, res) => {
  try {
    const account = await User.findOneAndDelete({ _id: req.params.id, parentStore: req.user._id, isSubAccount: true });
    if (!account) return res.status(404).json({ message: "Subconta não encontrada." });
    return res.json({ message: "Subconta excluída com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao excluir subconta.", error: error.message });
  }
};

export const toggleSubAccountStatus = async (req, res) => {
  try {
    const account = await User.findOne({ _id: req.params.id, parentStore: req.user._id, isSubAccount: true });
    if (!account) return res.status(404).json({ message: "Subconta não encontrada." });
    account.active = !account.active;
    await account.save();
    return res.json({ message: account.active ? "Subconta ativada." : "Subconta desativada.", account: publicSubAccount(account) });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao alterar status da subconta.", error: error.message });
  }
};
