import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Approval from "../src/models/Approval.js";
import AuditSession from "../src/models/AuditSession.js";
import CheckType from "../src/models/CheckType.js";
import Company from "../src/models/Company.js";
import FixAction from "../src/models/FixAction.js";
import Metric from "../src/models/Metric.js";
import Observation from "../src/models/Observation.js";
import Problem from "../src/models/Problem.js";
import Program from "../src/models/Program.js";
import Proof from "../src/models/Proof.js";
import Question from "../src/models/Question.js";
import QuestionRuleLink from "../src/models/QuestionRuleLink.js";
import Report from "../src/models/Report.js";
import Rule from "../src/models/Rule.js";
import Schedule from "../src/models/Schedule.js";
import Site from "../src/models/Site.js";
import Team from "../src/models/Team.js";
import Template from "../src/models/Template.js";
// User and Group are excluded

const clearData = async () => {
  try {
    await connectDB();

    const models = [
      Approval,
      AuditSession,
      CheckType,
      Company,
      FixAction,
      Metric,
      Observation,
      Problem,
      Program,
      Proof,
      Question,
      QuestionRuleLink,
      Report,
      Rule,
      Schedule,
      Site,
      Team,
      Template,
    ];

    console.log("⚠️  Starting data cleanup...");

    for (const model of models) {
      const modelName = model.modelName;
      const count = await model.countDocuments();
      if (count > 0) {
        await model.deleteMany({});
        console.log(`✅ Cleared ${count} documents from ${modelName}`);
      } else {
        console.log(`ℹ️  ${modelName} is already empty`);
      }
    }

    console.log(
      "🎉 Data cleanup completed successfully (Users and Groups preserved)."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    process.exit(1);
  }
};

clearData();
