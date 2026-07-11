const express = require("express");
const ReportTemplate = require("../models/ReportTemplate.model");
const User = require("../models/User.model");
const defaultTemplate = require("../config/defaultReportTemplate");
const verifyToken = require("../middleware/auth.middleware");
const verifyAdmin = require("../middleware/admin.middleware");

const router = express.Router();
const normalizeKey = (value = "") => value.trim().replace(/[^a-zA-Z0-9_]/g, "");
const normalizeRole = (value = "") => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const seedDefault = async () => {
  const existing = await ReportTemplate.findOne({ role: defaultTemplate.role });
  return existing || ReportTemplate.create(defaultTemplate);
};

const validateTemplate = (body) => {
  const role = normalizeRole(body.role);
  if (!role || !body.name?.trim()) throw new Error("Role and display name are required");
  const groups = (body.groups || []).map((group, groupIndex) => {
    if (!group.name?.trim()) throw new Error("Every group needs a name");
    return {
      ...group,
      name: group.name.trim(),
      order: groupIndex,
      fields: (group.fields || []).map((field, fieldIndex) => {
        const key = normalizeKey(field.key);
        if (!key || !field.label?.trim()) throw new Error("Every field needs a label and key");
        const counters = (field.counters || []).map((counter) => ({
          ...counter,
          key: normalizeKey(counter.key),
          label: counter.label?.trim(),
        }));
        if (!counters.length || counters.some((counter) => !counter.key || !counter.label)) {
          throw new Error("Every field needs at least one valid counter");
        }
        return { ...field, key, label: field.label.trim(), order: fieldIndex, counters };
      }),
    };
  });
  const keys = groups.flatMap((group) => group.fields.map((field) => field.key));
  if (new Set(keys).size !== keys.length) throw new Error("Field keys must be unique across the template");
  return { role, name: body.name.trim(), isActive: body.isActive !== false, groups };
};

router.get("/current", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId, "role");
    let template = await ReportTemplate.findOne({ role: user?.role, isActive: true });
    if (!template && user?.role === "product_manager") template = await seedDefault();
    res.json(template || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Any authenticated user can choose any active report template.
router.get("/active", verifyToken, async (_req, res) => {
  try {
    await seedDefault();
    res.json(await ReportTemplate.find({ isActive: true }).sort({ name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    await seedDefault();
    res.json(await ReportTemplate.find().sort({ name: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    res.status(201).json(await ReportTemplate.create({ ...validateTemplate(req.body), createdBy: req.userId }));
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "A report template already exists for this role" : error.message });
  }
});

router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const template = await ReportTemplate.findByIdAndUpdate(req.params.id, validateTemplate(req.body), { new: true, runValidators: true });
    if (!template) return res.status(404).json({ message: "Report template not found" });
    res.json(template);
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "A report template already exists for this role" : error.message });
  }
});

router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  const template = await ReportTemplate.findByIdAndDelete(req.params.id);
  if (!template) return res.status(404).json({ message: "Report template not found" });
  res.json({ message: "Report template deleted" });
});

module.exports = router;
