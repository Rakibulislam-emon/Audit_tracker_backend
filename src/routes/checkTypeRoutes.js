// src/routes/checkTypeRoutes.js

import { Router } from "express";
import * as checkTypeController from "../controllers/checkTypeController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles("admin"),
  checkTypeController.getAllCheckTypes
);
router.get(
  "/:id",
  auth,
  authorizeRoles("admin"),
  checkTypeController.getCheckTypeById
);
router.post(
  "/",
  auth,
  authorizeRoles("admin"),
  checkTypeController.createCheckType
);
router.patch(
  "/:id",
  auth,
  authorizeRoles("admin"),
  checkTypeController.updateCheckType
);
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin"),
  checkTypeController.deleteCheckType
);

export default router;
