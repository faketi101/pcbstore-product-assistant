const mongoose = require("mongoose");
const User = require("../models/User.model");
require("dotenv").config();

const simulateFetch = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/pcb-automation";
    await mongoose.connect(mongoURI);

    // Simulate what the API returns
    const user = await User.findOne({ email: "ti@tarikul.dev" });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    let reports = user.reports || [];

    // Sort by timestamp descending (newest first) - same as API
    reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log("📊 API Response Simulation:");
    console.log("Total reports:", reports.length);
    console.log("\nFirst 3 reports:");

    reports.slice(0, 3).forEach((report, i) => {
      console.log(`\n${i + 1}. Report ${report.id}`);
      console.log(`   Date: ${report.date}, Time: ${report.time}`);
      console.log(`   Data:`, {
        description: report.data.description,
        faq: report.data.faq,
        keyFeatures: report.data.keyFeatures,
        specifications: report.data.specifications,
      });
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

simulateFetch();
