const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task.model");
const User = require("../models/User.model");
const verifyToken = require("../middleware/auth.middleware");
const verifyAdmin = require("../middleware/admin.middleware");

const router = express.Router();

/* ---------- HELPERS ---------- */

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const buildFilter = (query, userId = null, onlyAssigned = false) => {
  // Use a clean $and array to avoid $or/$and key collisions
  const conditions = [];

  // "My Tasks" — must convert to ObjectId for aggregation
  if (onlyAssigned && userId) {
    conditions.push({ assignedTo: toObjectId(userId) });
  }

  if (query.status) {
    const s = Array.isArray(query.status) ? query.status : [query.status];
    conditions.push({ status: { $in: s } });
  }

  // User-based filter (public / admin / all-tasks)
  if (!onlyAssigned && query.assignedTo) {
    const ids = (
      Array.isArray(query.assignedTo) ? query.assignedTo : [query.assignedTo]
    ).filter(Boolean);
    if (ids.length) {
      const objectIds = ids.map(toObjectId);
      conditions.push({
        assignedTo: { $not: { $elemMatch: { $nin: objectIds } } },
      });
      conditions.push({ "assignedTo.0": { $exists: true } });
    }
  }

  // Date range filter:
  // For completed-only filters: only check endDate (completion date) against range.
  // For other statuses: check if startDate, dueDate, or endDate falls in range.
  if (query.dateFrom || query.dateTo) {
    const dateCond = {};
    if (query.dateFrom) dateCond.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const endOfDay = new Date(query.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateCond.$lte = endOfDay;
    }

    // Determine if filtering exclusively for "Completed" status
    const statusArr = query.status
      ? Array.isArray(query.status)
        ? query.status
        : [query.status]
      : [];
    const onlyCompleted =
      statusArr.length === 1 && statusArr[0].toLowerCase() === "completed";

    if (onlyCompleted) {
      // Only match completed tasks whose endDate is within the range
      conditions.push({ endDate: dateCond });
    } else if (
      statusArr.length > 0 &&
      statusArr.map((s) => s.toLowerCase()).includes("completed")
    ) {
      // Mixed statuses including Completed:
      // Non-completed tasks match on startDate/dueDate;
      // Completed tasks match on endDate only.
      conditions.push({
        $or: [
          {
            $and: [
              { status: { $ne: "Completed" } },
              { $or: [{ startDate: dateCond }, { dueDate: dateCond }] },
            ],
          },
          { status: "Completed", endDate: dateCond },
        ],
      });
    } else {
      // No completed status selected — match on startDate or dueDate
      conditions.push({
        $or: [{ startDate: dateCond }, { dueDate: dateCond }],
      });
    }
  }

  if (query.search) {
    conditions.push({
      $or: [
        { title: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
      ],
    });
  }

  return conditions.length > 0 ? { $and: conditions } : {};
};

const STATUS_SORT = [
  {
    $addFields: {
      statusOrder: {
        $switch: {
          branches: [
            { case: { $eq: ["$status", "Running"] }, then: 1 },
            { case: { $eq: ["$status", "On Hold"] }, then: 2 },
            { case: { $eq: ["$status", "Not Started"] }, then: 3 },
            { case: { $eq: ["$status", "Completed"] }, then: 4 },
          ],
          default: 5,
        },
      },
    },
  },
  { $sort: { statusOrder: 1, updatedAt: -1 } },
];

const POPULATE = [
  {
    $lookup: {
      from: "users",
      localField: "assignedTo",
      foreignField: "_id",
      as: "assignedUsers",
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "createdBy",
      foreignField: "_id",
      as: "creator",
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "lastUpdated.updatedBy",
      foreignField: "_id",
      as: "lastUpdater",
    },
  },
  {
    $addFields: {
      assignedUsers: {
        $map: {
          input: "$assignedUsers",
          as: "u",
          in: { _id: "$$u._id", name: "$$u.name", email: "$$u.email" },
        },
      },
      creator: {
        $arrayElemAt: [
          {
            $map: {
              input: "$creator",
              as: "u",
              in: { _id: "$$u._id", name: "$$u.name", email: "$$u.email" },
            },
          },
          0,
        ],
      },
      lastUpdater: {
        $arrayElemAt: [
          {
            $map: {
              input: "$lastUpdater",
              as: "u",
              in: { _id: "$$u._id", name: "$$u.name", email: "$$u.email" },
            },
          },
          0,
        ],
      },
    },
  },
];

const makeSortStage = (sortBy, sortOrder) => {
  const dir = sortOrder === "asc" ? 1 : -1;
  const map = {
    title: { title: dir },
    startDate: { startDate: dir },
    dueDate: { dueDate: dir },
    updatedAt: { updatedAt: dir },
    createdAt: { createdAt: dir },
  };
  return map[sortBy] || null;
};

// Single reusable query runner
const queryTasks = async (filter, query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  const useStatusSort = !query.sortBy || query.sortBy === "statusPriority";
  const customSort = makeSortStage(query.sortBy, query.sortOrder);

  const pipeline = [
    { $match: filter },
    ...(useStatusSort ? STATUS_SORT : [{ $sort: customSort }]),
    ...POPULATE,
    { $skip: skip },
    { $limit: limit },
  ];

  const [tasks, total] = await Promise.all([
    Task.aggregate(pipeline),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const populateTask = (q) =>
  q
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("lastUpdated.updatedBy", "name email");

/* ---------- PUBLIC ---------- */

router.get("/public", async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    console.log("[PUBLIC] query:", JSON.stringify(req.query));
    console.log("[PUBLIC] filter:", JSON.stringify(filter));
    const result = await queryTasks(filter, req.query);
    console.log("[PUBLIC] results:", result.pagination.total);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: err.message });
  }
});

/* ---------- AUTHENTICATED ---------- */

// Users list — available to ALL logged-in users (for filter dropdowns)
router.get("/users", verifyToken, async (req, res) => {
  try {
    res.json(await User.find({}, "name email").sort({ name: 1 }));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: err.message });
  }
});

router.get("/my-tasks", verifyToken, async (req, res) => {
  try {
    const filter = buildFilter(req.query, req.userId, true);
    console.log("[MY-TASKS] query:", JSON.stringify(req.query));
    console.log("[MY-TASKS] filter:", JSON.stringify(filter));
    const result = await queryTasks(filter, req.query);
    console.log("[MY-TASKS] results:", result.pagination.total);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: err.message });
  }
});

router.get("/all-tasks", verifyToken, async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    console.log("[ALL-TASKS] query:", JSON.stringify(req.query));
    console.log("[ALL-TASKS] filter:", JSON.stringify(filter));
    const result = await queryTasks(filter, req.query);
    console.log("[ALL-TASKS] results:", result.pagination.total);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: err.message });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const task = await populateTask(Task.findById(req.params.id));
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching task", error: err.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isAdmin = req.userRole === "admin";
    const isAssigned = task.assignedTo.some(
      (id) => id.toString() === req.userId,
    );
    if (!isAdmin && !isAssigned) {
      return res
        .status(403)
        .json({ message: "You don't have permission to edit this task" });
    }

    const {
      title,
      description,
      startDate,
      dueDate,
      links,
      totalTaskCount,
      totalCompletedTask,
      status,
    } = req.body;
    if (!isAdmin && status === "Completed" && task.status !== "Completed") {
      return res
        .status(403)
        .json({ message: "Only admin users can mark tasks as completed" });
    }

    if (isAdmin) {
      // Admin can update all fields
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (startDate !== undefined) task.startDate = startDate;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (links !== undefined) task.links = links;
      if (totalTaskCount !== undefined) task.totalTaskCount = totalTaskCount;
      if (totalCompletedTask !== undefined)
        task.totalCompletedTask = totalCompletedTask;
      if (status !== undefined) task.status = status;
    } else {
      // Assigned users can only partially edit
      if (description !== undefined) task.description = description;
      if (links !== undefined) task.links = links;
      if (totalCompletedTask !== undefined)
        task.totalCompletedTask = totalCompletedTask;
      if (status !== undefined) task.status = status;
    }

    // Auto-set endDate when marking as Completed
    if (task.status === "Completed" && !task.endDate) {
      task.endDate = new Date();
    }

    task.lastUpdated = {
      updatedBy: req.userId,
      updatedAt: new Date(),
      action: "updated",
    };

    await task.save();
    res.json(await populateTask(Task.findById(task._id)));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating task", error: err.message });
  }
});

/* ---------- ADMIN ---------- */

router.get("/admin/tasks", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    console.log("[ADMIN-TASKS] query:", JSON.stringify(req.query));
    console.log("[ADMIN-TASKS] filter:", JSON.stringify(filter));
    const result = await queryTasks(filter, req.query);
    console.log("[ADMIN-TASKS] results:", result.pagination.total);
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tasks", error: err.message });
  }
});

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      dueDate,
      links,
      totalTaskCount,
      totalCompletedTask,
      status,
      assignedTo,
    } = req.body;
    if (!title || !startDate || !dueDate) {
      return res
        .status(400)
        .json({ message: "Title, start date, and due date are required" });
    }
    const task = await new Task({
      title,
      description,
      startDate,
      dueDate,
      links: links || [],
      totalTaskCount: totalTaskCount || 1,
      totalCompletedTask: totalCompletedTask || 0,
      status: status || "Not Started",
      assignedTo: assignedTo || [],
      createdBy: req.userId,
      lastUpdated: {
        updatedBy: req.userId,
        updatedAt: new Date(),
        action: "created",
      },
    }).save();
    res.status(201).json(await populateTask(Task.findById(task._id)));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating task", error: err.message });
  }
});

router.put("/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const {
      title,
      description,
      startDate,
      dueDate,
      endDate,
      links,
      totalTaskCount,
      totalCompletedTask,
      status,
      assignedTo,
    } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (startDate !== undefined) task.startDate = startDate;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (endDate !== undefined) task.endDate = endDate;
    if (links !== undefined) task.links = links;
    if (totalTaskCount !== undefined) task.totalTaskCount = totalTaskCount;
    if (totalCompletedTask !== undefined)
      task.totalCompletedTask = totalCompletedTask;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (status === "Completed" && !task.endDate && endDate === undefined)
      task.endDate = new Date();
    task.lastUpdated = {
      updatedBy: req.userId,
      updatedAt: new Date(),
      action: "updated by admin",
    };

    await task.save();
    res.json(await populateTask(Task.findById(task._id)));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating task", error: err.message });
  }
});

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting task", error: err.message });
  }
});

// Admin-only user list (includes roles)
router.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    res.json(await User.find({}, "name email role").sort({ name: 1 }));
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: err.message });
  }
});

module.exports = router;
