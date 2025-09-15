import prisma from "../config/prisma.js";

export const getWallet = async (req, res) => {
  const wallet = await prisma.wallet.findFirst({
    where: { userId: req.user.id },
  });
  res.json(wallet || { message: "No wallet found" });
};

export const seedWallet = async (req, res) => {
  const wallet = await prisma.wallet.upsert({
    where: { userId: req.user.id },
    update: { balance: { increment: 1000 } },
    create: { userId: req.user.id, balance: 1000 },
  });
  res.json(wallet);
};
