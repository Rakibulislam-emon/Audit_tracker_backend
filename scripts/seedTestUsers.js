import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";

const seedTestUsers = async () => {
  try {
    await connectDB();

    console.log("🌱 Seeding test users...");

    const users = [
      {
        name: "Test Admin",
        email: "admin@example.com",
        password: "password123",
        role: "admin",
      },
      {
        name: "Test SysAdmin",
        email: "sysadmin@example.com",
        password: "password123",
        role: "sysadmin",
      },
      {
        name: "Test Manager",
        email: "manager@example.com",
        password: "password123",
        role: "manager",
      },
      {
        name: "Test Compliance Officer",
        email: "compliance@example.com",
        password: "password123",
        role: "complianceOfficer",
      },
      {
        name: "Test Lead Auditor",
        email: "lead@example.com",
        password: "password123",
        role: "auditor",
      },
      {
        name: "Test Audit Member",
        email: "member@example.com",
        password: "password123",
        role: "auditor",
      },
      {
        name: "Test General Auditor",
        email: "auditor@example.com",
        password: "password123",
        role: "auditor",
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
