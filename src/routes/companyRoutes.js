// src/routes/companyRoutes.js

import { Router } from "express";
import * as companyController from "../controllers/companyController.js";

const router = Router();

router.get("/", companyController.getAllCompanies);
router.get("/:id", companyController.getCompanyById);
router.post("/", companyController.createCompany);
router.put("/:id", companyController.updateCompany);
router.delete("/:id", companyController.deleteCompany);

export default router;
