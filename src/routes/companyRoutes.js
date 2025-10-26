// src/routes/companyRoutes.js

import { Router } from "express";
import * as companyController from "../controllers/companyController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get("/",auth,authorizeRoles("admin"), companyController.getAllCompanies);
router.get("/:id",auth,authorizeRoles("admin"), companyController.getCompanyById);
router.post("/",auth,authorizeRoles("admin"), companyController.createCompany);
router.patch("/:id",auth,authorizeRoles("admin"), companyController.updateCompany);
router.delete("/:id",auth,authorizeRoles("admin"), companyController.deleteCompany);

export default router;
