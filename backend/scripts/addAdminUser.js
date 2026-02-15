require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User.model");

const addAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: "dev@tarikul.dev" });

    if (existingAdmin) {
      console.log("ℹ️  Admin user already exists");

      // Update role to admin if not already
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        existingAdmin.name = "Demo Admin";
        await existingAdmin.save();
        console.log("✅ Updated existing user to admin role");
      } else {
        console.log("✅ User already has admin role");
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        name: "Demo Admin",
        email: "dev@tarikul.dev",
        password: "admin123", // Will be hashed by pre-save hook
        role: "admin",
      });

      await adminUser.save();
      console.log("✅ Admin user created successfully");
      console.log("📧 Email: dev@tarikul.dev");
      console.log("🔑 Password: admin123");
    }

    console.log("\n✅ Admin user setup complete!");
  } catch (error) {
    console.error("❌ Error setting up admin user:", error);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  }
};

addAdminUser();
