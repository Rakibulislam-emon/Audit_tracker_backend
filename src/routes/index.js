import express from "express";
import userRoutes from "./userRoutes.js";
import groupRoutes from "./groupRoutes.js";
import auth from "../middleware/auth.js";
const router = express.Router();


router.use("/api/users", userRoutes);
router.use("/api/groups",auth, groupRoutes);

export default router;
