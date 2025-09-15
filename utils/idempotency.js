// src/utils/idempotency.js
// Simple helper: find existing payout for owner by idempotency key
export const findExistingByIdempotency = async (prisma, ownerId, key) => {
  if (!key) return null;
  return prisma.payout.findFirst({ where: { ownerId, idempotencyKey: key } });
};
