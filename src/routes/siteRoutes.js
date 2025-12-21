// src/routes/siteRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as siteController from "../controllers/siteController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { body } from "express-validator";
import { validate } from "../middleware/validator.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles(...can("SITE", "VIEW")),
  siteController.getAllSites
);
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("SITE", "VIEW")),
  siteController.getSiteById
);
router.post(
  "/",
  auth,
  authorizeRoles(...can("SITE", "CREATE")),
  [body("name", "Site name is required").not().isEmpty()],
  validate,
  siteController.createSite
);
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("SITE", "UPDATE")),
  siteController.updateSite
);
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("SITE", "DELETE")),
  siteController.deleteSite
);

export default router;
