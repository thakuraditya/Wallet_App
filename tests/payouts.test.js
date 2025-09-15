// tests/payouts.test.js
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { PrismaClient } from "@prisma/client";
import app from "../src/app.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

let mongod;
let prisma;
let server;
let token;
let ownerId;
let beneficiaryId;
let walletId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.DATABASE_URL = mongod.getUri();
  prisma = new PrismaClient();
  await prisma.$connect();

  // create a user, wallet, beneficiary
  const user = await prisma.user.create({
    data: { username: "tester", email: "t@test.com", password: "hashed" },
  });
  ownerId = user.id;

  const wallet = await prisma.wallet.create({
    data: { userId: ownerId, balance: 1000, currency: "INR" },
  });
  walletId = wallet.id;

  const beneficiary = await prisma.beneficiary.create({
    data: { name: "Bob", accountNumber: "123456", bankName: "Bank", ownerId },
  });
  beneficiaryId = beneficiary.id;

  token = jwt.sign(
    { id: ownerId, email: user.email },
    process.env.JWT_SECRET || "testsecret",
    {
      expiresIn: "7d",
    }
  );
});

afterAll(async () => {
  await prisma.$disconnect();
  await mongod.stop();
});

describe("Payouts", () => {
  test("create payout with idempotency key (second request is idempotent)", async () => {
    const key = "idem-abc-123";
    const res1 = await request(app)
      .post("/payouts")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", key)
      .send({ beneficiaryId, amount: 10 });
    expect(res1.status).toBe(201);
    expect(res1.body.payout).toBeDefined();
    const id1 = res1.body.payout.id;

    const res2 = await request(app)
      .post("/payouts")
      .set("Authorization", `Bearer ${token}`)
      .set("Idempotency-Key", key)
      .send({ beneficiaryId, amount: 10 });
    expect(res2.status).toBe(200);
    expect(res2.body.idempotent).toBe(true);
    expect(res2.body.payout.id).toBe(id1);
  });

  test("list payouts with filters and pagination", async () => {
    // create additional payouts to get variety
    await prisma.payout.createMany({
      data: [
        {
          ownerId,
          beneficiaryId,
          amount: 5,
          status: "PENDING",
          currency: "INR",
        },
        {
          ownerId,
          beneficiaryId,
          amount: 15,
          status: "FAILED",
          currency: "INR",
        },
        {
          ownerId,
          beneficiaryId,
          amount: 25,
          status: "SUCCESS",
          currency: "INR",
        },
      ],
    });

    const res = await request(app)
      .get("/payouts?status=PENDING&page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  test("CSV export returns correct headers", async () => {
    const res = await request(app)
      .get("/payouts/export")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toMatch(/text\/csv/);
    expect(res.header["content-disposition"]).toMatch(/payouts_.*\.csv/);
    // first line headers
    const firstLine = res.text.split("\\n")[0].trim();
    expect(firstLine).toMatch(
      /Payout ID,Beneficiary Name,Amount,Currency,Status,Created At/
    );
  });

  test("simulate payout success decreases wallet balance and status becomes SUCCESS", async () => {
    // create a payout to simulate
    const p = await prisma.payout.create({
      data: {
        ownerId,
        beneficiaryId,
        amount: 50,
        currency: "INR",
        status: "PENDING",
      },
    });

    const before = await prisma.wallet.findFirst({ where: { id: walletId } });
    const res = await request(app)
      .post(`/payouts/${p.id}/simulate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "success" });
    expect(res.status).toBe(200);
    expect(res.body.status || res.body).toBeDefined();

    const afterWallet = await prisma.wallet.findFirst({
      where: { id: walletId },
    });
    expect(afterWallet.balance).toBeCloseTo(before.balance - 50);
    const updatedPayout = await prisma.payout.findUnique({
      where: { id: p.id },
    });
    expect(updatedPayout.status).toBe("SUCCESS");
  });

  test("simulate payout failure leaves wallet unchanged and status becomes FAILED", async () => {
    // create a payout to simulate failure
    const p = await prisma.payout.create({
      data: {
        ownerId,
        beneficiaryId,
        amount: 20,
        currency: "INR",
        status: "PENDING",
      },
    });

    const before = await prisma.wallet.findFirst({ where: { id: walletId } });

    const res = await request(app)
      .post(`/payouts/${p.id}/simulate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "fail" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("FAILED");

    const afterWallet = await prisma.wallet.findFirst({
      where: { id: walletId },
    });
    // wallet balance should be unchanged because we rolled back
    expect(afterWallet.balance).toBeCloseTo(before.balance);
    const updatedPayout = await prisma.payout.findUnique({
      where: { id: p.id },
    });
    expect(updatedPayout.status).toBe("FAILED");
  });
});
