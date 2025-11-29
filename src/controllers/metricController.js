import Metric from "../models/Metric.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// 1. Get all metrics with filtering
export const getAllMetrics = asyncHandler(async (req, res, next) => {
  const {
    auditSession,
    metricCategory,
    metricName,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  // Build filter object
  const filter = {};
  if (auditSession) filter.auditSession = auditSession;
  if (metricCategory) filter.metricCategory = metricCategory;
  if (metricName) filter.metricName = { $regex: metricName, $options: "i" };

  // Date range filter
  if (startDate || endDate) {
    filter.calculatedAt = {};
    if (startDate) filter.calculatedAt.$gte = new Date(startDate);
    if (endDate) filter.calculatedAt.$lte = new Date(endDate);
  }

  const metrics = await Metric.find(filter)
    .populate("auditSession", "title site template")
    .populate("createdBy", "name email")
    .sort({ calculatedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Metric.countDocuments(filter);

  res.status(200).json({
    metrics,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
    message: "Metrics retrieved successfully",
  });
});

// 2. Get metric by ID
export const getMetricById = asyncHandler(async (req, res, next) => {
  const metric = await Metric.findById(req.params.id)
    .populate("auditSession", "title site template startDate endDate")
    .populate("createdBy", "name email");

  if (!metric) {
    throw new AppError("Metric not found", 404);
  }

  res.status(200).json({
    metric,
    message: "Metric retrieved successfully",
  });
});

// 3. Create new metric
export const createMetric = asyncHandler(async (req, res, next) => {
  const {
    auditSession,
    metricName,
    metricCategory,
    metricValue,
    metricUnit,
    thresholds,
    calculationMethod,
    timePeriod,
    description,
    tags,
    visualization,
  } = req.body;

  // Validation
  if (!auditSession || !metricName || !metricValue || !metricUnit) {
    throw new AppError(
      "Audit session, metric name, value, and unit are required",
      400
    );
  }

  const newMetric = new Metric({
    auditSession,
    metricName,
    metricCategory: metricCategory || "compliance",
    metricValue,
    metricUnit,
    thresholds: thresholds || {},
    calculationMethod: calculationMethod || "manual-entry",
    timePeriod: timePeriod || {},
    description,
    tags: tags || [],
    visualization: visualization || {},
    calculatedAt: new Date(),
    ...createdBy(req),
  });

  const savedMetric = await newMetric.save();

  res.status(201).json({
    savedMetric,
    message: "Metric created successfully",
  });
});

// 4. Update metric
export const updateMetric = asyncHandler(async (req, res, next) => {
  const {
    metricName,
    metricValue,
    metricUnit,
    thresholds,
    description,
    tags,
    visualization,
  } = req.body;

  const metricId = req.params.id;

  const updateData = {
    metricName,
    metricValue,
    metricUnit,
    thresholds,
    description,
    tags,
    visualization,
    calculatedAt: new Date(), // Update calculation time
    ...updatedBy(req),
  };

  const updatedMetric = await Metric.findByIdAndUpdate(metricId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedMetric) {
    throw new AppError("Metric not found", 404);
  }

  res.status(200).json({
    updatedMetric,
    message: "Metric updated successfully",
  });
});

// 5. Delete metric
export const deleteMetric = asyncHandler(async (req, res, next) => {
  const deletedMetric = await Metric.findByIdAndDelete(req.params.id);

  if (!deletedMetric) {
    throw new AppError("Metric not found", 404);
  }

  res.status(200).json({ message: "Metric deleted successfully" });
});

// 6. Get metrics by audit session
export const getMetricsByAuditSession = asyncHandler(async (req, res, next) => {
  const { auditSessionId } = req.params;
  const { category } = req.query;

  let metrics;
  if (category) {
    metrics = await Metric.getByCategory(auditSessionId, category);
  } else {
    metrics = await Metric.find({ auditSession: auditSessionId })
      .populate("createdBy", "name email")
      .sort({ calculatedAt: -1 });
  }

  res.status(200).json({
    metrics,
    message: "Metrics retrieved successfully for audit session",
  });
});

// 7. Get dashboard metrics (visible metrics for dashboard)
export const getDashboardMetrics = asyncHandler(async (req, res, next) => {
  const { auditSessionId } = req.params;

  const metrics = await Metric.getDashboardMetrics(auditSessionId);

  res.status(200).json({
    metrics,
    message: "Dashboard metrics retrieved successfully",
  });
});

// 8. Bulk create metrics (for auto-calculation)
export const bulkCreateMetrics = asyncHandler(async (req, res, next) => {
  const { metrics } = req.body;

  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    throw new AppError("Metrics array is required", 400);
  }

  // Validate each metric
  for (const metric of metrics) {
    if (
      !metric.auditSession ||
      !metric.metricName ||
      !metric.metricValue ||
      !metric.metricUnit
    ) {
      throw new AppError(
        "Each metric must have auditSession, metricName, metricValue, and metricUnit",
        400
      );
    }
  }

  const createdMetrics = await Metric.insertMany(
    metrics.map((metric) => ({
      ...metric,
      calculationMethod: "auto-calculated",
      calculatedAt: new Date(),
      ...createdBy(req),
    }))
  );

  res.status(201).json({
    metrics: createdMetrics,
    message: `${createdMetrics.length} metrics created successfully`,
  });
});

// 9. Calculate and auto-generate metrics from audit session
export const calculateMetricsFromAudit = asyncHandler(
  async (req, res, next) => {
    const { auditSessionId } = req.body;

    if (!auditSessionId) {
      throw new AppError("Audit session ID is required", 400);
    }

    // Import required models
    const Problem = (await import("../models/Problem.js")).default;
    const Observation = (await import("../models/Observation.js")).default;
    const AuditSession = (await import("../models/AuditSession.js")).default;

    // Get audit session data
    const auditSession = await AuditSession.findById(auditSessionId)
      .populate("site", "name")
      .populate("template", "title");

    if (!auditSession) {
      throw new AppError("Audit session not found", 404);
    }

    // Get problems for this audit session
    const problems = await Problem.find({ auditSession: auditSessionId });

    // Get observations for this audit session
    const observations = await Observation.find({
      auditSession: auditSessionId,
    });

    // Calculate basic metrics
    const metrics = [];

    // 1. Compliance Score
    const totalObservations = observations.length;
    const compliantObservations = observations.filter(
      (obs) => obs.response === "Yes" || obs.response === "Compliant"
    ).length;
    const complianceScore =
      totalObservations > 0
        ? (compliantObservations / totalObservations) * 100
        : 0;

    metrics.push({
      auditSession: auditSessionId,
      metricName: "Compliance Score",
      metricCategory: "compliance",
      metricValue: Math.round(complianceScore),
      metricUnit: "percentage",
      thresholds: {
        min: 0,
        max: 100,
        target: 85,
        warning: 70,
        critical: 50,
      },
      description: `Overall compliance score based on ${totalObservations} observations`,
      visualization: {
        chartType: "gauge",
        displayOrder: 1,
        colorCode:
          complianceScore >= 85
            ? "#10B981"
            : complianceScore >= 70
            ? "#F59E0B"
            : "#EF4444",
      },
    });

    // 2. Risk Distribution
    const criticalProblems = problems.filter(
      (p) => p.riskRating === "critical"
    ).length;
    const highRiskProblems = problems.filter(
      (p) => p.riskRating === "high"
    ).length;
    const mediumRiskProblems = problems.filter(
      (p) => p.riskRating === "medium"
    ).length;
    const lowRiskProblems = problems.filter(
      (p) => p.riskRating === "low"
    ).length;
    const totalProblems = problems.length;

    metrics.push({
      auditSession: auditSessionId,
      metricName: "Critical Problems",
      metricCategory: "risk",
      metricValue: criticalProblems,
      metricUnit: "number",
      description: "Number of critical risk problems identified",
      visualization: {
        chartType: "bar",
        displayOrder: 2,
        colorCode: "#EF4444",
      },
    });

    metrics.push({
      auditSession: auditSessionId,
      metricName: "High Risk Problems",
      metricCategory: "risk",
      metricValue: highRiskProblems,
      metricUnit: "number",
      description: "Number of high risk problems identified",
      visualization: {
        chartType: "bar",
        displayOrder: 3,
        colorCode: "#F59E0B",
      },
    });

    // 3. Overall Risk Rating
    let overallRiskRating = "Low";
    if (criticalProblems > 0) overallRiskRating = "Critical";
    else if (highRiskProblems > 2) overallRiskRating = "High";
    else if (mediumRiskProblems > 5) overallRiskRating = "Medium";

    metrics.push({
      auditSession: auditSessionId,
      metricName: "Overall Risk Rating",
      metricCategory: "risk",
      metricValue: overallRiskRating,
      metricUnit: "rating",
      description: "Overall risk assessment based on problem severity",
      visualization: {
        chartType: "gauge",
        displayOrder: 4,
        colorCode:
          overallRiskRating === "Critical"
            ? "#EF4444"
            : overallRiskRating === "High"
            ? "#F59E0B"
            : overallRiskRating === "Medium"
            ? "#EAB308"
            : "#10B981",
      },
    });

    // 4. Problem Resolution Rate (if there are fix actions)
    const FixAction = (await import("../models/FixAction.js")).default;
    const fixActions = await FixAction.find({
      problem: { $in: problems.map((p) => p._id) },
    });

    const completedActions = fixActions.filter(
      (fa) => fa.status === "completed"
    ).length;
    const resolutionRate =
      fixActions.length > 0 ? (completedActions / fixActions.length) * 100 : 0;

    metrics.push({
      auditSession: auditSessionId,
      metricName: "Problem Resolution Rate",
      metricCategory: "efficiency",
      metricValue: Math.round(resolutionRate),
      metricUnit: "percentage",
      description: `Percentage of problems with completed resolution actions`,
      visualization: {
        chartType: "line",
        displayOrder: 5,
        colorCode:
          resolutionRate >= 80
            ? "#10B981"
            : resolutionRate >= 50
            ? "#F59E0B"
            : "#EF4444",
      },
    });

    // Save all metrics
    const createdMetrics = await Metric.insertMany(
      metrics.map((metric) => ({
        ...metric,
        calculationMethod: "auto-calculated",
        calculatedAt: new Date(),
        ...createdBy(req),
      }))
    );

    res.status(201).json({
      metrics: createdMetrics,
      message: `${createdMetrics.length} metrics calculated and created successfully from audit data`,
    });
  }
);

// 10. Get metric statistics
export const getMetricStatistics = asyncHandler(async (req, res, next) => {
  const { auditSessionId } = req.params;

  const stats = await Metric.aggregate([
    {
      $match: { auditSession: auditSessionId },
    },
    {
      $group: {
        _id: "$metricCategory",
        count: { $sum: 1 },
        avgValue: { $avg: "$metricValue" },
        minValue: { $min: "$metricValue" },
        maxValue: { $max: "$metricValue" },
      },
    },
  ]);

  const totalMetrics = await Metric.countDocuments({
    auditSession: auditSessionId,
  });

  res.status(200).json({
    statistics: {
      totalMetrics,
      byCategory: stats,
    },
    message: "Metric statistics retrieved successfully",
  });
});
