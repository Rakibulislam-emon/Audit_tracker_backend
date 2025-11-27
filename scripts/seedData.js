import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Company from "../src/models/Company.js";
import Site from "../src/models/Site.js";
import CheckType from "../src/models/CheckType.js";
import Rule from "../src/models/Rule.js";
import Question from "../src/models/Question.js";
import Group from "../src/models/Group.js";
import User from "../src/models/User.js";
import Template from "../src/models/Template.js";
import Program from "../src/models/Program.js";

const seedData = async () => {
  try {
    await connectDB();

    console.log("🌱 Starting data seeding...");

    // 1. Get an existing Group
    const group = await Group.findOne();
    if (!group) {
      console.error("❌ No Group found. Please create a Group first.");
      process.exit(1);
    }
    console.log(`✅ Using Group: ${group.name}`);

    // 2. Get an existing User for createdBy/updatedBy
    const user = await User.findOne();
    if (!user) {
      console.error("❌ No User found. Please create a User first.");
      process.exit(1);
    }
    const userId = user._id;
    console.log(`✅ Using User: ${user.email || user.username || userId}`);

    // 3. Create Company
    const company = await Company.create({
      name: "Acme Corp",
      group: group._id,
      sector: "Manufacturing",
      address: "123 Industrial Way",
      createdBy: userId,
      updatedBy: userId,
    });
    console.log(`✅ Created Company: ${company.name}`);

    // 4. Create Sites
    const sites = await Site.insertMany([
      {
        name: "Factory A",
        location: "New York",
        company: company._id,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "Warehouse B",
        location: "New Jersey",
        company: company._id,
        createdBy: userId,
        updatedBy: userId,
      },
    ]);
    console.log(`✅ Created ${sites.length} Sites`);

    // 5. Create CheckTypes
    const checkTypes = await CheckType.insertMany([
      {
        name: "Safety",
        description: "Safety compliance checks",
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "Hygiene",
        description: "Hygiene and cleanliness checks",
        createdBy: userId,
        updatedBy: userId,
      },
    ]);
    console.log(`✅ Created ${checkTypes.length} CheckTypes`);

    // 6. Create Rules
    const safetyCheckType = checkTypes.find((ct) => ct.name === "Safety");
    const hygieneCheckType = checkTypes.find((ct) => ct.name === "Hygiene");

    const rules = await Rule.insertMany([
      {
        name: "Fire Safety",
        ruleCode: "SAF-001",
        checkType: safetyCheckType._id,
        description: "Ensure fire extinguishers are present and valid.",
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "PPE Compliance",
        ruleCode: "SAF-002",
        checkType: safetyCheckType._id,
        description: "Ensure all staff are wearing appropriate PPE.",
        createdBy: userId,
        updatedBy: userId,
      },
      {
        name: "Hand Washing",
        ruleCode: "HYG-001",
        checkType: hygieneCheckType._id,
        description: "Ensure hand washing stations are stocked.",
        createdBy: userId,
        updatedBy: userId,
      },
    ]);
    console.log(`✅ Created ${rules.length} Rules`);

    // 7. Create Questions
    const fireRule = rules.find((r) => r.ruleCode === "SAF-001");
    const ppeRule = rules.find((r) => r.ruleCode === "SAF-002");
    const handWashRule = rules.find((r) => r.ruleCode === "HYG-001");

    const questions = await Question.insertMany([
      {
        section: "General",
        questionText: "Are fire extinguishers visible and accessible?",
        responseType: "yes/no",
        severityDefault: "High",
        weight: 5,
        rule: fireRule._id,
        checkType: safetyCheckType._id,
        applicableSites: [], // All sites
        createdBy: userId,
        updatedBy: userId,
      },
      {
        section: "General",
        questionText: "Is the expiry date on the extinguisher valid?",
        responseType: "yes/no",
        severityDefault: "Critical",
        weight: 8,
        rule: fireRule._id,
        checkType: safetyCheckType._id,
        applicableSites: [sites[0]._id], // Only Factory A
        createdBy: userId,
        updatedBy: userId,
      },
      {
        section: "Staff",
        questionText: "Are all employees wearing safety helmets?",
        responseType: "yes/no",
        severityDefault: "Medium",
        weight: 3,
        rule: ppeRule._id,
        checkType: safetyCheckType._id,
        applicableSites: [],
        createdBy: userId,
        updatedBy: userId,
      },
      {
        section: "Facilities",
        questionText: "Is soap available at all hand washing stations?",
        responseType: "yes/no",
        severityDefault: "Medium",
        weight: 3,
        rule: handWashRule._id,
        checkType: hygieneCheckType._id,
        applicableSites: [],
        createdBy: userId,
        updatedBy: userId,
      },
    ]);
    console.log(`✅ Created ${questions.length} Questions`);

    // 8. Create Template
    // Filter questions that belong to the Safety CheckType
    const safetyQuestions = questions.filter(
      (q) => q.checkType.toString() === safetyCheckType._id.toString()
    );

    const template = await Template.create({
      title: "Monthly Safety Audit",
      description: "Standard safety compliance audit template.",
      version: "1.0",
      checkType: safetyCheckType._id,
      questions: safetyQuestions.map((q) => q._id),
      createdBy: userId,
      updatedBy: userId,
    });
    console.log(`✅ Created Template: ${template.title}`);

    // 9. Create Program
    const program = await Program.create({
      name: "2024 Safety Compliance Program",
      description: "Monthly safety audits for all factories.",
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      template: template._id,
      frequency: "monthly",
      responsibleDept: "EHS",
      programStatus: "in-progress",
      createdBy: userId,
      updatedBy: userId,
    });
    console.log(`✅ Created Program: ${program.name}`);

    console.log("🎉 Data seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
