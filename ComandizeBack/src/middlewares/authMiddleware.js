import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    if (!token) return res.status(401).json({ message: "Token não informado." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const authUser = await User.findById(decoded.id);

    if (!authUser || !authUser.active) {
      return res.status(401).json({ message: "Sessão expirada ou usuário desativado." });
    }

    let storeOwner = authUser;

    if (authUser.isSubAccount) {
      storeOwner = await User.findById(authUser.parentStore);
      if (!storeOwner || !storeOwner.active) {
        return res.status(403).json({ message: "Conta principal desativada." });
      }
    }

    req.authUser = authUser;
    req.storeOwner = storeOwner;
    req.user = storeOwner;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Sessão expirada. Faça login novamente.",
      error: error.message,
    });
  }
};

export const requireAdminAccount = (req, res, next) => {
  if (req.authUser?.isSubAccount) {
    return res.status(403).json({ message: "Apenas a conta principal pode executar esta ação." });
  }
  next();
};

export const requirePageAccess = (pageName, manage = false) => {
  return (req, res, next) => {
    const authUser = req.authUser;
    if (!authUser?.isSubAccount) return next();

    const permission = authUser.permissions?.find((item) => item.page === pageName);
    if (!permission?.canView) return res.status(403).json({ message: `Você não tem permissão para acessar ${pageName}.` });
    if (manage && !permission.canManage) return res.status(403).json({ message: `Você não tem permissão para alterar dados em ${pageName}.` });

    next();
  };
};
