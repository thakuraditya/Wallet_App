// import prisma from "./config/prisma";
import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import beneficiaryRoutes from "./routes/beneficiaryRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
// import webhookRoutes from "./routes/webhookRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

dotenv.config();

const app = express();
app.use(express.json());

const swaggerDoc = YAML.load("./swagger.yaml");

app.use("/auth", authRoutes);
app.use("/wallet", walletRoutes);
app.use("/beneficiaries", beneficiaryRoutes);
app.use("/payouts", payoutRoutes);
// app.use("/webhooks", webhookRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(`Server Connected at ${process.env.PORT}`);
});

export default app;
