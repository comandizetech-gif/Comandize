import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import DeliveryPerson from "../models/DeliveryPerson.js";
import DeliverySetting from "../models/DeliverySetting.js";
import CashRegister from "../models/CashRegister.js";

const onlyNumbers = (value = "") => String(value).replace(/\D/g, "");

const sanitizeItems = (items = []) => {
  return items.slice(0, 30).map((item) => {
    const price = Math.max(0, Number(item.price || 0));
    const quantity = Math.min(30, Math.max(1, Number(item.quantity || 1)));
    const weightNumber = Number(item.weight || 0);
    const weight = weightNumber > 0 ? weightNumber : null;

    return {
      productId: item.productId || null,
      name: String(item.name || "").slice(0, 80),
      image: item.image || "",
      price,
      quantity,
      weight,
      cut: String(item.cut || "").slice(0, 40),
      observation: String(item.observation || "").slice(0, 250),
      subtotal: price * quantity,
    };
  });
};

const calculateSubtotal = (items = []) => {
  return items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
};

const calculateFinalTotal = (subtotal, discount = 0, deliveryFee = 0, extraFee = 0) => {
  return Math.max(
    0,
    Number(subtotal || 0) -
      Number(discount || 0) +
      Number(deliveryFee || 0) +
      Number(extraFee || 0)
  );
};

const safeMoney = (value = 0) => Math.max(0, Number(value || 0));

const calculateDeliveryFeeByKm = (distanceKm = 0, settings = null) => {
  const safeDistanceKm = safeMoney(distanceKm);
  const minimumFee = safeMoney(settings?.minimumFee ?? 3);
  const minKmIncluded = safeMoney(settings?.minKmIncluded ?? 1);
  const pricePerKm = safeMoney(settings?.pricePerKm ?? 2);
  const extraFee = safeMoney(settings?.extraFee ?? 0);
  const extraKm = Math.max(0, safeDistanceKm - minKmIncluded);
  const calculatedFee = safeDistanceKm > 0 ? minimumFee + extraKm * pricePerKm + extraFee : 0;

  return {
    distanceKm: Number(safeDistanceKm.toFixed(2)),
    minimumFee,
    minKmIncluded,
    pricePerKm,
    calculatedFee: Number(calculatedFee.toFixed(2)),
    extraFee,
    pricingMode: safeDistanceKm > 0 ? "AUTO_KM" : "MANUAL",
  };
};

const buildManualDeliveryPayload = (delivery = {}, deliveryFee = 0, extraFee = 0) => ({
  distanceKm: safeMoney(delivery.distanceKm),
  minimumFee: safeMoney(delivery.minimumFee),
  minKmIncluded: safeMoney(delivery.minKmIncluded),
  pricePerKm: safeMoney(delivery.pricePerKm),
  calculatedFee: safeMoney(delivery.calculatedFee || deliveryFee),
  extraFee: safeMoney(delivery.extraFee || extraFee),
  pricingMode: delivery.pricingMode === "AUTO_KM" ? "AUTO_KM" : "MANUAL",
  note: String(delivery.note || "").slice(0, 120),
});

const calculateDeliveryPersonPayment = (order, deliveryPerson) => {
  const distanceKm = safeMoney(order?.delivery?.distanceKm);
  const earningPerKm = safeMoney(deliveryPerson?.earningPerKm);
  const deliveryPercent = Math.min(100, Math.max(0, Number(deliveryPerson?.deliveryPercent || 0)));
  const deliveryFee = safeMoney(order?.deliveryFee);
  const amountByKm = distanceKm * earningPerKm;
  const amountByPercent = deliveryFee * (deliveryPercent / 100);

  return {
    distanceKm,
    earningPerKm,
    deliveryPercent,
    amountByKm: Number(amountByKm.toFixed(2)),
    amountByPercent: Number(amountByPercent.toFixed(2)),
    totalToPay: Number((amountByKm + amountByPercent).toFixed(2)),
  };
};

const enrichOrderForPanel = (order) => {
  const plain = typeof order.toObject === "function" ? order.toObject() : order;
  const customerAccount = plain.customerAccount || null;
  const referredBy = customerAccount?.referredBy || null;
  const referralValid =
    Boolean(referredBy) &&
    customerAccount?.referralValidUntil &&
    new Date(customerAccount.referralValidUntil).getTime() >= Date.now();

  const pointsToEarn =
    plain.status === "FINALIZADO" ? 0 : Math.floor(Number(plain.total || 0));

  const referralCashbackPreview =
    plain.status === "FINALIZADO" || !referralValid
      ? 0
      : Number(plain.total || 0) * 0.03;

  return {
    ...plain,
    panelInfo: {
      isRegisteredCustomer: Boolean(customerAccount?._id),
      pointsToEarn,
      cashbackUsed: Number(plain.cashbackUsed || 0),
      referralCodeUsed: plain.referralCodeUsed || "",
      hasReferralReward: referralCashbackPreview > 0,
      referralCashbackPreview,
      referredBy: referredBy
        ? {
            _id: referredBy._id,
            name: referredBy.name,
            whatsapp: referredBy.whatsapp,
            referralCode: referredBy.referralCode,
          }
        : null,
    },
  };
};

const orderPopulate = [
  {
    path: "customerAccount",
    select:
      "name whatsapp points cashbackBalance referralCode referredBy referralValidUntil active",
    populate: {
      path: "referredBy",
      select: "name whatsapp referralCode cashbackBalance",
    },
  },
];

const getLossPercentForMovement = (soldProduct, stockProduct) => {
  const soldLoss = Number(soldProduct?.lossPercent || 0);
  const stockLoss = Number(stockProduct?.lossPercent || 0);
  return Math.min(100, Math.max(0, soldLoss > 0 ? soldLoss : stockLoss));
};

const buildMovementPayload = ({
  soldProduct,
  stockProduct,
  item,
  baseQuantityDeducted,
  usedRecipe,
  recipeMode,
}) => {
  const lossPercent = getLossPercentForMovement(soldProduct, stockProduct);
  const lossQuantity = baseQuantityDeducted * (lossPercent / 100);
  const quantityDeducted = baseQuantityDeducted + lossQuantity;

  return {
    soldProduct: {
      _id: soldProduct._id,
      name: soldProduct.name,
      sku: soldProduct.sku,
    },
    stockProduct: {
      _id: stockProduct._id,
      name: stockProduct.name,
      sku: stockProduct.sku,
      currentStock: stockProduct.stock,
    },
    itemWeight: item.weight || null,
    itemQuantity: item.quantity || 1,
    baseQuantityDeducted,
    lossPercent,
    lossQuantity,
    quantityDeducted,
    usedRecipe,
    recipeMode,
    createdAt: new Date(),
  };
};

const getItemStockFactor = (item) => {
  const quantitySold = Math.max(1, Number(item.quantity || 1));
  const weightNumber = Number(item.weight || 0);

  // Se o item tem peso em gramas, 800g vira 0.8.
  // Se não tem peso, trabalha por unidade: 1 unidade, 2 unidades, etc.
  const weightFactor = weightNumber > 0 ? weightNumber / 1000 : 1;

  return quantitySold * weightFactor;
};

const applyRecipeStockDeduction = async (order) => {
  const movements = [];

  for (const item of order.items || []) {
    if (!item.productId) continue;

    const soldProduct = await Product.findOne({
      _id: item.productId,
      user: order.store,
    });

    if (!soldProduct) continue;

    const finalFactor = getItemStockFactor(item);

    // Receita nova: um produto vendido pode descontar vários produtos base.
    // Exemplo: Kit mistura -> carne + frango + linguiça.
    if (
      soldProduct.recipeEnabled &&
      Array.isArray(soldProduct.recipeItems) &&
      soldProduct.recipeItems.length > 0
    ) {
      for (const recipeItem of soldProduct.recipeItems) {
        const quantityDeducted = Number(recipeItem.quantity || 0) * finalFactor;

        if (!recipeItem.product || quantityDeducted <= 0) continue;

        const stockProductBefore = await Product.findOne({
          _id: recipeItem.product,
          user: order.store,
        });

        if (!stockProductBefore) continue;

        const lossPercent = getLossPercentForMovement(soldProduct, stockProductBefore);
        const lossQuantity = quantityDeducted * (lossPercent / 100);
        const totalQuantityToDeduct = quantityDeducted + lossQuantity;

        const updatedStockProduct = await Product.findOneAndUpdate(
          { _id: recipeItem.product, user: order.store },
          { $inc: { stock: -Math.max(0, totalQuantityToDeduct) } },
          { new: true }
        );

        if (updatedStockProduct) {
          movements.push(buildMovementPayload({
            soldProduct,
            stockProduct: updatedStockProduct,
            item,
            baseQuantityDeducted: quantityDeducted,
            usedRecipe: true,
            recipeMode: "MULTI",
          }));
        }
      }

      continue;
    }

    // Compatibilidade com produtos antigos que tinham apenas um produto origem.
    // Se recipeDeductQuantity = 1 e o pedido não tem peso, desconta 1 para 1.
    if (soldProduct.recipeEnabled && soldProduct.recipeSourceProduct) {
      const quantityDeducted = finalFactor * Number(soldProduct.recipeDeductQuantity || 1);

      const stockProductBefore = await Product.findOne({
        _id: soldProduct.recipeSourceProduct,
        user: order.store,
      });

      if (!stockProductBefore) continue;

      const lossPercent = getLossPercentForMovement(soldProduct, stockProductBefore);
      const lossQuantity = quantityDeducted * (lossPercent / 100);
      const totalQuantityToDeduct = quantityDeducted + lossQuantity;

      const updatedStockProduct = await Product.findOneAndUpdate(
        { _id: soldProduct.recipeSourceProduct, user: order.store },
        { $inc: { stock: -Math.max(0, totalQuantityToDeduct) } },
        { new: true }
      );

      if (updatedStockProduct) {
        movements.push(buildMovementPayload({
          soldProduct,
          stockProduct: updatedStockProduct,
          item,
          baseQuantityDeducted: quantityDeducted,
          usedRecipe: true,
          recipeMode: "SINGLE_LEGACY",
        }));
      }

      continue;
    }

    // Produto normal, sem receita: desconta dele mesmo por unidade ou por peso.
    const lossPercent = getLossPercentForMovement(soldProduct, soldProduct);
    const lossQuantity = finalFactor * (lossPercent / 100);
    const totalQuantityToDeduct = finalFactor + lossQuantity;

    const updatedStockProduct = await Product.findOneAndUpdate(
      { _id: soldProduct._id, user: order.store },
      { $inc: { stock: -Math.max(0, totalQuantityToDeduct) } },
      { new: true }
    );

    if (updatedStockProduct) {
      movements.push(buildMovementPayload({
        soldProduct,
        stockProduct: updatedStockProduct,
        item,
        baseQuantityDeducted: finalFactor,
        usedRecipe: false,
        recipeMode: "NONE",
      }));
    }
  }

  return movements;
};

export const createPublicOrder = async (req, res) => {
  try {
    const { catalogUrl } = req.params;

    const {
      type,
      customer,
      address,
      payment,
      scheduledTime,
      storeMessage,
      items,
      customerAccount,
      referralCodeUsed,
      discount = 0,
      deliveryFee = 0,
      delivery = {},
      extraFee = 0,
      cashbackUsed = 0,
    } = req.body;

    const store = await User.findOne({ catalogUrl, active: true });

    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada ou inativa." });
    }

    const safeItems = sanitizeItems(items);

    if (!safeItems.length) {
      return res.status(400).json({ message: "O pedido precisa ter itens." });
    }

    let customerAccountId = customerAccount || null;
    let customerAccountDoc = null;

    if (customerAccountId) {
      customerAccountDoc = await Customer.findOne({
        _id: customerAccountId,
        store: store._id,
        active: true,
      });

      if (!customerAccountDoc) customerAccountId = null;
    }

    if (!customerAccountId && customer?.whatsapp) {
      const foundCustomer = await Customer.findOne({
        store: store._id,
        whatsapp: onlyNumbers(customer.whatsapp),
        active: true,
      });

      if (foundCustomer) {
        customerAccountId = foundCustomer._id;
        customerAccountDoc = foundCustomer;
      }
    }

    const subtotal = calculateSubtotal(safeItems);
    const requestedCashback = Math.max(0, Number(cashbackUsed || 0));
    const allowedCashback = customerAccountDoc
      ? Math.min(requestedCashback, Number(customerAccountDoc.cashbackBalance || 0), subtotal)
      : 0;
    const safeDiscount = Math.max(0, Number(discount || 0)) + allowedCashback;
    const deliverySettings = await DeliverySetting.findOne({ user: store._id });
    const calculatedDelivery =
      type === "ENTREGA" && safeMoney(delivery?.distanceKm) > 0
        ? calculateDeliveryFeeByKm(delivery.distanceKm, deliverySettings)
        : buildManualDeliveryPayload(delivery, deliveryFee, extraFee);

    const safeDeliveryFee = type === "ENTREGA"
      ? safeMoney(calculatedDelivery.calculatedFee || deliveryFee)
      : 0;
    const safeExtraFee = Math.max(0, Number(extraFee || 0));
    const total = calculateFinalTotal(subtotal, safeDiscount, safeDeliveryFee, safeExtraFee);

    const order = await Order.create({
      store: store._id,
      catalogUrl,
      customerAccount: customerAccountId,
      referralCodeUsed: referralCodeUsed || "",
      type,
      customer: {
        name: String(customer?.name || "").slice(0, 200),
        whatsapp: onlyNumbers(customer?.whatsapp).slice(0, 13),
      },
      address: {
        street: String(address?.street || "").slice(0, 120),
        neighborhood: String(address?.neighborhood || "").slice(0, 80),
        houseNumber: String(address?.houseNumber || "").slice(0, 20),
        cep: onlyNumbers(address?.cep).slice(0, 8),
      },
      payment: {
        method: payment?.method || "",
        changeFor: String(payment?.changeFor || "").slice(0, 20),
      },
      scheduledTime,
      storeMessage: String(storeMessage || "").slice(0, 300),
      items: safeItems,
      subtotal,
      discount: safeDiscount,
      deliveryFee: safeDeliveryFee,
      delivery: calculatedDelivery,
      extraFee: safeExtraFee,
      cashbackUsed: allowedCashback,
      total,
      status: "PENDENTE",
    });

    return res.status(201).json({ message: "Pedido criado com sucesso.", order });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao criar pedido.", error: error.message });
  }
};

export const createManualOrder = async (req, res) => {
  try {
    const { type, customer, address, payment, scheduledTime, storeMessage, items = [], discount = 0, deliveryFee = 0, delivery = {}, extraFee = 0 } = req.body;

    const safeItems = sanitizeItems(items);
    const subtotal = calculateSubtotal(safeItems);
    const safeDiscount = Math.max(0, Number(discount || 0));
    const deliverySettings = await DeliverySetting.findOne({ user: req.user._id });
    const calculatedDelivery =
      type === "ENTREGA" && safeMoney(delivery?.distanceKm) > 0
        ? calculateDeliveryFeeByKm(delivery.distanceKm, deliverySettings)
        : buildManualDeliveryPayload(delivery, deliveryFee, extraFee);

    const safeDeliveryFee = type === "ENTREGA"
      ? safeMoney(calculatedDelivery.calculatedFee || deliveryFee)
      : 0;
    const safeExtraFee = Math.max(0, Number(extraFee || 0));
    const total = calculateFinalTotal(subtotal, safeDiscount, safeDeliveryFee, safeExtraFee);

    const order = await Order.create({
      store: req.user._id,
      catalogUrl: req.user.catalogUrl,
      type,
      customer: {
        name: String(customer?.name || "").slice(0, 200),
        whatsapp: onlyNumbers(customer?.whatsapp).slice(0, 13),
      },
      address: {
        street: String(address?.street || "").slice(0, 120),
        neighborhood: String(address?.neighborhood || "").slice(0, 80),
        houseNumber: String(address?.houseNumber || "").slice(0, 20),
        cep: onlyNumbers(address?.cep).slice(0, 8),
      },
      payment: {
        method: payment?.method || "",
        changeFor: String(payment?.changeFor || "").slice(0, 20),
      },
      scheduledTime,
      storeMessage: String(storeMessage || "").slice(0, 300),
      items: safeItems,
      subtotal,
      discount: safeDiscount,
      deliveryFee: safeDeliveryFee,
      delivery: calculatedDelivery,
      extraFee: safeExtraFee,
      total,
      status: "PENDENTE",
    });

    return res.status(201).json({ message: "Comanda criada com sucesso.", order });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao criar comanda.", error: error.message });
  }
};

export const listMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ store: req.user._id })
      .sort({ createdAt: -1 })
      .populate(orderPopulate);

    return res.json(orders.map(enrichOrderForPanel));
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar pedidos.", error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { type, customer, address, payment, scheduledTime, storeMessage, items, status, discount, deliveryFee, delivery = {}, extraFee } = req.body;

    const safeItems = sanitizeItems(items || []);
    const subtotal = calculateSubtotal(safeItems);
    const safeDiscount = Math.max(0, Number(discount || 0));
    const deliverySettings = await DeliverySetting.findOne({ user: req.user._id });
    const calculatedDelivery =
      type === "ENTREGA" && safeMoney(delivery?.distanceKm) > 0
        ? calculateDeliveryFeeByKm(delivery.distanceKm, deliverySettings)
        : buildManualDeliveryPayload(delivery, deliveryFee, extraFee);

    const safeDeliveryFee = type === "ENTREGA"
      ? safeMoney(calculatedDelivery.calculatedFee || deliveryFee)
      : 0;
    const safeExtraFee = Math.max(0, Number(extraFee || 0));
    const total = calculateFinalTotal(subtotal, safeDiscount, safeDeliveryFee, safeExtraFee);

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, store: req.user._id },
      {
        type,
        customer: {
          name: String(customer?.name || "").slice(0, 200),
          whatsapp: onlyNumbers(customer?.whatsapp).slice(0, 13),
        },
        address: {
          street: String(address?.street || "").slice(0, 120),
          neighborhood: String(address?.neighborhood || "").slice(0, 80),
          houseNumber: String(address?.houseNumber || "").slice(0, 20),
          cep: onlyNumbers(address?.cep).slice(0, 8),
        },
        payment: {
          method: payment?.method || "",
          changeFor: String(payment?.changeFor || "").slice(0, 20),
        },
        scheduledTime,
        storeMessage: String(storeMessage || "").slice(0, 300),
        items: safeItems,
        subtotal,
        discount: safeDiscount,
        deliveryFee: safeDeliveryFee,
        delivery: calculatedDelivery,
        extraFee: safeExtraFee,
        total,
        status: status || "PENDENTE",
      },
      { new: true }
    ).populate(orderPopulate);

    if (!order) return res.status(404).json({ message: "Pedido não encontrado." });

    return res.json({ message: "Pedido atualizado com sucesso.", order: enrichOrderForPanel(order) });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar pedido.", error: error.message });
  }
};

export const listFinalizedOrders = async (req, res) => {
  try {
    const { search = "", startDate = "", endDate = "", page = 1, limit = 20 } = req.query;
    const currentPage = Math.max(1, Number(page));
    const perPage = Math.min(20, Math.max(1, Number(limit)));

    const filter = { store: req.user._id, status: "FINALIZADO" };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(`${startDate}T00:00:00.000`);
      if (endDate) filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
    }

    const term = search.trim().toLowerCase();

    let allOrders = await Order.find(filter)
      .sort({ finalizedAt: -1, createdAt: -1 })
      .populate(orderPopulate);

    if (term) {
      allOrders = allOrders.filter((order) => {
        const code = String(order._id).slice(-6).toLowerCase();
        const fullId = String(order._id).toLowerCase();
        const name = String(order.customer?.name || "").toLowerCase();
        const phone = String(order.customer?.whatsapp || "");
        return code.includes(term) || fullId.includes(term) || name.includes(term) || phone.includes(term);
      });
    }

    const total = allOrders.length;
    const start = (currentPage - 1) * perPage;
    const orders = allOrders.slice(start, start + perPage).map(enrichOrderForPanel);

    return res.json({ orders, total, page: currentPage, limit: perPage, totalPages: Math.ceil(total / perPage) || 1 });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao listar pedidos finalizados.", error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatus = ["PENDENTE", "ACEITO", "PREPARANDO", "SAIU_PARA_ENTREGA", "FINALIZADO", "CANCELADO"];

    if (!allowedStatus.includes(status)) return res.status(400).json({ message: "Status inválido." });

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, store: req.user._id },
      { status },
      { new: true }
    ).populate(orderPopulate);

    if (!order) return res.status(404).json({ message: "Pedido não encontrado." });

    return res.json({ message: "Status atualizado.", order: enrichOrderForPanel(order) });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao atualizar status.", error: error.message });
  }
};

export const finalizeOrder = async (req, res) => {
  try {
    const orderBefore = await Order.findOne({ _id: req.params.id, store: req.user._id });

    if (!orderBefore) return res.status(404).json({ message: "Pedido não encontrado." });

    if (orderBefore.status === "FINALIZADO") {
      const populated = await orderBefore.populate(orderPopulate);
      return res.json({ message: "Pedido já estava finalizado.", order: enrichOrderForPanel(populated) });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, store: req.user._id },
      { status: "FINALIZADO", finalizedAt: new Date() },
      { new: true }
    ).populate(orderPopulate);

    const stockMovements = await applyRecipeStockDeduction(order);

    await Order.findByIdAndUpdate(order._id, { stockMovements });

    let pointsAdded = 0;
    let referralCashbackAdded = 0;

    if (order.customerAccount) {
      pointsAdded = Math.floor(Number(order.total || 0));
      const cashbackToDeduct = Math.max(0, Number(order.cashbackUsed || 0));

      await Customer.findByIdAndUpdate(order.customerAccount._id || order.customerAccount, {
        $inc: { points: pointsAdded, cashbackBalance: -cashbackToDeduct },
      });

      const buyer = await Customer.findById(order.customerAccount._id || order.customerAccount);
      const referralIsValid =
        buyer?.referredBy &&
        buyer?.referralValidUntil &&
        new Date(buyer.referralValidUntil).getTime() >= Date.now();

      if (referralIsValid) {
        referralCashbackAdded = Number(order.total || 0) * 0.03;
        await Customer.findByIdAndUpdate(buyer.referredBy, {
          $inc: { cashbackBalance: referralCashbackAdded },
        });
      }
    }

    const refreshedOrder = await Order.findById(order._id).populate(orderPopulate);

    return res.json({
      message: "Pedido finalizado com sucesso.",
      order: enrichOrderForPanel(refreshedOrder),
      rewards: {
        pointsAdded,
        referralCashbackAdded,
      },
      stockMovements,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao finalizar pedido.", error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({ _id: req.params.id, store: req.user._id });
    if (!order) return res.status(404).json({ message: "Pedido não encontrado." });
    return res.json({ message: "Pedido excluído com sucesso." });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao excluir pedido.", error: error.message });
  }
};

export const searchProductsForOrder = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.json([]);

    const products = await Product.find({
      user: req.user._id,
      $or: [{ name: { $regex: q, $options: "i" } }, { sku: { $regex: q, $options: "i" } }],
    })
      .limit(4)
      .select("name sku salePrice productType measureType image recipeEnabled recipeItems recipeSourceProduct recipeDeductQuantity stock lossPercent");

    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar produtos.", error: error.message });
  }
};

const getDayRange = (date) => {
  const safeDate = date || new Date().toISOString().slice(0, 10);
  return { start: new Date(`${safeDate}T00:00:00.000`), end: new Date(`${safeDate}T23:59:59.999`) };
};

const getMonthRange = (year, month) => {
  const safeYear = Number(year || new Date().getFullYear());
  const safeMonth = Number(month || new Date().getMonth() + 1);
  return { start: new Date(safeYear, safeMonth - 1, 1, 0, 0, 0, 0), end: new Date(safeYear, safeMonth, 0, 23, 59, 59, 999) };
};

const getOrdersForPeriod = (storeId, start, end) => Order.find({ store: storeId, status: "FINALIZADO", finalizedAt: { $gte: start, $lte: end } }).sort({ finalizedAt: 1, createdAt: 1 }).populate("items.productId");

const buildHourlySalesChart = (orders) => {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ name: `${String(hour).padStart(2, "0")}:00`, total: 0, orders: 0 }));
  orders.forEach((order) => { const hour = new Date(order.finalizedAt || order.createdAt).getHours(); hours[hour].total += Number(order.total || 0); hours[hour].orders += 1; });
  return hours;
};

const buildDaySalesChart = (orders, field = "total") => {
  const chartMap = {};
  orders.forEach((order) => { const key = new Date(order.finalizedAt || order.createdAt).toLocaleDateString("pt-BR"); chartMap[key] = (chartMap[key] || 0) + Number(order[field] || 0); });
  return Object.keys(chartMap).map((key) => ({ name: key, total: chartMap[key] }));
};

const buildPaymentList = (orders) => {
  const paymentMap = {};
  orders.forEach((order) => { const method = order.payment?.method || "Não informado"; paymentMap[method] = (paymentMap[method] || 0) + Number(order.total || 0); });
  return Object.keys(paymentMap).map((key) => ({ name: key, value: paymentMap[key] }));
};

const getProductCostMap = async (orders) => {
  const ids = new Set();
  orders.forEach((order) => {
    order.items?.forEach((item) => { if (item.productId?._id) ids.add(String(item.productId._id)); else if (item.productId) ids.add(String(item.productId)); });
    order.stockMovements?.forEach((movement) => { if (movement.stockProduct?._id) ids.add(String(movement.stockProduct._id)); if (movement.soldProduct?._id) ids.add(String(movement.soldProduct._id)); });
  });
  const products = await Product.find({ _id: { $in: [...ids] } }).select("name sku productType entryPrice salePrice clientPrice");
  return new Map(products.map((product) => [String(product._id), product]));
};

const calculateOrderCost = (order, productMap) => {
  let totalCost = 0;
  let lossCost = 0;
  const movements = Array.isArray(order.stockMovements) ? order.stockMovements : [];
  if (movements.length > 0) {
    movements.forEach((movement) => {
      const stockProduct = productMap.get(String(movement.stockProduct?._id || ""));
      const entryPrice = Number(stockProduct?.entryPrice || 0);
      totalCost += Number(movement.quantityDeducted || 0) * entryPrice;
      lossCost += Number(movement.lossQuantity || 0) * entryPrice;
    });
    return { totalCost, lossCost };
  }
  order.items?.forEach((item) => {
    const product = productMap.get(String(item.productId?._id || item.productId || ""));
    const entryPrice = Number(product?.entryPrice || 0);
    totalCost += getItemStockFactor(item) * entryPrice;
  });
  return { totalCost, lossCost };
};

const buildCashSessions = async (storeId, start, end, orders) => {
  const registers = await CashRegister.find({ store: storeId, openedAt: { $gte: start, $lte: end } }).sort({ openedAt: 1 });
  return registers.map((cash) => {
    const openedAt = cash.openedAt || cash.createdAt;
    const closedAt = cash.closedAt || null;
    const limitEnd = closedAt || end;
    const shiftOrders = orders.filter((order) => { const finalizedAt = new Date(order.finalizedAt || order.createdAt); return finalizedAt >= openedAt && finalizedAt <= limitEnd; });
    const totalSales = shiftOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const deliveryFees = shiftOrders.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);
    const openingAmount = Number(cash.openingAmount || 0);
    const closingAmount = cash.closingAmount === null || cash.closingAmount === undefined ? null : Number(cash.closingAmount || 0);
    const expectedClosingAmount = openingAmount + totalSales;
    const difference = closingAmount === null ? null : closingAmount - expectedClosingAmount;
    return { _id: cash._id, operatorName: cash.operatorName || "Operador", status: cash.status || (cash.closedAt ? "CLOSED" : "OPEN"), openedAt, closedAt, openingAmount, closingAmount, expectedClosingAmount, difference, totalSales, deliveryFees, totalOrders: shiftOrders.length, payments: buildPaymentList(shiftOrders) };
  });
};

async function buildReport(orders, { groupByDay = false, storeId, start, end } = {}) {
  const productMap = await getProductCostMap(orders);
  let totalSales = 0, totalCost = 0, totalLossCost = 0, totalItems = 0, totalDeliveryFees = 0;
  orders.forEach((order) => {
    totalSales += Number(order.total || 0);
    totalDeliveryFees += Number(order.deliveryFee || 0);
    const costs = calculateOrderCost(order, productMap);
    totalCost += costs.totalCost;
    totalLossCost += costs.lossCost;
    order.items?.forEach((item) => { totalItems += Number(item.quantity || 1); });
  });
  const cashSessions = storeId && start && end ? await buildCashSessions(storeId, start, end, orders) : [];
  return { totalOrders: orders.length, totalSales, totalCost, totalLossCost, profit: totalSales - totalCost, averageTicket: orders.length > 0 ? totalSales / orders.length : 0, totalItems, totalDeliveryFees, payments: buildPaymentList(orders), salesChart: groupByDay ? buildDaySalesChart(orders, "total") : buildHourlySalesChart(orders), deliveryFeesChart: groupByDay ? buildDaySalesChart(orders, "deliveryFee") : [], cashSessions, orders };
}

async function buildProductReport(orders, { page = 1, limit = 30, search = "", productType = "TODOS" } = {}) {
  const productMap = await getProductCostMap(orders);
  const map = new Map();
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const productId = String(item.productId?._id || item.productId || "");
      if (!productId) return;
      const product = productMap.get(productId) || item.productId || {};
      const current = map.get(productId) || { productId, name: product.name || item.name || "Produto", sku: product.sku || "", salePrice: Number(product.salePrice || item.price || 0), quantitySold: 0, grossSales: 0, totalCost: 0, lossCost: 0, profit: 0 };
      current.quantitySold += getItemStockFactor(item);
      current.grossSales += Number(item.subtotal || 0);
      map.set(productId, current);
    });
    const movementsBySold = {};
    (order.stockMovements || []).forEach((movement) => {
      const soldProductId = String(movement.soldProduct?._id || "");
      if (!soldProductId) return;
      const stockProduct = productMap.get(String(movement.stockProduct?._id || ""));
      const entryPrice = Number(stockProduct?.entryPrice || 0);
      if (!movementsBySold[soldProductId]) movementsBySold[soldProductId] = { cost: 0, lossCost: 0 };
      movementsBySold[soldProductId].cost += Number(movement.quantityDeducted || 0) * entryPrice;
      movementsBySold[soldProductId].lossCost += Number(movement.lossQuantity || 0) * entryPrice;
    });
    Object.entries(movementsBySold).forEach(([productId, values]) => { const current = map.get(productId); if (!current) return; current.totalCost += values.cost; current.lossCost += values.lossCost; });
  });
  for (const item of map.values()) {
    if (item.totalCost <= 0) { const product = productMap.get(item.productId); item.totalCost = Number(product?.entryPrice || 0) * Number(item.quantitySold || 0); }
    const product = productMap.get(item.productId);
    item.productType = product?.productType || item.productType || "";
    item.profit = item.grossSales - item.totalCost;
    item.marginValue = item.profit;
    item.marginPercent = item.grossSales > 0 ? (item.profit / item.grossSales) * 100 : 0;
    item.profitPercent = item.grossSales > 0 ? (item.profit / item.grossSales) * 100 : 0;
  }

  const allProductTypes = [...new Set([...map.values()].map((item) => item.productType).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const term = String(search || "").trim().toLowerCase();
  const selectedType = String(productType || "TODOS").trim();

  const filteredItems = [...map.values()].filter((item) => {
    const matchesSearch =
      !term ||
      String(item.name || "").toLowerCase().includes(term) ||
      String(item.sku || "").toLowerCase().includes(term);

    const matchesType = selectedType === "TODOS" || !selectedType || item.productType === selectedType;

    return matchesSearch && matchesType;
  });

  const allItems = filteredItems.sort((a, b) => b.quantitySold - a.quantitySold);
  const total = allItems.length;
  const currentPage = Math.max(1, Number(page));
  const perPage = Math.min(30, Math.max(1, Number(limit)));
  const products = allItems.slice((currentPage - 1) * perPage, (currentPage - 1) * perPage + perPage);
  const totals = allItems.reduce((acc, item) => { acc.totalCost += Number(item.totalCost || 0); acc.totalProfit += Number(item.profit || 0); acc.totalGrossSales += Number(item.grossSales || 0); acc.totalLossCost += Number(item.lossCost || 0); acc.totalQuantitySold += Number(item.quantitySold || 0); return acc; }, { totalCost: 0, totalProfit: 0, totalGrossSales: 0, totalLossCost: 0, totalQuantitySold: 0 });
  return { products, total, page: currentPage, limit: perPage, totalPages: Math.ceil(total / perPage) || 1, productTypes: allProductTypes, cards: { totalCost: totals.totalCost, totalProfit: totals.totalProfit, averageProductTicket: totals.totalQuantitySold > 0 ? totals.totalGrossSales / totals.totalQuantitySold : 0, totalLossCost: totals.totalLossCost, totalGrossSales: totals.totalGrossSales } };
}

export const getReportsSyncStatus = async (req, res) => {
  try {
    const { scope = "daily", date, month, year } = req.query;
    const range = scope === "monthly" ? getMonthRange(year, month) : getDayRange(date);
    const [orderSummary] = await Order.aggregate([{ $match: { store: req.user._id, status: "FINALIZADO", finalizedAt: { $gte: range.start, $lte: range.end } } }, { $group: { _id: null, total: { $sum: 1 }, lastUpdatedAt: { $max: "$updatedAt" }, salesTotal: { $sum: "$total" } } }]);
    const [cashSummary] = await CashRegister.aggregate([{ $match: { store: req.user._id, openedAt: { $gte: range.start, $lte: range.end } } }, { $group: { _id: null, total: { $sum: 1 }, lastUpdatedAt: { $max: "$updatedAt" } } }]);
    const orderLast = orderSummary?.lastUpdatedAt ? new Date(orderSummary.lastUpdatedAt).toISOString() : "empty";
    const cashLast = cashSummary?.lastUpdatedAt ? new Date(cashSummary.lastUpdatedAt).toISOString() : "empty";
    return res.json({ version: `${scope}-${range.start.toISOString()}-${range.end.toISOString()}-orders:${orderSummary?.total || 0}:${orderLast}:${orderSummary?.salesTotal || 0}-cash:${cashSummary?.total || 0}:${cashLast}` });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao verificar atualização dos relatórios.", error: error.message });
  }
};

export const getDailyReport = async (req, res) => {
  try {
    const { start, end } = getDayRange(req.query.date);
    const orders = await getOrdersForPeriod(req.user._id, start, end);
    const report = await buildReport(orders, { storeId: req.user._id, start, end });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao gerar relatório diário.", error: error.message });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const { start, end } = getMonthRange(req.query.year, req.query.month);
    const orders = await getOrdersForPeriod(req.user._id, start, end);
    const report = await buildReport(orders, { groupByDay: true, storeId: req.user._id, start, end });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao gerar relatório mensal.", error: error.message });
  }
};

export const getProductSalesReport = async (req, res) => {
  try {
    const { period = "daily", date, month, year, page = 1, limit = 30, search = "", productType = "TODOS" } = req.query;
    const range = period === "monthly" ? getMonthRange(year, month) : getDayRange(date);
    const orders = await getOrdersForPeriod(req.user._id, range.start, range.end);
    const report = await buildProductReport(orders, { page, limit, search, productType });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao gerar relatório de produtos.", error: error.message });
  }
};

export const assignDeliveryPersonToOrder = async (req, res) => {
  try {
    const { deliveryPersonId } = req.body;

    let deliveryPerson = null;
    const updateData = {
      assignedDeliveryPerson: null,
      assignedDeliveryPersonName: "",
      assignedDeliveryPersonWhatsapp: "",
      deliveryAssignedAt: null,
      deliveryPersonPayment: {
        distanceKm: 0,
        earningPerKm: 0,
        deliveryPercent: 0,
        amountByKm: 0,
        amountByPercent: 0,
        totalToPay: 0,
      },
    };

    if (deliveryPersonId) {
      deliveryPerson = await DeliveryPerson.findOne({
        _id: deliveryPersonId,
        user: req.user._id,
        active: true,
      });

      if (!deliveryPerson) {
        return res.status(404).json({
          message: "Entregador ativo não encontrado.",
        });
      }

      const currentOrder = await Order.findOne({ _id: req.params.id, store: req.user._id });
      if (!currentOrder) {
        return res.status(404).json({ message: "Pedido não encontrado." });
      }

      updateData.assignedDeliveryPerson = deliveryPerson._id;
      updateData.assignedDeliveryPersonName = deliveryPerson.name;
      updateData.assignedDeliveryPersonWhatsapp = deliveryPerson.whatsapp;
      updateData.deliveryAssignedAt = new Date();
      updateData.deliveryPersonPayment = calculateDeliveryPersonPayment(currentOrder, deliveryPerson);
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        store: req.user._id,
      },
      updateData,
      { new: true }
    ).populate(orderPopulate);

    if (!order) {
      return res.status(404).json({
        message: "Pedido não encontrado.",
      });
    }

    return res.json({
      message: deliveryPerson ? "Entregador vinculado ao pedido." : "Entregador removido do pedido.",
      order: enrichOrderForPanel(order),
      deliveryPerson,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao vincular entregador.",
      error: error.message,
    });
  }
};
