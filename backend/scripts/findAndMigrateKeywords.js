const mongoose = require("mongoose");
require("dotenv").config();

const findAndMigrateKeywords = async () => {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/pcb-automation";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Access the users collection directly
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Find all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${users.length} users\n`);

    let totalReportsChecked = 0;
    let reportsWithKeywords = 0;
    let reportsUpdated = 0;

    for (const user of users) {
      console.log(`\n👤 User: ${user.email}`);

      if (user.reports && user.reports.length > 0) {
        console.log(`   Checking ${user.reports.length} reports...`);

        let userNeedsUpdate = false;

        for (let i = 0; i < user.reports.length; i++) {
          const report = user.reports[i];
          totalReportsChecked++;

          // Check if report.data has 'keywords' field
          if (report.data && report.data.keywords !== undefined) {
            console.log(
              `   ⚠️  Found 'keywords' in report ${i + 1} (${report.date} ${report.time}):`,
              report.data.keywords,
            );
            reportsWithKeywords++;

            // Migrate: copy keywords to keyFeatures
            report.data.keyFeatures = report.data.keywords;
            delete report.data.keywords;

            userNeedsUpdate = true;
            reportsUpdated++;
          }
        }

        // Update the user if needed
        if (userNeedsUpdate) {
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { reports: user.reports } },
          );
          console.log(
            `   ✅ Updated user with ${reportsUpdated} migrated reports`,
          );
        } else {
          console.log(`   ✅ No 'keywords' fields found`);
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(50));
    console.log(`Total reports checked: ${totalReportsChecked}`);
    console.log(`Reports with 'keywords': ${reportsWithKeywords}`);
    console.log(`Reports updated: ${reportsUpdated}`);
    console.log("=".repeat(50));

    await mongoose.connection.close();
    console.log("\n✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

findAndMigrateKeywords();
