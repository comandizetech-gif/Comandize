import PushSubscription from "../models/PushSubscription.js";

export const getVapidPublicKey = async (req, res) => {
  try {
    return res.json({
      publicKey: process.env.VAPID_PUBLIC_KEY || "",
      enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar chave de notificação.",
      error: error.message,
    });
  }
};

export const subscribePush = async (req, res) => {
  try {
    const { endpoint, expirationTime = null, keys = {} } = req.body || {};

    if (!endpoint || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        message: "Inscrição push inválida.",
      });
    }

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        store: req.user._id,
        user: req.authUser?._id || req.user._id,
        endpoint,
        expirationTime,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
        active: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      message: "Notificações ativadas neste dispositivo.",
      subscriptionId: subscription._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao ativar notificações.",
      error: error.message,
    });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body || {};

    if (!endpoint) {
      return res.status(400).json({
        message: "Endpoint não informado.",
      });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint, store: req.user._id },
      { active: false },
      { new: true }
    );

    return res.json({
      message: "Notificações desativadas neste dispositivo.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao desativar notificações.",
      error: error.message,
    });
  }
};
