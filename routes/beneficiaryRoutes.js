import express from "express";
import {
  createBeneficiary,
  Delete,
  listBeneficiaries,
  pagination,
  update,
} from "../controllers/beneficiaryController.js";
import { auth } from "../middleware/authVerification.js";

const router = express.Router();

router.post("/create", auth, createBeneficiary);
router.get("/pagination", auth, pagination);
router.put("/update", auth, update);
router.delete("/delete", auth, Delete);
router.get("/listBeneficiary", auth, listBeneficiaries);

export default router;
