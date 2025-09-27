import AuditSession from "../models/AuditSession.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllAuditSessions = async (req, res) => {
  try {
    const auditSessions = await AuditSession.find()
      .populate("template", "title")
      .populate("site", "name")
      .populate("checkType", "name")
      .populate("schedule", "title")
      .populate("createdBy", "name email");
    res.status(200).json({
      auditSessions,
      message: "Audit sessions retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getAuditSessionById = async (req, res) => {
  try {
    const auditSession = await AuditSession.findById(req.params.id)
      .populate("template", "title")
      .populate("site", "name")
      .populate("checkType", "name")
      .populate("schedule", "title")
      .populate("createdBy", "name email");
    if (!auditSession) {
      return res.status(404).json({ message: "Audit session not found" });
    }
    res.status(200).json({
      auditSession,
      message: "Audit session retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createAuditSession = async (req, res) => {
  try {
    const { startDate, endDate, workflowStatus, template, site, checkType, schedule } =
      req.body;

    if (!template || !site || !checkType || !schedule) {
      return res.status(400).json({
        message: "Template, site, check type, and schedule are required",
      });
    }

    const newAuditSession = new AuditSession({
      startDate,
      endDate,
      workflowStatus,
      template,
      site,
      checkType,
      schedule,
      ...createdBy(req),
    });
    const savedAuditSession = await newAuditSession.save();
    res.status(201).json({
      savedAuditSession,
      message: "Audit session created successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating audit session" });
  }
};

export const updateAuditSession = async (req, res) => {
  try {
    const { startDate, endDate, status, template, site, checkType, schedule } =
      req.body;
    const auditSessionId = req.params.id;

    const updatedAuditSession = await AuditSession.findByIdAndUpdate(
      auditSessionId,
      {
        startDate,
        endDate,
        status,
        template,
        site,
        checkType,
        schedule,
        ...updatedBy(req),
      },
      { new: true, runValidators: true }
    );

    if (!updatedAuditSession) {
      return res.status(404).json({ message: "Audit session not found" });
    }

    res.status(200).json({
      updatedAuditSession,
      message: "Audit session updated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating audit session" });
  }
};

export const deleteAuditSession = async (req, res) => {
  try {
    const deletedAuditSession = await AuditSession.findByIdAndDelete(
      req.params.id
    );
    if (!deletedAuditSession) {
      return res.status(404).json({ message: "Audit session not found" });
    }
    res.status(200).json({ message: "Audit session deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting audit session" });
  }
};
