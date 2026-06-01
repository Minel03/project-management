import express from "express";
import { initDatabase } from "../controllers/dbController.js";

const router = express.Router();

// DB init endpoint: allow demo setup without requiring admin token
// NOTE: This is intentionally public for demo convenience. Remove or protect in production.
router.get("/init", initDatabase);

export default router;
