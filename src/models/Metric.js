import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const metricSchema = new mongoose.Schema(
  {
    // Which audit session this metric belongs to
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: true,
    },

    // Metric identification
    metricName: {
      type: String,
      required: true,
      trim: true,
    },

    metricCategory: {
      type: String,
      required: true,
      enum: [
        "compliance", // Compliance scores
        "risk", // Risk assessments
        "efficiency", // Time and resource efficiency
        "quality", // Quality metrics
        "safety", // Safety performance
        "financial", // Cost-related metrics
        "custom", // Custom metrics
      ],
      default: "compliance",
    },

    // Metric value - can be number, percentage, or string
    metricValue: {
      type: mongoose.Schema.Types.Mixed, // Can be Number, String, or Decimal128
      required: true,
    },

    metricUnit: {
      type: String,
      required: true,
      enum: [
        "percentage", // 85%
        "number", // 15
        "score", // 8.5/10
        "rating", // High, Medium, Low
        "currency", // $5000
        "days", // 15 days
        "hours", // 24 hours
        "custom", // Custom unit
      ],
      default: "percentage",
    },

    // For numeric metrics - range and thresholds
    thresholds: {
      min: { type: Number },
      max: { type: Number },
      target: { type: Number },
      warning: { type: Number }, // Warning threshold
      critical: { type: Number }, // Critical threshold
    },

    // Calculation details
    calculationMethod: {
      type: String,
      enum: [
        "auto-calculated",
        "manual-entry",
        "formula-based",
        "system-generated",
      ],
      default: "auto-calculated",
    },

    formula: String, // If calculated by formula

    // Time period for the metric
    timePeriod: {
      startDate: Date,
      endDate: Date,
      periodType: {
        type: String,
        enum: ["daily", "weekly", "monthly", "quarterly", "yearly", "custom"],
        default: "custom",
      },
    },

    // Trend analysis
    trend: {
      direction: {
        type: String,
        enum: ["improving", "declining", "stable", "volatile"],
        default: "stable",
      },
      previousValue: mongoose.Schema.Types.Mixed,
      changePercentage: Number,
      changeAmount: Number,
    },

    // Benchmarking
    benchmark: {
      industryAverage: Number,
      targetValue: Number,
      previousYear: Number,
      isAboveBenchmark: Boolean,
    },

    // Data source and reliability
    dataSource: {
      type: String,
      enum: [
        "audit-findings",
        "system-calculation",
        "manual-input",
        "external-source",
        "survey-data",
      ],
      default: "audit-findings",
    },

    reliabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },

    // Visualization preferences
    visualization: {
      chartType: {
        type: String,
        enum: ["bar", "line", "pie", "gauge", "trend", "radar", "none"],
        default: "bar",
      },
      displayOrder: Number,
      isVisible: {
        type: Boolean,
        default: true,
      },
      colorCode: String, // Hex color for charts
    },

    // Additional metadata
    description: String,
    tags: [String],

    calculatedAt: {
      type: Date,
      default: Date.now,
    },

    // Metric-specific status based on thresholds
    metricStatus: {
      type: String,
      enum: ["excellent", "good", "warning", "critical", "unknown"],
      default: "unknown",
    },

    ...commonFields,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
metricSchema.index({ auditSession: 1, metricCategory: 1 });
metricSchema.index({ metricName: 1 });
metricSchema.index({ calculatedAt: -1 });
metricSchema.index({ "timePeriod.startDate": 1, "timePeriod.endDate": 1 });

// Pre-save middleware to calculate metricStatus based on thresholds
metricSchema.pre("save", function (next) {
  if (typeof this.metricValue === "number") {
    if (
      this.thresholds.critical &&
      this.metricValue <= this.thresholds.critical
    ) {
      this.metricStatus = "critical";
    } else if (
      this.thresholds.warning &&
      this.metricValue <= this.thresholds.warning
    ) {
      this.metricStatus = "warning";
    } else if (
      this.thresholds.target &&
      this.metricValue >= this.thresholds.target
    ) {
      this.metricStatus = "excellent";
    } else {
      this.metricStatus = "good";
    }
  } else {
    this.metricStatus = "unknown";
  }
  next();
});

// Static method to get metrics by category
metricSchema.statics.getByCategory = function (auditSessionId, category) {
  return this.find({
    auditSession: auditSessionId,
    metricCategory: category,
  }).sort({ "visualization.displayOrder": 1 });
};

// Static method to get latest metrics for dashboard
metricSchema.statics.getDashboardMetrics = function (auditSessionId) {
  return this.find({
    auditSession: auditSessionId,
    "visualization.isVisible": true,
  })
    .sort({ "visualization.displayOrder": 1 })
    .limit(10);
};

// Method to update trend data
metricSchema.methods.updateTrend = async function (previousValue) {
  if (
    typeof this.metricValue === "number" &&
    typeof previousValue === "number"
  ) {
    this.trend.previousValue = previousValue;
    this.trend.changeAmount = this.metricValue - previousValue;

    if (previousValue !== 0) {
      this.trend.changePercentage =
        ((this.metricValue - previousValue) / previousValue) * 100;
    }

    // Determine trend direction
    if (this.trend.changePercentage > 5) {
      this.trend.direction = "improving";
    } else if (this.trend.changePercentage < -5) {
      this.trend.direction = "declining";
    } else {
      this.trend.direction = "stable";
    }

    await this.save();
  }
};

export default mongoose.models.Metric || mongoose.model("Metric", metricSchema);
