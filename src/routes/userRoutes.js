import express from "express";
import {
  deleteUser,
  getAllUsers,
  getUserById,
  loginUser,
  logoutUser,
  registerUser,
  updateUser,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { body } from "express-validator";
import { validate } from "../middleware/validator.js";

const router = express.Router();

// router.get("/me", auth, getCurrentUser);
router.get("/", auth, authorizeRoles(...can("USER", "VIEW")), getAllUsers);
router.get("/:id", auth, authorizeRoles(...can("USER", "VIEW")), getUserById);

// Apply authLimiter to register and login
router.post(
  "/",
  authLimiter,
  auth,
  authorizeRoles(...can("USER", "CREATE")),
  [
    body("name", "Name is required").not().isEmpty(),
    body("email", "Please include a valid email").isEmail(),
    body(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  validate,
  registerUser
);
router.post(
  "/login",
  authLimiter,
  [
    body("email", "Please include a valid email").isEmail(),
    body("password", "Password is required").exists(),
  ],
  validate,
  loginUser
);

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
