import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";

let webPushConfigured = false;

function configureWebPush() {
  if (webPushConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:suporte@comandize.com.br";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  webPushConfigured = true;
  return true;
}

function buildNewOrderPayload(order) {
  const shortId = String(order._id || "").slice(-6);
  const customerName = order.customer?.name || "Cliente";
  const total = Number(order.total || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return {
    title: "🔔 Novo pedido recebido",
    body: `#${shortId} • ${customerName} • ${total}`,
    icon: "/icons/Comandize.png",
    badge: "/icons/Comandize.png",
    tag: `new-order-${order._id}`,
    url: "/login#Delivery",
    data: {
      orderId: String(order._id || ""),
      url: "/login#Delivery",
      type: "NEW_ORDER",
    },
    actions: [
      {
        action: "open_delivery",
        title: "Abrir Delivery",
      },
    ],
  };
}

export async function sendPushToStore(storeId, payload) {
  if (!configureWebPush()) {
    return {
      sent: 0,
      disabled: true,
      message: "VAPID não configurado.",
    };
  }

  const subscriptions = await PushSubscription.find({
    store: storeId,
    active: true,
  });

  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime,
            keys: subscription.keys,
          },
          JSON.stringify(payload)
        );

        subscription.lastUsedAt = new Date();
        await subscription.save();
        sent += 1;
      } catch (error) {
        const statusCode = error.statusCode || error.status;

        if (statusCode === 404 || statusCode === 410) {
          subscription.active = false;
          await subscription.save();
        }

        console.log("Falha ao enviar push:", error.message);
      }
    })
  );

  return {
    sent,
    disabled: false,
  };
}

export async function sendNewOrderNotification(storeId, order) {
  const payload = buildNewOrderPayload(order);
  return sendPushToStore(storeId, payload);
}
