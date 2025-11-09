import Metric from "../models/Metric.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// ১. Get all metrics with filtering
export const getAllMetrics = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ২. Get metric by ID
export const getMetricById = async (req, res) => {
  try {
    const metric = await Metric.findById(req.params.id)
      .populate("auditSession", "title site template startDate endDate")
      .populate("createdBy", "name email");

    if (!metric) {
      return res.status(404).json({ message: "Metric not found" });
    }

    res.status(200).json({
      metric,
      message: "Metric retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৩. Create new metric
export const createMetric = async (req, res) => {
  try {
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
      return res.status(400).json({
        message: "Audit session, metric name, value, and unit are required",
      });
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
  } catch (error) {
    res.status(400).json({ message: "Error creating metric" });
  }
};

// ৪. Update metric
export const updateMetric = async (req, res) => {
  try {
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
      return res.status(404).json({ message: "Metric not found" });
    }

    res.status(200).json({
      updatedMetric,
      message: "Metric updated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating metric" });
  }
};

// ৫. Delete metric
export const deleteMetric = async (req, res) => {
  try {
    const deletedMetric = await Metric.findByIdAndDelete(req.params.id);

    if (!deletedMetric) {
      return res.status(404).json({ message: "Metric not found" });
    }

    res.status(200).json({ message: "Metric deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting metric" });
  }
};

// ৬. Get metrics by audit session
export const getMetricsByAuditSession = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৭. Get dashboard metrics (visible metrics for dashboard)
export const getDashboardMetrics = async (req, res) => {
  try {
    const { auditSessionId } = req.params;

    const metrics = await Metric.getDashboardMetrics(auditSessionId);

    res.status(200).json({
      metrics,
      message: "Dashboard metrics retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৮. Bulk create metrics (for auto-calculation)
export const bulkCreateMetrics = async (req, res) => {
  try {
    const { metrics } = req.body;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ message: "Metrics array is required" });
    }

    // Validate each metric
    for (const metric of metrics) {
      if (
        !metric.auditSession ||
        !metric.metricName ||
        !metric.metricValue ||
        !metric.metricUnit
      ) {
        return res.status(400).json({
          message:
            "Each metric must have auditSession, metricName, metricValue, and metricUnit",
        });
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
  } catch (error) {
    res.status(400).json({ message: "Error creating metrics in bulk" });
  }
};

// ৯. Calculate and auto-generate metrics from audit session
export const calculateMetricsFromAudit = async (req, res) => {
  try {
    const { auditSessionId } = req.body;

    if (!auditSessionId) {
      return res.status(400).json({ message: "Audit session ID is required" });
    }

    // Import required models
    const Problem = (await import("./Problem.js")).default;
    const Observation = (await import("./Observation.js")).default;
    const AuditSession = (await import("./AuditSession.js")).default;

    // Get audit session data
    const auditSession = await AuditSession.findById(auditSessionId)
      .populate("site", "name")
      .populate("template", "title");

    if (!auditSession) {
      return res.status(404).json({ message: "Audit session not found" });
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
    const FixAction = (await import("./FixAction.js")).default;
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
  } catch (error) {
    console.error("Error calculating metrics:", error);
    res
      .status(400)
      .json({ message: "Error calculating metrics from audit data" });
  }
};

// ১০. Get metric statistics
export const getMetricStatistics = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
// comment for streak