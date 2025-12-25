import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import Group from "../src/models/Group.js";
import Company from "../src/models/Company.js";
import Site from "../src/models/Site.js";

const seedTestUsers = async () => {
  try {
    await connectDB();

    console.log("🌱 Seeding test users with new roles...");

    // 1. Get or create scoping entities
    let group = await Group.findOne();
    if (!group) {
      group = await Group.create({
        name: "Default Group",
        description: "Default seeding group",
      });
      console.log(`✅ Created Group: ${group.name}`);
    }

    let company = await Company.findOne({ group: group._id });
    if (!company) {
      company = await Company.create({
        name: "Default Company",
        group: group._id,
        sector: "Technology",
      });
      console.log(`✅ Created Company: ${company.name}`);
    }

    let site = await Site.findOne({ company: company._id });
    if (!site) {
      site = await Site.create({
        name: "Default Site",
        location: "Global",
        company: company._id,
      });
      console.log(`✅ Created Site: ${site.name}`);
    }

    const users = [
      // Super Admin (System level)
      {
        name: "Super Admin",
        email: "superadmin@example.com",
        password: "password123",
        role: "superAdmin",
        scopeLevel: "system",
      },
      // Group Admin
      {
        name: "Group Admin",
        email: "groupadmin@example.com",
        password: "password123",
        role: "groupAdmin",
        scopeLevel: "group",
        assignedGroup: group._id,
      },
      // Company Admin
      {
        name: "Company Admin",
        email: "companyadmin@example.com",
        password: "password123",
        role: "companyAdmin",
        scopeLevel: "company",
        assignedGroup: group._id,
        assignedCompany: company._id,
      },
      // Site Manager
      {
        name: "Site Manager",
        email: "sitemanager@example.com",
        password: "password123",
        role: "siteManager",
        scopeLevel: "site",
        assignedGroup: group._id,
        assignedCompany: company._id,
        assignedSite: site._id,
      },
      // Auditors
      {
        name: "Lead Auditor",
        email: "auditor1@example.com",
        password: "password123",
        role: "auditor",
        scopeLevel: "site",
        assignedGroup: group._id,
        assignedCompany: company._id,
        assignedSite: site._id,
      },
      {
        name: "Junior Auditor",
        email: "auditor2@example.com",
        password: "password123",
        role: "auditor",
        scopeLevel: "site",
        assignedGroup: group._id,
        assignedCompany: company._id,
        assignedSite: site._id,
      },
      // Approvers
      {
        name: "Company Approver",
        email: "approver1@example.com",
        password: "password123",
        role: "approver",
        scopeLevel: "company",
        assignedGroup: group._id,
        assignedCompany: company._id,
      },
      {
        name: "Site Approver",
        email: "approver2@example.com",
        password: "password123",
        role: "approver",
        scopeLevel: "site",
        assignedGroup: group._id,
        assignedCompany: company._id,
        assignedSite: site._id,
      },
      // Legacy roles (optional, kept for compatibility if needed)
      {
        name: "Legacy Admin",
        email: "admin@example.com",
        password: "password123",
        role: "admin",
        scopeLevel: "system",
      },
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        console.log(`ℹ️  User ${userData.email} already exists. Skipping.`);
      } else {
        await User.create(userData);
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }
    }

    console.log("🎉 Test user seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test users:", error);
    process.exit(1);
  }
};

seedTestUsers();
