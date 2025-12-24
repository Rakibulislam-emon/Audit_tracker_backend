// src/controllers/auditSessionController.js

import AuditSession from "../models/AuditSession.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import Team from "../models/Team.js";

// GET /api/audit-sessions - With filtering, sorting, population
export const getAllAuditSessions = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values
  const {
    search,
    template,
    site,
    checkType,
    schedule,
    status,
    workflowStatus,
    startDate,
    endDate,
  } = req.query;

  // Step 2: Create query object
  const query = {};

  // Step 3: Add filters
  if (template) query.template = template;
  if (site) query.site = site;
  if (checkType) query.checkType = checkType; // Filter by optional checkType
  if (schedule) query.schedule = schedule;
  if (status === "active" || status === "inactive") query.status = status; // System status
  if (
    workflowStatus &&
    ["planned", "in-progress", "completed", "cancelled"].includes(
      workflowStatus
    )
  ) {
    query.workflowStatus = workflowStatus; // Operational status
  }
  // Date range filter (checks if session *overlaps* with the filter range)
  if (startDate)
    query.endDate = { ...query.endDate, $gte: new Date(startDate) };
  if (endDate)
    query.startDate = { ...query.startDate, $lte: new Date(endDate) };

  // Step 4: Add search filter (searches in 'title' if it exists)
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.title = searchRegex; // Search in the optional title field
  }

  // Step 5: Apply role-based access control and scoping
  const userRole = req.user?.role;
  const userId = req.user?._id;

  // Admin roles that can see all sessions (no filtering)
  const fullAccessRoles = [
    "admin",
    "sysadmin",
    "superAdmin",
    "complianceOfficer",
    "manager",
    "approver", // Approvers need to see all sessions to close them
  ];

  if (!fullAccessRoles.includes(userRole)) {
    // For scoped admin roles, filter by their assigned scope
    if (userRole === "groupAdmin") {
      // Group Admin: see all sessions for sites in their group
      if (req.user.assignedGroup) {
        // Need to get all sites in the group and filter sessions by those sites
        const Site = (await import("../models/Site.js")).default;
        const Company = (await import("../models/Company.js")).default;

        const companiesInGroup = await Company.find({
          group: req.user.assignedGroup,
        }).distinct("_id");

        const sitesInGroup = await Site.find({
          company: { $in: companiesInGroup },
        }).distinct("_id");

        query.site = { $in: sitesInGroup };
      }
    } else if (userRole === "companyAdmin") {
      // Company Admin: see all sessions for sites in their company
      if (req.user.assignedCompany) {
        const Site = (await import("../models/Site.js")).default;
        const sitesInCompany = await Site.find({
          company: req.user.assignedCompany,
        }).distinct("_id");

        query.site = { $in: sitesInCompany };
      }
    } else if (userRole === "siteManager") {
      // Site Manager: see only sessions for their assigned site
      if (req.user.assignedSite) {
        query.site = req.user.assignedSite;
      }
    } else {
      // For regular users (auditors, problemOwners, etc.),
      // filter sessions where they are team members, lead auditor, or auditor
      const userTeamSessions = await Team.find({
        user: userId,
        status: "active",
      }).distinct("auditSession");

      // Include sessions where user is in team, lead auditor, or auditor
      query.$or = [
        { _id: { $in: userTeamSessions } }, // Sessions where user is in team
        { leadAuditor: userId }, // Sessions where user is lead auditor
        { auditor: userId }, // Sessions where user is auditor
      ];
    }
  }

  // Step 6: Find data, populate relationships, and sort
  const auditSessions = await AuditSession.find(query)
    .populate("template", "title version") // Populate template details
    .populate("site", "name location") // Populate site details
    .populate("checkType", "name") // Populate checkType name (if exists)
    .populate("schedule", "title startDate endDate") // Populate schedule details
    .populate("leadAuditor", "name email role") // Populate lead auditor
    .populate("auditor", "name email role") // Populate auditor
    .populate({
      path: "teamMembers",
      select: "user roleInTeam",
      populate: {
        path: "user",
        select: "name email role",
      },
    })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 }); // Sort by creation date (or startDate?)

  // Step 6: Count total matching documents
  const count = await AuditSession.countDocuments(query);

  // Standard response format
  res.status(200).json({
    data: auditSessions,
    count: count,
    message: "Audit sessions fetched successfully",
    success: true,
  });
});

// GET /api/audit-sessions/:id - Update population
export const getAuditSessionById = asyncHandler(async (req, res, next) => {
  const auditSession = await AuditSession.findById(req.params.id)
    .populate("template", "title version")
    .populate("site", "name location")
    .populate("checkType", "name")
    .populate("schedule", "title startDate endDate")
    .populate("leadAuditor", "name email role") // Populate lead auditor
    .populate("auditor", "name email role") // Populate auditor
    .populate({
      path: "teamMembers",
      select: "user roleInTeam",
      populate: {
        path: "user",
        select: "name email role",
      },
    })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!auditSession) {
    throw new AppError("Audit session not found", 404);
  }

  res.status(200).json({
    data: auditSession,
    message: "Audit session fetched successfully",
    success: true,
  });
});

// POST /api/audit-sessions - Include new fields, updated error handling
export const createAuditSession = asyncHandler(async (req, res, next) => {
  // Include fields based on the new schema
  const {
    title,
    startDate,
    endDate,
    workflowStatus,
    template,
    site,
    checkType,
    schedule,
    leadAuditor,
    auditor,
  } = req.body;

  // Validation (Required fields from schema)
  if (!template || !site || !schedule) {
    throw new AppError("Template, Site, and Schedule are required", 400);
  }
  // Date validation if dates are provided
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    throw new AppError("End date must be after start date", 400);
  }

  // Fetch schedule to get assignedUser (lead auditor)
  const scheduleDoc = await (
    await import("../models/Schedule.js")
  ).default.findById(schedule);

  // Auto-populate leadAuditor from schedule's assignedUser if not provided
  const finalLeadAuditor = leadAuditor || scheduleDoc?.assignedUser || null;

  const newAuditSession = new AuditSession({
    title: title || null, // Handle optional title
    startDate: startDate || null, // Handle optional dates
    endDate: endDate || null,
    workflowStatus: workflowStatus || "planned", // Use provided or default
    template,
    site,
    schedule,
    checkType: checkType || null, // Handle optional checkType
    leadAuditor: finalLeadAuditor, // Auto-populated from schedule
    auditor: auditor || null, // Handle optional auditor
    ...createdBy(req),
    // status defaults to 'active'
  });

  let savedAuditSession = await newAuditSession.save(); // Mongoose validates enum, required, unique index

  // Auto-create team entry for lead auditor if specified
  if (savedAuditSession.leadAuditor) {
    const Team = (await import("../models/Team.js")).default;

    // Check if team entry already exists
    const existingTeamEntry = await Team.findOne({
      auditSession: savedAuditSession._id,
      user: savedAuditSession.leadAuditor,
    });

    if (!existingTeamEntry) {
      await Team.create({
        auditSession: savedAuditSession._id,
        user: savedAuditSession.leadAuditor,
        roleInTeam: "lead",
        ...createdBy(req),
      });
    }
  }

  // Repopulate for response
  savedAuditSession = await AuditSession.findById(savedAuditSession._id)
    .populate("template", "title version")
    .populate("site", "name location")
    .populate("checkType", "name")
    .populate("schedule", "title startDate endDate")
    .populate("leadAuditor", "name email role")
    .populate("auditor", "name email role")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedAuditSession,
    message: "Audit session created successfully",
    success: true,
  });
});

// PUT /api/audit-sessions/:id - Include new fields, updated error handling
export const updateAuditSession = asyncHandler(async (req, res, next) => {
  // Include all updatable fields from schema
  const {
    title,
    startDate,
    endDate,
    workflowStatus,
    template,
    site,
    checkType,
    schedule,
    leadAuditor,
    auditor,
    status,
  } = req.body;
  const auditSessionId = req.params.id;

  // Validation (Required fields cannot be removed)
  if (template === null || site === null || schedule === null) {
    throw new AppError("Template, Site, and Schedule cannot be removed", 400);
  }
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    throw new AppError("End date must be after start date", 400);
  }

  // Build update object dynamically (only include fields present in req.body)
  const updateData = { ...updatedBy(req) };
  if (title !== undefined) updateData.title = title; // Allow setting title to empty string
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (workflowStatus) updateData.workflowStatus = workflowStatus;
  if (template) updateData.template = template; // Assuming you might want to change template? Risky.
  if (site) updateData.site = site; // Change site? Maybe restrict this.
  if (checkType !== undefined) updateData.checkType = checkType; // Allow setting/unsetting
  if (schedule) updateData.schedule = schedule; // Change schedule? Maybe restrict.
  if (leadAuditor !== undefined) updateData.leadAuditor = leadAuditor; // Allow setting/unsetting lead auditor
  if (auditor !== undefined) updateData.auditor = auditor; // Allow setting/unsetting auditor
  if (status === "active" || status === "inactive") updateData.status = status;

  let updatedAuditSession = await AuditSession.findByIdAndUpdate(
    auditSessionId,
    updateData,
    { new: true, runValidators: true } // runValidators ensures enum, date validation
  );

  if (!updatedAuditSession) {
    throw new AppError("Audit session not found", 404);
  }

  // Repopulate for response
  updatedAuditSession = await AuditSession.findById(updatedAuditSession._id)
    .populate("template", "title version")
    .populate("site", "name location")
    .populate("checkType", "name")
    .populate("schedule", "title startDate endDate")
    .populate("leadAuditor", "name email role")
    .populate("auditor", "name email role")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedAuditSession,
    message: "Audit session updated successfully",
    success: true,
  });
});

// DELETE /api/audit-sessions/:id - No changes needed
export const deleteAuditSession = asyncHandler(async (req, res, next) => {
  const deletedAuditSession = await AuditSession.findByIdAndDelete(
    req.params.id
  );
  if (!deletedAuditSession) {
    throw new AppError("Audit session not found", 404);
  }
  res.status(200).json({
    message: "Audit session deleted successfully",
    success: true,
    data: deletedAuditSession,
  });
});

// POST /api/audit-sessions/:id/close - Close an audit session
export const closeAuditSession = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { closureNotes } = req.body;

  // Find the audit session
  const auditSession = await AuditSession.findById(id);
  if (!auditSession) {
    throw new AppError("Audit session not found", 404);
  }

  // Check if already closed
  if (auditSession.workflowStatus === "completed") {
    throw new AppError("Audit session is already closed", 400);
  }

  // Validation: Check if all problems are resolved
  const Problem = (await import("../models/Problem.js")).default;
  const unresolvedProblems = await Problem.find({
    auditSession: id,
    problemStatus: { $nin: ["Closed", "Resolved"] },
  });

  if (unresolvedProblems.length > 0) {
    throw new AppError(
      `Cannot close audit. ${unresolvedProblems.length} problem(s) still unresolved. Please resolve all problems before closing the audit.`,
      400
    );
  }

  // Update audit session to completed and lock it
  const closedSession = await AuditSession.findByIdAndUpdate(
    id,
    {
      workflowStatus: "completed",
      endDate: new Date(),
      isLocked: true, // ✅ Lock the audit
      closedBy: req.user._id, // ✅ Track who closed it
      closedAt: new Date(), // ✅ Track when closed
      closureNotes: closureNotes || "", // ✅ Save closure notes
      ...updatedBy(req),
    },
    { new: true, runValidators: true }
  )
    .populate("template", "title version")
    .populate("site", "name")
    .populate("checkType", "name")
    .populate("schedule", "title scheduledDate")
    .populate("leadAuditor", "name email")
    .populate("auditor", "name email")
    .populate("closedBy", "name email") // ✅ Populate who closed it
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: closedSession,
    message: "Audit session closed successfully and locked",
    success: true,
    closureNotes: closureNotes || "No closure notes provided",
  });
});
