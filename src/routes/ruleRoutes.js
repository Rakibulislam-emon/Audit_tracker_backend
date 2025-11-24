// src/routes/ruleRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as ruleController from "../controllers/ruleController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get("/", auth, authorizeRoles(...can("RULE", "VIEW")), ruleController.getAllRules);
router.get("/:id", auth, authorizeRoles(...can("RULE", "VIEW")), ruleController.getRuleById);
router.post("/", auth, authorizeRoles(...can("RULE", "CREATE")), ruleController.createRule);
router.patch("/:id", auth, authorizeRoles(...can("RULE", "UPDATE")), ruleController.updateRule);
router.delete("/:id", auth, authorizeRoles(...can("RULE", "DELETE")), ruleController.deleteRule);

export default router;