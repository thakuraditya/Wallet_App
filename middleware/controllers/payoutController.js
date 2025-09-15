import prisma from "../config/prisma.js";

export const createPayout = async (req, res) => {
  try {
    const { amount, beneficiaryId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });
    if (!beneficiary || beneficiary.ownerId !== req.user.id) {
      return res.status(400).json({ error: "Invalid beneficiary" });
    }
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }
    const payout = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.user.id },
        data: { balance: { decrement: amount } },
      });
      return await tx.payout.create({
        data: {
          amount,
          status: "PENDING",
          owner: { connect: { id: req.user.id } },
          beneficiary: { connect: { id: beneficiaryId } },
        },
      });
    });

    res.status(201).json({
      message: "Payout created successfully",
      payout,
    });
  } catch (error) {
    console.error("Error creating payout:", error);
    res.status(500).json({ error: "Failed to create payout" });
  }
};

export const simulatePayout = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payout = await prisma.payout.findUnique({ where: { id } });
    if (!payout) {
      return res.status(404).json({ message: "Payout not found" });
    }

    if (payout.status !== "PENDING") {
      return res.status(400).json({ message: "Payout already finalized" });
    }

    const isSuccess = false;

    console.log(isSuccess);
    let updatedPayout;

    if (isSuccess) {
      const [payoutUpdate, beneficiaryUpdate] = await prisma.$transaction([
        prisma.payout.update({
          where: { id },
          data: { status: "SUCCESS" },
        }),
        prisma.beneficiary.update({
          where: { id: payout.beneficiaryId },
          data: {
            balance: { increment: payout.amount },
          },
        }),
      ]);

      console.log("Beneficiary credited:", beneficiaryUpdate);
      updatedPayout = payoutUpdate;
    } else {
      const [payoutUpdate, walletUpdate] = await prisma.$transaction([
        prisma.payout.update({
          where: { id },
          data: { status: "FAILED" },
        }),
        prisma.wallet.update({
          where: { userId: payout.ownerId },
          data: { balance: { increment: payout.amount } },
        }),
      ]);

      console.log("Wallet rolled back:", walletUpdate);
      updatedPayout = payoutUpdate;
    }

    res.json({
      message: "Payout simulated successfully",
      payout: updatedPayout,
    });
  } catch (err) {
    next(err);
  }
};

export const listPayouts = async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
  const where = { userId: req.user.userId };

  if (status) where.status = status;
  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }
  const payouts = await prisma.payout.findMany({
    where,
    skip: (page - 1) * limit,
    take: parseInt(limit),
    orderBy: { createdAt: "desc" },
  });

  res.json(payouts);
};

export const getPayout = async (req, res) => {
  const payout = await prisma.payout.findUnique({
    where: { id: req.params.id },
  });
  if (!payout || payout.userId !== req.user.userId) {
    return res.status(404).json({ error: "Payout not found" });
  }
  res.json(payout);
};
