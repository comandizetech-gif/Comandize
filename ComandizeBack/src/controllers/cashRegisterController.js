import CashRegister from "../models/CashRegister.js";

const toMoney = (value) => Math.max(0, Number(value || 0));

export const getCurrentCashRegister = async (req, res) => {
  try {
    const cashRegister = await CashRegister.findOne({
      store: req.user._id,
      status: "OPEN",
    }).sort({ openedAt: -1 });

    return res.json({
      isOpen: Boolean(cashRegister),
      cashRegister,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar caixa atual.",
      error: error.message,
    });
  }
};

export const openCashRegister = async (req, res) => {
  try {
    const opened = await CashRegister.findOne({
      store: req.user._id,
      status: "OPEN",
    });

    if (opened) {
      return res.status(400).json({
        message: "Já existe um caixa aberto.",
        cashRegister: opened,
      });
    }

    const cashRegister = await CashRegister.create({
      store: req.user._id,
      operatorName: String(req.body.operatorName || "").slice(0, 80),
      openingAmount: toMoney(req.body.openingAmount),
      openedAt: new Date(),
      status: "OPEN",
    });

    return res.status(201).json({
      message: "Caixa aberto com sucesso.",
      cashRegister,
      isOpen: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao abrir caixa.",
      error: error.message,
    });
  }
};

export const closeCashRegister = async (req, res) => {
  try {
    const cashRegister = await CashRegister.findOne({
      store: req.user._id,
      status: "OPEN",
    }).sort({ openedAt: -1 });

    if (!cashRegister) {
      return res.status(404).json({ message: "Nenhum caixa aberto." });
    }

    cashRegister.closingAmount = toMoney(req.body.closingAmount);
    cashRegister.closedAt = new Date();
    cashRegister.status = "CLOSED";
    await cashRegister.save();

    return res.json({
      message: "Caixa fechado com sucesso.",
      cashRegister,
      isOpen: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao fechar caixa.",
      error: error.message,
    });
  }
};
