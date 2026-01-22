const mongoose = require("mongoose");
const User = require("../models/User.model");
require("dotenv").config();

const checkReportStructure = async () => {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/pcb-automation";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`   Reports count: ${user.reports?.length || 0}`);

      if (user.reports && user.reports.length > 0) {
        // Show first report structure
        const firstReport = user.reports[0];
        console.log(`\n   First Report Structure:`);
        console.log(`   - ID: ${firstReport.id}`);
        console.log(`   - Date: ${firstReport.date}`);
        console.log(`   - Time: ${firstReport.time}`);
        console.log(`\n   Data fields:`);
        if (firstReport.data) {
          Object.keys(firstReport.data).forEach((key) => {
            const value = firstReport.data[key];
            if (Array.isArray(value)) {
              console.log(`   - ${key}: [array with ${value.length} items]`);
            } else if (typeof value === "object" && value !== null) {
              console.log(`   - ${key}:`, JSON.stringify(value));
            } else {
              console.log(`   - ${key}: ${value}`);
            }
          });

          // Specifically check for keywords and keyFeatures
          console.log(
            `\n   ⚠️  Has 'keywords': ${!!firstReport.data.keywords}`,
          );
          console.log(
            `   ⚠️  Has 'keyFeatures': ${!!firstReport.data.keyFeatures}`,
          );
        }
      }
    }

    console.log("\n✅ Check completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }
};

// Run the check
checkReportStructure();
