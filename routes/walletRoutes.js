import express from "express";
import { getWallet, seedWallet } from "../controllers/walletController.js";
import authentication from "../middleware/authVerification.js";

const router = express.Router();

router.post("/getWallet", authentication, getWallet);
router.post("/seed", authentication, seedWallet);

export default router;
