// src/routes/ruleRoutes.js

import { Router } from "express";
import * as ruleController from "../controllers/ruleController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get("/", auth, authorizeRoles("admin"), ruleController.getAllRules);
router.get("/:id", auth, authorizeRoles("admin"), ruleController.getRuleById);
router.post("/", auth, authorizeRoles("admin"), ruleController.createRule);
router.put("/:id", auth, authorizeRoles("admin"), ruleController.updateRule);
router.delete("/:id", auth, authorizeRoles("admin"), ruleController.deleteRule);

export default router;
