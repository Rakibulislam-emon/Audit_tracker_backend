import express from "express";
import userRoutes from "./userRoutes.js";
import groupRoutes from "./groupRoutes.js";
import auth from "../middleware/auth.js";
import companyRoutes from "./companyRoutes.js";
import siteRoutes from "./siteRoutes.js";


const router = express.Router();


router.use("/api/users", userRoutes);
router.use("/api/groups",auth, groupRoutes);
router.use("/api/companies",auth, companyRoutes);
router.use("/api/sites",auth, siteRoutes);

export default router;
