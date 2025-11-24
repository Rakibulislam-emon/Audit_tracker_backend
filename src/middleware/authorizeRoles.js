// middleware/authorizeRoles.js
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    console.log("🔐 Authorization Check:");
    console.log("User Role:", req.user.role);
    console.log("Allowed Roles:", allowedRoles);
    console.log("Has Access:", allowedRoles.includes(req.user.role));

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Access denied",
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

export default authorizeRoles;