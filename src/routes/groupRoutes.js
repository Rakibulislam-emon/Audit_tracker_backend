// src/routes/groupRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import { createGroup, deleteGroup, getAllGroups, updateGroup } from "../controllers/groupController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles(...can("GROUP", "VIEW")),
  getAllGroups
);

// router.get("/:id", groupController.getGroupById);

router.post("/", auth, authorizeRoles(...can("GROUP", "CREATE")), createGroup);

router.patch("/:id", auth, authorizeRoles(...can("GROUP", "UPDATE")), updateGroup);

router.delete("/:id", auth, authorizeRoles(...can("GROUP", "DELETE")), deleteGroup);

export default router;