import bcrypt from "bcryptjs";
import mongoose from "mongoose";
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: [
        // Old roles (keep for backward compatibility)
        "admin",
        "manager",
        "complianceOfficer",
        "sysadmin",

        // New roles (for system refactor)
        "auditor",
        "superAdmin",
        "groupAdmin",
        "companyAdmin",
        "siteManager",
        "problemOwner",
        "approver",
      ],
      default: "auditor",
      required: true,
    },

    // ===== User Scoping (for data access control) =====
    scopeLevel: {
      type: String,
      enum: ["system", "group", "company", "site"],
      default: "system",
    },
    assignedGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    assignedCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    assignedSite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  // Hash the password before saving
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
