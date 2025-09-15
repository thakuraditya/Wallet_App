import express from "express";
import { auth } from "../middleware/authVerification.js";
import {
  createPayout,
  listPayouts,
  getPayout,
  simulatePayout,
} from "../controllers/payoutController.js";

const router = express.Router();

router.post("/createPayout", auth, createPayout);
router.get("/listPayouts", auth, listPayouts);
router.get("/getPayout/:id", auth, getPayout);
router.post("/simulatePayout/:id/simulate", auth, simulatePayout);

export default router;
