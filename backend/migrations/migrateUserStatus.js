require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User.model");

const migrateUserStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const needsMigration = await User.countDocuments({
      $or: [
        { isActive: { $exists: false } },
        { joinedAt: { $exists: false } },
        { joinedAt: null },
      ],
    });

    if (!needsMigration) {
      console.log("User status migration already complete. No changes needed.");
      return;
    }

    const result = await User.updateMany(
      {
        $or: [
          { isActive: { $exists: false } },
          { joinedAt: { $exists: false } },
          { joinedAt: null },
        ],
      },
      [
        {
          $set: {
            isActive: { $ifNull: ["$isActive", true] },
            joinedAt: {
              $ifNull: [
                "$joinedAt",
                { $ifNull: ["$createdAt", { $toDate: "$_id" }] },
              ],
            },
          },
        },
      ],
    );

    console.log(
      `User status migration complete: ${result.modifiedCount} of ${needsMigration} users updated.`,
    );
  } catch (error) {
    console.error("User status migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

migrateUserStatus();
