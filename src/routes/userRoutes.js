import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  loginUser,
  logoutUser,
  registerUser,
  updateUser,
  // getCurrentUser,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";

const router = express.Router();

// router.get("/me", auth, getCurrentUser);
router.get("/", auth, authorizeRoles(...can("USER", "VIEW")), getAllUsers);
router.get("/:id", auth, authorizeRoles(...can("USER", "VIEW")), getUserById);
router.post("/", auth, authorizeRoles(...can("USER", "CREATE")), registerUser);
router.post("/login", loginUser);
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("USER", "UPDATE")),
  updateUser
);
router.post("/logout", auth, logoutUser);
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("USER", "DELETE")),
  deleteUser
);

export default router;
