const mongoose = require("mongoose");
require("dotenv").config();
const Task = require("../models/Task.model");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    const dateFrom = new Date("2026-02-21");
    const dateTo = new Date("2026-02-27");
    dateTo.setHours(23, 59, 59, 999);

    console.log("dateFrom:", dateFrom.toISOString());
    console.log("dateTo:", dateTo.toISOString());

    const dateCond = { $gte: dateFrom, $lte: dateTo };

    // This is what buildFilter generates
    const filter = {
      $and: [
        {
          $or: [
            {
              status: { $ne: "Completed" },
              $or: [{ startDate: dateCond }, { dueDate: dateCond }],
            },
            {
              status: "Completed",
              $or: [{ startDate: dateCond }, { endDate: dateCond }],
            },
          ],
        },
      ],
    };

    console.log("\n=== Test 1: Current nested $or filter ===");
    const aggResults = await Task.aggregate([{ $match: filter }]);
    console.log("Aggregate count:", aggResults.length);
    aggResults.forEach((t) =>
      console.log(
        "  ",
        t.title,
        "|",
        t.status,
        "| start:",
        t.startDate,
        "| due:",
        t.dueDate,
        "| end:",
        t.endDate,
      ),
    );

    // Simple test: just date range on startDate
    console.log("\n=== Test 2: Simple startDate range ===");
    const simpleFilter = { startDate: dateCond };
    const simple = await Task.aggregate([{ $match: simpleFilter }]);
    console.log("Count:", simple.length);
    simple.forEach((t) => console.log("  ", t.title, "|", t.startDate));

    // Test 3: Flat $or without nesting
    console.log("\n=== Test 3: Flat $or on all 3 date fields ===");
    const flatFilter = {
      $or: [
        { startDate: dateCond },
        { dueDate: dateCond },
        { endDate: dateCond },
      ],
    };
    const flat = await Task.aggregate([{ $match: flatFilter }]);
    console.log("Count:", flat.length);
    flat.forEach((t) =>
      console.log(
        "  ",
        t.title,
        "|",
        t.status,
        "| start:",
        t.startDate?.toISOString().slice(0, 10),
        "| due:",
        t.dueDate?.toISOString().slice(0, 10),
        "| end:",
        t.endDate?.toISOString().slice(0, 10),
      ),
    );

    // Test 4: Correct filter - for completed tasks ignore dueDate, for non-completed ignore endDate
    console.log("\n=== Test 4: Correct status-aware filter using $expr ===");
    const correctFilter = {
      $or: [
        // Non-completed: startDate or dueDate in range
        {
          status: { $ne: "Completed" },
          $or: [
            { startDate: { $gte: dateFrom, $lte: dateTo } },
            { dueDate: { $gte: dateFrom, $lte: dateTo } },
          ],
        },
        // Completed: startDate or endDate in range (NOT dueDate, NOT startDate if irrelevant)
        {
          status: "Completed",
          $or: [{ endDate: { $gte: dateFrom, $lte: dateTo } }],
        },
      ],
    };
    const correct = await Task.aggregate([{ $match: correctFilter }]);
    console.log("Count:", correct.length);
    correct.forEach((t) =>
      console.log(
        "  ",
        t.title,
        "|",
        t.status,
        "| start:",
        t.startDate?.toISOString().slice(0, 10),
        "| due:",
        t.dueDate?.toISOString().slice(0, 10),
        "| end:",
        t.endDate?.toISOString().slice(0, 10),
      ),
    );

    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
