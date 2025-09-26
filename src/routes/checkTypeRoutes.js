// src/routes/checkTypeRoutes.js

import { Router } from "express";
import * as checkTypeController from "../controllers/checkTypeController.js";

const router = Router();

router.get("/", checkTypeController.getAllCheckTypes);
router.get("/:id", checkTypeController.getCheckTypeById);
router.post("/", checkTypeController.createCheckType);
router.put("/:id", checkTypeController.updateCheckType);
router.delete("/:id", checkTypeController.deleteCheckType);

export default router;
