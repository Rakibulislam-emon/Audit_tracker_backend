import mongoose from "mongoose";
import bcrypt from "bcryptjs";
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
import Schedule from "../src/models/Schedule.js";
import AuditSession from "../src/models/AuditSession.js";
import Team from "../src/models/Team.js";
import QuestionAssignment from "../src/models/QuestionAssignment.js";
import Observation from "../src/models/Observation.js";
import Problem from "../src/models/Problem.js";
import FixAction from "../src/models/FixAction.js";
import Approval from "../src/models/Approval.js";

const seedData = async () => {
  try {
    await connectDB();
    console.log("🌱 Starting comprehensive data seeding...\n");

    // ========== 1. GROUP & USERS ==========
    console.log("📋 Step 1: Groups & Users");
    const group = await Group.findOne();
    if (!group) {
      console.error("❌ No Group found. Please create a Group first.");
      process.exit(1);
    }
    console.log(`✅ Using Group: ${group.name}`);

    // Find or create test users
    const users = {};
    const userConfigs = [
      {
        name: "Admin User",
        email: "admin@acme.com",
        role: "admin",
        scopeLevel: "system",
      },
      {
        name: "Lead Auditor",
        email: "lead.auditor@acme.com",
        role: "auditor",
        scopeLevel: "company",
      },
      {
        name: "Auditor One",
        email: "auditor1@acme.com",
        role: "auditor",
        scopeLevel: "site",
      },
      {
        name: "Auditor Two",
        email: "auditor2@acme.com",
        role: "auditor",
        scopeLevel: "site",
      },
      {
        name: "Site Manager",
        email: "sitemanager@acme.com",
        role: "siteManager",
        scopeLevel: "site",
      },
      {
        name: "Problem Owner",
        email: "problemowner@acme.com",
        role: "problemOwner",
        scopeLevel: "company",
      },
      {
        name: "Approver One",
        email: "approver1@acme.com",
        role: "approver",
        scopeLevel: "company",
      },
      {
        name: "Group Admin",
        email: "groupadmin@acme.com",
        role: "groupAdmin",
        scopeLevel: "group",
      },
    ];

    for (const config of userConfigs) {
      let user = await User.findOne({ email: config.email });
      if (!user) {
        const hashedPassword = await bcrypt.hash("Test@123", 12);
        user = await User.create({
          ...config,
          password: hashedPassword,
          assignedGroup: group._id,
          isActive: true,
        });
        console.log(`  ✅ Created user: ${config.name} (${config.email})`);
      } else {
        console.log(`  ℹ️  Using existing user: ${config.name}`);
      }
      // Map user to appropriate key
      const userKey = config.name.toLowerCase().replace(/ /g, "");
      users[userKey] = user;
    }

    const adminUserId = users.adminuser._id;

    // ========== 2. COMPANIES & SITES ==========
    console.log("\n🏢 Step 2: Companies & Sites");
    const companies = await Company.insertMany([
      {
        name: "Acme Corporation",
        group: group._id,
        sector: "Manufacturing",
        address: "123 Industrial Way",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "TechCorp Industries",
        group: group._id,
        sector: "Technology",
        address: "456 Innovation Drive",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${companies.length} companies`);

    const sites = await Site.insertMany([
      {
        name: "Factory A",
        location: "New York",
        company: companies[0]._id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Warehouse B",
        location: "New Jersey",
        company: companies[0]._id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Office HQ",
        location: "California",
        company: companies[1]._id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Lab Facility",
        location: "Texas",
        company: companies[1]._id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${sites.length} sites`);

    // Update users with site/company assignments
    await User.findByIdAndUpdate(users.auditorone._id, {
      assignedCompany: companies[0]._id,
      assignedSite: sites[0]._id,
    });
    await User.findByIdAndUpdate(users.auditortwo._id, {
      assignedCompany: companies[0]._id,
      assignedSite: sites[1]._id,
    });
    await User.findByIdAndUpdate(users.sitemanager._id, {
      assignedCompany: companies[0]._id,
      assignedSite: sites[0]._id,
    });

    // ========== 3. CHECKTYPES & RULES ==========
    console.log("\n📝 Step 3: CheckTypes & Rules");
    const checkTypes = await CheckType.insertMany([
      {
        name: "Safety",
        description: "Safety compliance checks",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Hygiene",
        description: "Hygiene and cleanliness checks",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Quality",
        description: "Quality assurance checks",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Environmental",
        description: "Environmental compliance",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${checkTypes.length} check types`);

    const rules = await Rule.insertMany([
      {
        name: "Fire Safety",
        ruleCode: "SAF-001",
        checkType: checkTypes[0]._id,
        description: "Fire extinguishers present and valid",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "PPE Compliance",
        ruleCode: "SAF-002",
        checkType: checkTypes[0]._id,
        description: "All staff wearing appropriate PPE",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Hand Washing",
        ruleCode: "HYG-001",
        checkType: checkTypes[1]._id,
        description: "Hand washing stations stocked",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Product Quality",
        ruleCode: "QLT-001",
        checkType: checkTypes[2]._id,
        description: "Products meet quality standards",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Waste Management",
        ruleCode: "ENV-001",
        checkType: checkTypes[3]._id,
        description: "Proper waste disposal procedures",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${rules.length} rules`);

    // ========== 4. QUESTIONS ==========
    console.log("\n❓ Step 4: Questions");
    const questions = await Question.insertMany([
      {
        section: "General",
        questionText: "Are fire extinguishers visible and accessible?",
        responseType: "yes/no",
        severityDefault: "High",
        weight: 5,
        rule: rules[0]._id,
        checkType: checkTypes[0]._id,
        applicableSites: [],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        section: "General",
        questionText: "Is the expiry date on extinguisher valid?",
        responseType: "yes/no",
        severityDefault: "Critical",
        weight: 8,
        rule: rules[0]._id,
        checkType: checkTypes[0]._id,
        applicableSites: [sites[0]._id],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        section: "Staff",
        questionText: "Are all employees wearing safety helmets?",
        responseType: "yes/no",
        severityDefault: "Medium",
        weight: 3,
        rule: rules[1]._id,
        checkType: checkTypes[0]._id,
        applicableSites: [],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        section: "Staff",
        questionText: "Are safety goggles worn in designated areas?",
        responseType: "yes/no",
        severityDefault: "Medium",
        weight: 3,
        rule: rules[1]._id,
        checkType: checkTypes[0]._id,
        applicableSites: [],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        section: "Facilities",
        questionText: "Is soap available at hand washing stations?",
        responseType: "yes/no",
        severityDefault: "Medium",
        weight: 3,
        rule: rules[2]._id,
        checkType: checkTypes[1]._id,
        applicableSites: [],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        section: "Quality",
        questionText: "Are products inspected before shipment?",
        responseType: "yes/no",
        severityDefault: "High",
        weight: 6,
        rule: rules[3]._id,
        checkType: checkTypes[2]._id,
        applicableSites: [],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        section: "Environment",
        questionText: "Is waste properly segregated?",
        responseType: "yes/no",
        severityDefault: "Medium",
        weight: 4,
        rule: rules[4]._id,
        checkType: checkTypes[3]._id,
        applicableSites: [],
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${questions.length} questions`);

    // ========== 5. TEMPLATES ==========
    console.log("\n📄 Step 5: Templates");
    const templates = await Template.insertMany([
      {
        title: "Monthly Safety Audit",
        description: "Standard safety compliance audit",
        version: "1.0",
        checkType: checkTypes[0]._id,
        questions: questions
          .filter(
            (q) => q.checkType.toString() === checkTypes[0]._id.toString()
          )
          .map((q) => q._id),
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        title: "Hygiene Inspection",
        description: "Routine hygiene inspection",
        version: "1.0",
        checkType: checkTypes[1]._id,
        questions: questions
          .filter(
            (q) => q.checkType.toString() === checkTypes[1]._id.toString()
          )
          .map((q) => q._id),
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        title: "Quality Assurance Audit",
        description: "Product quality verification",
        version: "1.0",
        checkType: checkTypes[2]._id,
        questions: questions
          .filter(
            (q) => q.checkType.toString() === checkTypes[2]._id.toString()
          )
          .map((q) => q._id),
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${templates.length} templates`);

    // ========== 6. PROGRAMS ==========
    console.log("\n🎯 Step 6: Programs");
    const now = new Date();
    const programs = await Program.insertMany([
      {
        name: "2024 Safety Compliance Program",
        description: "Monthly safety audits for all factories",
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
        template: templates[0]._id,
        frequency: "monthly",
        responsibleDept: "EHS",
        programStatus: "in-progress",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        name: "Q1 2024 Hygiene Program",
        description: "Quarterly hygiene inspections",
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 2, 31),
        template: templates[1]._id,
        frequency: "quarterly",
        responsibleDept: "Operations",
        programStatus: "in-progress",
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${programs.length} programs`);

    // ========== 7. SCHEDULES ==========
    console.log("\n📅 Step 7: Schedules");
    const schedules = await Schedule.insertMany([
      {
        title: "Factory A - Monthly Safety",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 7),
        company: companies[0]._id,
        program: programs[0]._id,
        purpose: "site",
        site: sites[0]._id,
        scheduleStatus: "in-progress",
        assignedUser: users.leadauditor._id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        title: "Warehouse B - Safety Audit",
        startDate: new Date(now.getFullYear(), now.getMonth(), 10),
        endDate: new Date(now.getFullYear(), now.getMonth(), 15),
        company: companies[0]._id,
        program: programs[0]._id,
        purpose: "site",
        site: sites[1]._id,
        scheduleStatus: "scheduled",
        assignedUser: users.leadauditor._id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
      {
        title: "Company-wide Safety Review",
        startDate: new Date(now.getFullYear(), now.getMonth(), 20),
        endDate: new Date(now.getFullYear(), now.getMonth(), 25),
        company: companies[0]._id,
        program: programs[0]._id,
        purpose: "company",
        scheduleStatus: "scheduled",
        assignedUser: users.adminuser._id,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${schedules.length} schedules`);

    // ========== 8. AUDIT SESSIONS ==========
    console.log("\n🔍 Step 8: Audit Sessions");
    const auditSessions = await AuditSession.insertMany([
      {
        title: "Factory A Safety Audit - Dec 2024",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        workflowStatus: "in-progress",
        template: templates[0]._id,
        site: sites[0]._id,
        checkType: checkTypes[0]._id,
        schedule: schedules[0]._id,
        auditor: users.auditorone._id,
        leadAuditor: users.leadauditor._id,
        isLocked: false,
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
      {
        title: "Warehouse B Safety - Completed",
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        endDate: new Date(now.getFullYear(), now.getMonth() - 1, 20),
        workflowStatus: "completed",
        template: templates[0]._id,
        site: sites[1]._id,
        checkType: checkTypes[0]._id,
        schedule: schedules[1]._id,
        auditor: users.auditortwo._id,
        leadAuditor: users.leadauditor._id,
        isLocked: true,
        closedBy: users.adminuser._id,
        closedAt: new Date(now.getFullYear(), now.getMonth() - 1, 20),
        closureNotes: "All findings resolved",
        createdBy: users.Lead._id,
        updatedBy: users.adminuser._id,
      },
      {
        title: "Lab Facility Audit - Planned",
        workflowStatus: "planned",
        template: templates[2]._id,
        site: sites[3]._id,
        checkType: checkTypes[2]._id,
        schedule: schedules[2]._id,
        leadAuditor: users.adminuser._id,
        isLocked: false,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    ]);
    console.log(`✅ Created ${auditSessions.length} audit sessions`);

    // ========== 9. TEAMS ==========
    console.log("\n👥 Step 9: Team Assignments");
    const teams = await Team.insertMany([
      {
        auditSession: auditSessions[0]._id,
        user: users.leadauditor._id,
        roleInTeam: "lead",
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
      {
        auditSession: auditSessions[0]._id,
        user: users.auditorone._id,
        roleInTeam: "member",
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
      {
        auditSession: auditSessions[0]._id,
        user: users.auditortwo._id,
        roleInTeam: "member",
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
      {
        auditSession: auditSessions[1]._id,
        user: users.leadauditor._id,
        roleInTeam: "lead",
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
      {
        auditSession: auditSessions[1]._id,
        user: users.auditortwo._id,
        roleInTeam: "member",
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
    ]);
    console.log(`✅ Created ${teams.length} team assignments`);

    // ========== 10. QUESTION ASSIGNMENTS ==========
    console.log("\n📌 Step 10: Question Assignments");
    const safetyQuestions = questions.filter(
      (q) => q.checkType.toString() === checkTypes[0]._id.toString()
    );
    const questionAssignments = await QuestionAssignment.insertMany([
      {
        auditSession: auditSessions[0]._id,
        question: safetyQuestions[0]._id,
        assignedTo: users.auditorone._id,
        assignedBy: users.leadauditor._id,
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
      {
        auditSession: auditSessions[0]._id,
        question: safetyQuestions[1]._id,
        assignedTo: users.auditorone._id,
        assignedBy: users.leadauditor._id,
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
      {
        auditSession: auditSessions[0]._id,
        question: safetyQuestions[2]._id,
        assignedTo: users.auditortwo._id,
        assignedBy: users.leadauditor._id,
        createdBy: users.leadauditor._id,
        updatedBy: users.leadauditor._id,
      },
    ]);
    console.log(
      `✅ Created ${questionAssignments.length} question assignments`
    );

    // ========== 11. OBSERVATIONS ==========
    console.log("\n🔎 Step 11: Observations");
    const observations = await Observation.insertMany([
      {
        auditSession: auditSessions[0]._id,
        question: safetyQuestions[0]._id,
        questionText: safetyQuestions[0].questionText,
        response: "yes",
        severity: "Informational",
        resolutionStatus: "Closed - Verified",
        createdBy: users.auditorone._id,
        updatedBy: users.auditorone._id,
      },
      {
        auditSession: auditSessions[0]._id,
        question: safetyQuestions[1]._id,
        questionText: safetyQuestions[1].questionText,
        response: "no",
        severity: "Critical",
        resolutionStatus: "Open",
        createdBy: users.auditorone._id,
        updatedBy: users.auditorone._id,
      },
      {
        auditSession: auditSessions[0]._id,
        question: safetyQuestions[2]._id,
        questionText: safetyQuestions[2].questionText,
        response: "no",
        severity: "High",
        resolutionStatus: "In Progress",
        createdBy: users.auditortwo._id,
        updatedBy: users.auditortwo._id,
      },
      {
        auditSession: auditSessions[1]._id,
        question: safetyQuestions[0]._id,
        questionText: safetyQuestions[0].questionText,
        response: "yes",
        severity: "Informational",
        resolutionStatus: "Closed - Verified",
        createdBy: users.auditortwo._id,
        updatedBy: users.auditortwo._id,
      },
    ]);
    console.log(`✅ Created ${observations.length} observations`);

    // ========== 12. PROBLEMS ==========
    console.log("\n⚠️  Step 12: Problems");
    const problems = await Problem.insertMany([
      {
        auditSession: auditSessions[0]._id,
        observation: observations[1]._id,
        question: safetyQuestions[1]._id,
        title: "Expired Fire Extinguisher",
        description: "Fire extinguisher in Zone A has expired",
        impact: "High",
        likelihood: "Likely",
        riskRating: "Critical",
        assignedTo: users.problemowner._id,
        problemStatus: "Open",
        methodology: "Visual inspection",
        createdBy: users.auditorone._id,
        updatedBy: users.auditorone._id,
      },
      {
        auditSession: auditSessions[0]._id,
        observation: observations[2]._id,
        question: safetyQuestions[2]._id,
        title: "Missing Safety Helmets",
        description: "3 workers observed without helmets",
        impact: "Medium",
        likelihood: "Possible",
        riskRating: "Medium",
        assignedTo: users.problemowner._id,
        problemStatus: "In Progress",
        methodology: "Site walkthrough",
        createdBy: users.auditortwo._id,
        updatedBy: users.problemowner._id,
      },
      {
        auditSession: auditSessions[1]._id,
        title: "Oil Spill in Storage",
        description: "Small oil leak detected in storage area",
        impact: "Medium",
        likelihood: "Unlikely",
        riskRating: "Low",
        assignedTo: users.sitemanager._id,
        problemStatus: "Resolved",
        createdBy: users.auditortwo._id,
        updatedBy: users.sitemanager._id,
      },
    ]);
    console.log(`✅ Created ${problems.length} problems`);

    // Link problems back to observations
    await Observation.findByIdAndUpdate(observations[1]._id, {
      problem: problems[0]._id,
    });
    await Observation.findByIdAndUpdate(observations[2]._id, {
      problem: problems[1]._id,
    });

    // ========== 13. FIX ACTIONS ==========
    console.log("\n🔧 Step 13: Fix Actions");
    const fixActions = await FixAction.insertMany([
      {
        problem: problems[0]._id,
        observation: observations[1]._id,
        actionText: "Replace expired fire extinguisher",
        owner: users.problemowner._id,
        deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        actionStatus: "In Progress",
        rootCause: "Lack of regular maintenance schedule",
        correctiveAction: "Replace extinguisher immediately",
        preventiveAction: "Implement monthly inspection checklist",
        createdBy: users.problemowner._id,
        updatedBy: users.problemowner._id,
      },
      {
        problem: problems[0]._id,
        observation: observations[1]._id,
        actionText: "Update maintenance log",
        owner: users.sitemanager._id,
        deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        actionStatus: "Pending",
        createdBy: users.problemOwner._id,
        updatedBy: users.problemowner._id,
      },
      {
        problem: problems[1]._id,
        observation: observations[2]._id,
        actionText: "Provide safety helmets to all workers",
        owner: users.problemowner._id,
        deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        actionStatus: "Completed",
        rootCause: "Insufficient inventory",
        correctiveAction: "Ordered and distributed 20 new helmets",
        preventiveAction: "Maintain minimum stock level of 50 helmets",
        createdBy: users.problemOwner._id,
        updatedBy: users.problemowner._id,
      },
      {
        problem: problems[2]._id,
        actionText: "Clean oil spill and repair leak",
        owner: users.sitemanager._id,
        deadline: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        actionStatus: "Verified",
        verifiedBy: users.approverone._id,
        verifiedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        verificationResult: "Effective",
        verificationMethod: "On-site inspection",
        rootCause: "Worn seal on storage tank",
        correctiveAction: "Replaced seal and cleaned area",
        preventiveAction: "Quarterly tank inspections",
        createdBy: users.sitemanager._id,
        updatedBy: users.approverone._id,
      },
    ]);
    console.log(`✅ Created ${fixActions.length} fix actions`);

    // ========== 14. APPROVALS ==========
    console.log("\n✓ Step 14: Approvals");
    const approvals = await Approval.insertMany([
      {
        entityType: "FixAction",
        entityId: fixActions[0]._id,
        title: "Approve: Replace Fire Extinguisher",
        description: "Fix action requires approval before implementation",
        approvalStatus: "pending",
        priority: "high",
        approver: users.approverone._id,
        requestedBy: users.problemowner._id,
        timeline: {
          requestedAt: new Date(),
          deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          slaStatus: "on-time",
        },
        createdBy: users.problemOwner._id,
        updatedBy: users.problemowner._id,
      },
      {
        entityType: "FixAction",
        entityId: fixActions[2]._id,
        title: "Approve: Provide Safety Helmets",
        description: "Completed fix action verification",
        approvalStatus: "approved",
        priority: "medium",
        approver: users.approverone._id,
        requestedBy: users.problemowner._id,
        decision: {
          decision: "approved",
          decisionBy: users.approverone._id,
          decisionAt: new Date(),
          comments: "Action completed satisfactorily",
        },
        timeline: {
          requestedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          respondedAt: new Date(),
          slaStatus: "on-time",
        },
        createdBy: users.problemOwner._id,
        updatedBy: users.approverone._id,
      },
      {
        entityType: "Problem",
        entityId: problems[2]._id,
        title: "Approve: Close Problem - Oil Spill",
        description: "Problem resolution requires approval",
        approvalStatus: "approved",
        priority: "low",
        approver: users.adminuser._id,
        requestedBy: users.sitemanager._id,
        decision: {
          decision: "approved",
          decisionBy: users.adminuser._id,
          decisionAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          comments: "All fix actions verified and effective",
        },
        timeline: {
          requestedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          respondedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
          slaStatus: "on-time",
        },
        createdBy: users.sitemanager._id,
        updatedBy: users.adminuser._id,
      },
      {
        entityType: "AuditSession",
        entityId: auditSessions[1]._id,
        title: "Approve: Close Audit Session",
        description: "Request to lock and finalize audit",
        approvalStatus: "approved",
        priority: "medium",
        approver: users.adminuser._id,
        requestedBy: users.leadauditor._id,
        decision: {
          decision: "approved",
          decisionBy: users.adminuser._id,
          decisionAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          comments: "All requirements met for closure",
        },
        timeline: {
          requestedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
          respondedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          slaStatus: "on-time",
        },
        createdBy: users.leadauditor._id,
        updatedBy: users.adminuser._id,
      },
    ]);
    console.log(`✅ Created ${approvals.length} approvals`);

    // ========== SUMMARY ==========
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Data seeding completed successfully!");
    console.log("=".repeat(60));
    console.log("\n📊 Summary:");
    console.log(
      `   ✅ ${Object.keys(users).length} Users (test password: Test@123)`
    );
    console.log(`   ✅ ${companies.length} Companies`);
    console.log(`   ✅ ${sites.length} Sites`);
    console.log(`   ✅ ${checkTypes.length} Check Types`);
    console.log(`   ✅ ${rules.length} Rules`);
    console.log(`   ✅ ${questions.length} Questions`);
    console.log(`   ✅ ${templates.length} Templates`);
    console.log(`   ✅ ${programs.length} Programs`);
    console.log(`   ✅ ${schedules.length} Schedules`);
    console.log(`   ✅ ${auditSessions.length} Audit Sessions`);
    console.log(`   ✅ ${teams.length} Team Assignments`);
    console.log(`   ✅ ${questionAssignments.length} Question Assignments`);
    console.log(`   ✅ ${observations.length} Observations`);
    console.log(`   ✅ ${problems.length} Problems`);
    console.log(`   ✅ ${fixActions.length} Fix Actions`);
    console.log(`   ✅ ${approvals.length} Approvals`);
    console.log("\n🧪 Test Users Created:");
    console.log("   📧 admin@acme.com (Admin)");
    console.log("   📧 lead.auditor@acme.com (Lead Auditor)");
    console.log("   📧 auditor1@acme.com (Auditor)");
    console.log("   📧 auditor2@acme.com (Auditor)");
    console.log("   📧 sitemanager@acme.com (Site Manager)");
    console.log("   📧 problemowner@acme.com (Problem Owner)");
    console.log("   📧 approver1@acme.com (Approver)");
    console.log("   📧 groupadmin@acme.com (Group Admin)");
    console.log("\n🔑 All test users password: Test@123");
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
