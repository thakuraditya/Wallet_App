import express from "express";
import prisma from "../config/prisma.js";
// import { auth } from "../middleware/authVerification.js";

const router = express.Router();

export const createBeneficiary = async (req, res) => {
  try {
    const { name, accountNumber, bankName, ifsc } = req.body;

    const beneficiary = await prisma.beneficiary.create({
      data: {
        name,
        accountNumber,
        bankName,
        ifsc,
        ownerId: req.user.id,
        balance: 0,
      },
    });

    res.status(201).json(beneficiary);
  } catch (error) {
    console.error("Error creating beneficiary:", error);
    res.status(500).json({ error: "Failed to create beneficiary" });
  }
};

export const listBeneficiaries = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const skip = (page - 1) * limit;
  const beneficiaries = await prisma.beneficiary.findMany({
    where: { ownerId: req.user.id },
    skip: parseInt(skip),
    take: parseInt(limit),
  });
  res.json(beneficiaries);
};

export const pagination = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const total = await prisma.beneficiary.count({
      where: { ownerId: req.user.id },
    });

    const beneficiaries = await prisma.beneficiary.findMany({
      where: { ownerId: req.user.id },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      data: beneficiaries,
    });
  } catch (error) {
    console.error("Error in pagination:", error);
    res.status(500).json({ error: "Failed to fetch beneficiaries" });
  }
};

export const update = async (req, res) => {
  const { name, account } = req.body;
  const b = await prisma.beneficiary.update({
    where: { id: payout.beneficiaryId },
    data: {
      balance: payout.amount + (payout.balance || 0),
    },
  });
  res.json(b);
};

export const Delete = async (req, res) => {
  await prisma.beneficiary.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted" });
};

export default router;
