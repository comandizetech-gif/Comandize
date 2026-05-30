import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const register = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const phone = req.body.phone?.trim() || "";
    const storeName = req.body.storeName?.trim();
    const catalogUrl = req.body.catalogUrl?.trim().toLowerCase();

    if (!name || !email || !password || !storeName || !catalogUrl) {
      return res.status(400).json({
        message: "Preencha todos os campos obrigatórios.",
      });
    }

    const emailExists = await User.findOne({ email });

    if (emailExists) {
      return res.status(400).json({
        message: "Este e-mail já está cadastrado.",
      });
    }

    const catalogExists = await User.findOne({ catalogUrl });

    if (catalogExists) {
      return res.status(400).json({
        message: "Esta URL de catálogo já está em uso.",
      });
    }

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
    });

    return res.status(201).json({
      message: "Conta criada com sucesso. Aguarde ativação do administrador.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        storeName: user.storeName,
        catalogUrl: user.catalogUrl,
        active: user.active,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("ERRO AO CADASTRAR USUÁRIO:");
    console.log(error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "E-mail ou URL do catálogo já está em uso.",
      });
    }

    return res.status(500).json({
      message: "Erro ao cadastrar usuário.",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        message: "Informe e-mail e senha.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: "Sua conta ainda está desativada. Aguarde liberação.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.json({
      message: "Login realizado com sucesso.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        storeName: user.storeName,
        catalogUrl: user.catalogUrl,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    console.log("ERRO AO FAZER LOGIN:");
    console.log(error);

    return res.status(500).json({
      message: "Erro ao fazer login.",
      error: error.message,
    });
  }
};