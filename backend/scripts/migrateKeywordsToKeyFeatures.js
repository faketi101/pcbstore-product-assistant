const mongoose = require("mongoose");
const User = require("../models/User.model");
require("dotenv").config();

const migrateKeywordsToKeyFeatures = async () => {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/pcb-automation";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to process`);

    let totalReportsUpdated = 0;
    let usersUpdated = 0;

    for (const user of users) {
      let userModified = false;

      if (user.reports && user.reports.length > 0) {
        for (const report of user.reports) {
          // Check if report has keywords but not keyFeatures
          if (report.data && report.data.keywords && !report.data.keyFeatures) {
            // Migrate keywords to keyFeatures
            report.data.keyFeatures = report.data.keywords;

            // Remove the old keywords field
            report.data.keywords = undefined;

            userModified = true;
            totalReportsUpdated++;
          }
        }
      }

      if (userModified) {
        await user.save();
        usersUpdated++;
        console.log(
          `✅ Updated user: ${user.email} (${user.reports.length} reports)`,
        );
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Users processed: ${users.length}`);
    console.log(`   - Users updated: ${usersUpdated}`);
    console.log(`   - Reports migrated: ${totalReportsUpdated}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

// Run the migration
migrateKeywordsToKeyFeatures();
