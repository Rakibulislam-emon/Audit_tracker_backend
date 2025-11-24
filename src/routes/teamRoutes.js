// src/routes/teamRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as teamController from "../controllers/teamController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles(...can("TEAM", "VIEW")),
  teamController.getAllTeams
);
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("TEAM", "VIEW")),
  teamController.getTeamById
);
router.post(
  "/",
  auth,
  authorizeRoles(...can("TEAM", "CREATE")),
  teamController.createTeam
);
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("TEAM", "UPDATE")),
  teamController.updateTeam
);
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("TEAM", "DELETE")),
  teamController.deleteTeam
);

export default router;