const mongoose = require("mongoose");
const User = require("../models/User.model");
require("dotenv").config();

const checkData = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/pcb-automation";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    const users = await User.find({});

    for (const user of users) {
      console.log(`👤 User: ${user.email}`);
      console.log(`   Total Reports: ${user.reports?.length || 0}\n`);

      if (user.reports && user.reports.length > 0) {
        console.log("   Sample report data:");
        const report = user.reports[0];
        console.log(`   Date: ${report.date}, Time: ${report.time}`);
        console.log(`   Data keys:`, Object.keys(report.data));
        console.log(`   keyFeatures:`, report.data.keyFeatures);
        console.log(`   description:`, report.data.description);
        console.log(`   faq:`, report.data.faq);
        console.log("");
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

checkData();
