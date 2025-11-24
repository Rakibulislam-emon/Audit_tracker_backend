// src/routes/checkTypeRoutes.js

import { Router } from "express";
import * as checkTypeController from "../controllers/checkTypeController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles(...can("CHECK_TYPE", "VIEW")),
  checkTypeController.getAllCheckTypes
);
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("CHECK_TYPE", "VIEW")),
  checkTypeController.getCheckTypeById
);
router.post(
  "/",
  auth,
  authorizeRoles(...can("CHECK_TYPE", "CREATE")),
  checkTypeController.createCheckType
);
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("CHECK_TYPE", "UPDATE")),
  checkTypeController.updateCheckType
);
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("CHECK_TYPE", "DELETE")),
  checkTypeController.deleteCheckType
);

export default router;