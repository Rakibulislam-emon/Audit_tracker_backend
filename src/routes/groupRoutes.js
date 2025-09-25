// src/routes/groupRoutes.js

import { Router } from "express";
import * as groupController from "../controllers/groupController.js";

const router = Router();

router.get("/", groupController.getAllGroups);

router.get("/:id", groupController.getGroupById);

router.post("/", groupController.createGroup);

router.put("/:id", groupController.updateGroup);

router.delete("/:id", groupController.deleteGroup);

export default router;
