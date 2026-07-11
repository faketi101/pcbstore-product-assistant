const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User.model");
const ReportTemplate = require("../models/ReportTemplate.model");
const verifyToken = require("../middleware/auth.middleware");
const verifyAdmin = require("../middleware/admin.middleware");

const router = express.Router();

router.use(verifyToken, verifyAdmin);

const USER_FIELDS =
  "name email role isActive joinedAt createdAt updatedAt";

const normalizeRole = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const validateUserInput = (body, { creating = false } = {}) => {
  const values = {};

  if (creating || Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = String(body.name || "").trim();
    if (!name) throw new Error("Name is required.");
    if (name.length > 100) throw new Error("Name cannot exceed 100 characters.");
    values.name = name;
  }

  if (creating || Object.prototype.hasOwnProperty.call(body, "email")) {
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    values.email = email;
  }

  if (creating || Object.prototype.hasOwnProperty.call(body, "role")) {
    const role = normalizeRole(body.role || "user");
    if (!role || role.length > 50) throw new Error("Enter a valid role.");
    values.role = role;
  }

  if (creating || Object.prototype.hasOwnProperty.call(body, "isActive")) {
    values.isActive = body.isActive !== false;
  }

  if (Object.prototype.hasOwnProperty.call(body, "joinedAt")) {
    const joinedAt = new Date(body.joinedAt);
    if (Number.isNaN(joinedAt.getTime())) {
      throw new Error("Enter a valid joined date.");
    }
    values.joinedAt = joinedAt;
  }

  if (creating || (typeof body.password === "string" && body.password)) {
    const password = String(body.password || "");
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    values.password = password;
  }

  return values;
};

const duplicateEmailResponse = (error, res) => {
  if (error?.code !== 11000) return false;
  res.status(409).json({ message: "A user with this email already exists." });
  return true;
};

// Full management list. Role options follow the application's dynamic report roles.
router.get("/", async (_req, res) => {
  try {
    const [users, userRoles, templateRoles] = await Promise.all([
      User.find({}, USER_FIELDS).sort({ name: 1 }).lean(),
      User.distinct("role"),
      ReportTemplate.distinct("role"),
    ]);

    const roles = [...new Set(["user", "admin", ...userRoles, ...templateRoles])]
      .filter(Boolean)
      .sort((a, b) => {
        if (a === "admin") return -1;
        if (b === "admin") return 1;
        if (a === "user") return -1;
        if (b === "user") return 1;
        return a.localeCompare(b);
      });

    res.json({ users, roles });
  } catch (error) {
    res.status(500).json({ message: "Unable to load users." });
  }
});

router.post("/", async (req, res) => {
  try {
    const values = validateUserInput(req.body, { creating: true });
    const user = await User.create(values);
    res.status(201).json(await User.findById(user._id, USER_FIELDS).lean());
  } catch (error) {
    if (duplicateEmailResponse(error, res)) return;
    res.status(400).json({ message: error.message || "Unable to create user." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found." });

    const values = validateUserInput(req.body);
    const isSelf = target._id.toString() === req.userId;
    const isAnotherAdmin = target.role === "admin" && !isSelf;

    if (isAnotherAdmin && values.role && values.role !== target.role) {
      return res.status(403).json({
        message: "You cannot change another administrator's permissions.",
      });
    }

    if (isAnotherAdmin && values.password) {
      return res.status(403).json({
        message: "You cannot reset another administrator's password.",
      });
    }


    if (
      isAnotherAdmin &&
      values.isActive !== undefined &&
      values.isActive !== (target.isActive !== false)
    ) {
      return res.status(403).json({
        message: "You cannot change another administrator's account status.",
      });
    }

    if (isSelf && values.isActive === false) {
      return res.status(400).json({
        message: "You cannot deactivate your own account.",
      });
    }

    // Keep at least one administrator in the system.
    if (
      isSelf &&
      target.role === "admin" &&
      values.role !== undefined &&
      values.role !== "admin"
    ) {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "The last administrator cannot remove their own admin access.",
        });
      }
    }

    Object.assign(target, values);
    await target.save();
    res.json(await User.findById(target._id, USER_FIELDS).lean());
  } catch (error) {
    if (duplicateEmailResponse(error, res)) return;
    res.status(400).json({ message: error.message || "Unable to update user." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const target = await User.findById(req.params.id).select("role");
    if (!target) return res.status(404).json({ message: "User not found." });

    if (target._id.toString() === req.userId) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account." });
    }

    if (target.role === "admin") {
      return res.status(403).json({
        message: "You cannot delete another administrator's account.",
      });
    }

    await target.deleteOne();
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete user." });
  }
});

module.exports = router;
