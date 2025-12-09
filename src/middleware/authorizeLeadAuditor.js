import AppError from "../utils/AppError.js";
import Schedule from "../models/Schedule.js";
import logger from "../utils/logger.js";

/**
 * Middleware to authorize only the assigned lead auditor or admin/sysadmin
 * to start a specific schedule's audit.
 *
 * Must be used AFTER auth middleware (requires req.user)
 */
const authorizeLeadAuditor = async (req, res, next) => {
  try {
    const scheduleId = req.params.id;
    const user = req.user;

    logger.info("🔐 authorizeLeadAuditor middleware called", {
      scheduleId,
      userId: user?._id,
      userRole: user?.role,
      userEmail: user?.email,
    });

    // Allow admin and sysadmin to start any audit (emergency override)
    if (user.role === "admin" || user.role === "sysadmin") {
      logger.info("✅ Admin/SysAdmin override - allowing access");
      return next();
    }

    // Fetch the schedule to check who is assigned - DO NOT POPULATE
    const schedule = await Schedule.findById(scheduleId)
      .select("assignedUser title")
      .lean(); // Use lean() to get plain JS object

    logger.info("📋 Schedule found", {
      scheduleId: schedule?._id,
      scheduleTitle: schedule?.title,
      assignedUser: schedule?.assignedUser,
      assignedUserType: typeof schedule?.assignedUser,
      assignedUserIsObjectId: schedule?.assignedUser?.constructor?.name,
    });

    if (!schedule) {
      logger.info("❌ Schedule not found");
      throw new AppError("Schedule not found", 404);
    }

    // Check if current user is the assigned lead auditor
    if (!schedule.assignedUser) {
      logger.info("❌ No assigned user on schedule");
      throw new AppError(
        "This schedule has no assigned lead auditor. Please assign one first.",
        403
      );
    }

    // Compare user IDs (handle both ObjectId and string)
    const assignedUserId = schedule.assignedUser.toString();
    const currentUserId = user._id.toString();
    const isLeadAuditor = assignedUserId === currentUserId;

    logger.info("🔍 ID Comparison", {
      assignedUserId,
      currentUserId,
      isMatch: isLeadAuditor,
    });

    if (!isLeadAuditor) {
      logger.info("❌ User is not the assigned lead auditor");
      throw new AppError(
        "Only the assigned lead auditor can start this audit.",
        403
      );
    }

    logger.info(
      "✅ Authorization successful - user is the assigned lead auditor"
    );
    // User is authorized
    next();
  } catch (error) {
    logger.error("❌ Authorization error:", error.message);
    next(error);
  }
};

export default authorizeLeadAuditor;
