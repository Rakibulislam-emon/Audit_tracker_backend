// src/routes/companyRoutes.js

import { Router } from "express";
import * as companyController from "../controllers/companyController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";
import { body } from "express-validator";
import { validate } from "../middleware/validator.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles(...can("COMPANY", "VIEW")),
  companyController.getAllCompanies
);
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("COMPANY", "VIEW")),
  companyController.getCompanyById
);
router.post(
  "/",
  auth,
  authorizeRoles(...can("COMPANY", "CREATE")),
  [body("name", "Company name is required").not().isEmpty()],
  validate,
  companyController.createCompany
);
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("COMPANY", "UPDATE")),
  companyController.updateCompany
);
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("COMPANY", "DELETE")),
  companyController.deleteCompany
);

export default router;
