import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const DEFAULT_ADMIN_PERMISSIONS = [
  "Delivery",
  "Pedidos",
  "Históricos",
  "Produtos",
  "Catálogo Online",
  "Clientes",
  "Relatórios",
  "Entregadores",
  "Configuração",
].map((page) => ({ page, canView: true, canManage: true }));

function normalizeCatalogUrl(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function publicUser(user, storeOwner = null) {
  const owner = storeOwner || user;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    storeName: owner.storeName,
    catalogUrl: owner.catalogUrl,
    role: user.role,
    active: user.active,
    isSubAccount: Boolean(user.isSubAccount),
    parentStore: user.parentStore || null,
    permissions: user.isSubAccount ? user.permissions || [] : DEFAULT_ADMIN_PERMISSIONS,
  };
}

export const register = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const phone = req.body.phone?.trim() || "";
    const storeName = req.body.storeName?.trim();
    const catalogUrl = normalizeCatalogUrl(req.body.catalogUrl);

    if (!name || !email || !password || !storeName || !catalogUrl) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatórios." });
    }

    if (password.length < 4) return res.status(400).json({ message: "A senha precisa ter pelo menos 4 caracteres." });

    if (await User.findOne({ email })) return res.status(400).json({ message: "Este e-mail já está cadastrado." });
    if (await User.findOne({ catalogUrl })) return res.status(400).json({ message: "Esta URL de catálogo já está em uso." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      storeName,
      catalogUrl,
      role: "ADMIN",
      active: false,
      isSubAccount: false,
      parentStore: null,
      permissions: DEFAULT_ADMIN_PERMISSIONS,
    });

    return res.status(201).json({
      message: "Conta criada com sucesso. Aguarde ativação do administrador.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "E-mail ou URL do catálogo já está em uso." });
    return res.status(500).json({ message: "Erro ao cadastrar usuário.", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) return res.status(400).json({ message: "Informe e-mail e senha." });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "E-mail ou senha inválidos." });

    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ message: "E-mail ou senha inválidos." });

    if (!user.active) return res.status(403).json({ message: "Sua conta ainda está desativada. Aguarde liberação." });

    let storeOwner = user;
    if (user.isSubAccount) {
      storeOwner = await User.findById(user.parentStore);
      if (!storeOwner || !storeOwner.active) return res.status(403).json({ message: "A conta principal dessa loja está desativada." });
    }

    const token = jwt.sign(
      { id: user._id, storeId: storeOwner._id, role: user.role, isSubAccount: Boolean(user.isSubAccount) },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ message: "Login realizado com sucesso.", token, user: publicUser(user, storeOwner) });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao fazer login.", error: error.message });
  }
};

export const me = async (req, res) => {
  try {
    const user = req.authUser || req.user;
    const storeOwner = req.storeOwner || req.user;
    return res.json({ user: publicUser(user, storeOwner) });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao validar sessão.", error: error.message });
  }
};
