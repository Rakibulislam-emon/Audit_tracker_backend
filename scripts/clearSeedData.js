import mongoose from "mongoose";
import Company from "../src/models/Company.js";
import Site from "../src/models/Site.js";
import CheckType from "../src/models/CheckType.js";
import Rule from "../src/models/Rule.js";
import Question from "../src/models/Question.js";
import Template from "../src/models/Template.js";
import Program from "../src/models/Program.js";
import Schedule from "../src/models/Schedule.js";
import AuditSession from "../src/models/AuditSession.js";
import Team from "../src/models/Team.js";
import QuestionAssignment from "../src/models/QuestionAssignment.js";
import Observation from "../src/models/Observation.js";
import Problem from "../src/models/Problem.js";
import FixAction from "../src/models/FixAction.js";
import Approval from "../src/models/Approval.js";
import Report from "../src/models/Report.js";
import connectDB from "../src/config/db.js";

const clearSeedData = async () => {
  try {
    await connectDB();
    console.log("\n🧹 Starting seed data cleanup...\n");

    // Clear  in reverse order of dependencies
    const collections = [
      { name: "Approvals", model: Approval },
      { name: "FixActions", model: FixAction },
      { name: "Problems", model: Problem },
      { name: "Observations", model: Observation },
      { name: "QuestionAssignments", model: QuestionAssignment },
      { name: "Teams", model: Team },
      { name: "AuditSessions", model: AuditSession },
      { name: "Schedules", model: Schedule },
      { name: "Programs", model: Program },
      { name: "Templates", model: Template },
      { name: "Questions", model: Question },
      { name: "Rules", model: Rule },
      { name: "CheckTypes", model: CheckType },
      { name: "Sites", model: Site },
      { name: "Companies", model: Company },
      { name: "Reports", model: Report },
    ];

    for (const collection of collections) {
      const count = await collection.model.countDocuments();
      await collection.model.deleteMany({});
      console.log(`  ✅ Cleared ${count} ${collection.name}`);
    }

    console.log("\n✅ Seed data cleanup completed successfully!");
    console.log("⚠️  Note: Users and Groups were NOT deleted\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    process.exit(1);
  }
};

clearSeedData();
