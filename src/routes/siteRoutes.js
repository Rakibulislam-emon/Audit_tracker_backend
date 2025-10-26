// src/routes/siteRoutes.js

import { Router } from "express";
import * as siteController from "../controllers/siteController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin"),
  siteController.getAllSites
);
router.get(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"),
  siteController.getSiteById
);
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin"),
  siteController.createSite
);
router.patch(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"),
  siteController.updateSite
);
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"),
  siteController.deleteSite
);

export default router;
