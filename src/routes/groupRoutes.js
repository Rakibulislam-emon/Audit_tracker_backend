// src/routes/groupRoutes.js

import { Router } from "express";
// import * as groupController from "../controllers/groupController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { getAllGroups, createGroup, deleteGroup, updateGroup } from "../controllers/groupController.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles("admin"),
  getAllGroups
);

// router.get("/:id", groupController.getGroupById);

router.post("/",auth, authorizeRoles("admin"), createGroup);

router.patch("/:id",auth, authorizeRoles("admin"), updateGroup);

router.delete("/:id",auth, authorizeRoles("admin"), deleteGroup);

export default router;
