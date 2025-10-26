import express from "express";
import {
  deleteUser,
  getAllUsers,
  loginUser,
  logoutUser,
  registerUser,
  updateUser,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = express.Router();

router.get("/me", auth, (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});
router.get("/", auth, authorizeRoles("admin", "sysadmin"), getAllUsers);

router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin"),
  registerUser
);

router.post("/login", loginUser);
router.patch("/:id", auth, authorizeRoles("admin", "sysadmin"), updateUser);
router.post("/logout", logoutUser);

router.delete("/:id", auth, authorizeRoles("admin", "sysadmin"), deleteUser);
export default router;
