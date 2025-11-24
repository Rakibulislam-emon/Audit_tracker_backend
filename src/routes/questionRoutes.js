// src/routes/questionRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as questionController from "../controllers/questionController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/questions - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("QUESTION", "VIEW")),
  questionController.getAllQuestions
);

// GET /api/questions/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("QUESTION", "VIEW")),
  questionController.getQuestionById
);

// POST /api/questions - Create
router.post(
  "/",
  auth,
  authorizeRoles(...can("QUESTION", "CREATE")),
  questionController.createQuestion
);

// PATCH /api/questions/:id - Update
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("QUESTION", "UPDATE")),
  questionController.updateQuestion
);

// DELETE /api/questions/:id - Delete
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("QUESTION", "DELETE")),
  questionController.deleteQuestion
);

export default router;