const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth.middleware");
const verifyAdmin = require("../middleware/admin.middleware");
const PromptTemplate = require("../models/PromptTemplate.model");
const UserPromptOverride = require("../models/UserPromptOverride.model");

// ============================================================
// PUBLIC / USER ROUTES (authenticated)
// ============================================================

// GET /api/prompt-templates/active — List active templates for nav dropdown
router.get("/active", verifyToken, async (req, res) => {
  try {
    const templates = await PromptTemplate.find({ isActive: true })
      .select("name slug icon color description order")
      .sort({ order: 1, createdAt: 1 });
    res.json(templates);
  } catch (error) {
    console.error("Error fetching active templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// GET /api/prompt-templates/by-slug/:slug — Get full template with user overrides
router.get("/by-slug/:slug", verifyToken, async (req, res) => {
  try {
    const template = await PromptTemplate.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Get user overrides if any
    const override = await UserPromptOverride.findOne({
      userId: req.userId,
      templateId: template._id,
    });

    // Build response: merge defaults with overrides
    const prompts = template.prompts.map((p) => ({
      _id: p._id,
      name: p.name,
      key: p.key,
      description: p.description,
      order: p.order,
      hasVariables: p.hasVariables,
      defaultTemplate: p.defaultTemplate,
      template: override?.promptOverrides?.get(p.key) || p.defaultTemplate,
    }));

    res.json({
      _id: template._id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      icon: template.icon,
      color: template.color,
      variables: template.variables.sort((a, b) => a.order - b.order),
      prompts: prompts.sort((a, b) => a.order - b.order),
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST /api/prompt-templates/:id/overrides — Save user's custom prompt text
router.post("/:id/overrides", verifyToken, async (req, res) => {
  try {
    const { promptOverrides } = req.body;

    if (!promptOverrides || typeof promptOverrides !== "object") {
      return res.status(400).json({ message: "promptOverrides is required" });
    }

    // Verify template exists
    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const override = await UserPromptOverride.findOneAndUpdate(
      { userId: req.userId, templateId: req.params.id },
      { promptOverrides },
      { upsert: true, new: true },
    );

    res.json({ message: "Overrides saved", override });
  } catch (error) {
    console.error("Error saving overrides:", error);
    res.status(500).json({ message: "Failed to save overrides" });
  }
});

// DELETE /api/prompt-templates/:id/overrides — Reset all user overrides (back to defaults)
router.delete("/:id/overrides", verifyToken, async (req, res) => {
  try {
    await UserPromptOverride.findOneAndDelete({
      userId: req.userId,
      templateId: req.params.id,
    });
    res.json({ message: "All overrides reset to default" });
  } catch (error) {
    console.error("Error resetting overrides:", error);
    res.status(500).json({ message: "Failed to reset overrides" });
  }
});

// DELETE /api/prompt-templates/:id/overrides/:promptKey — Reset specific prompt
router.delete("/:id/overrides/:promptKey", verifyToken, async (req, res) => {
  try {
    const override = await UserPromptOverride.findOne({
      userId: req.userId,
      templateId: req.params.id,
    });

    if (override) {
      override.promptOverrides.delete(req.params.promptKey);
      // If no overrides left, delete the document
      if (override.promptOverrides.size === 0) {
        await override.deleteOne();
      } else {
        await override.save();
      }
    }

    res.json({ message: `Prompt "${req.params.promptKey}" reset to default` });
  } catch (error) {
    console.error("Error resetting prompt override:", error);
    res.status(500).json({ message: "Failed to reset prompt" });
  }
});

// ============================================================
// ADMIN ROUTES
// ============================================================

// GET /api/prompt-templates — List all templates (admin)
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const templates = await PromptTemplate.find()
      .sort({ order: 1, createdAt: 1 })
      .populate("createdBy", "name email");
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// GET /api/prompt-templates/:id — Get single template (admin)
router.get("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST /api/prompt-templates — Create template (admin)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      icon,
      color,
      order,
      isActive,
      prompts,
      variables,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Generate slug if not provided
    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existing = await PromptTemplate.findOne({ slug: finalSlug });
    if (existing) {
      return res
        .status(400)
        .json({ message: "A template with this slug already exists" });
    }

    const template = new PromptTemplate({
      name,
      slug: finalSlug,
      description: description || "",
      icon: icon || "FileText",
      color: color || "primary",
      order: order ?? 0,
      isActive: isActive !== false,
      prompts: prompts || [],
      variables: variables || [],
      createdBy: req.userId,
    });

    await template.save();
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug must be unique" });
    }
    res.status(500).json({ message: "Failed to create template" });
  }
});

// PUT /api/prompt-templates/:id — Update template (admin)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      icon,
      color,
      order,
      isActive,
      prompts,
      variables,
    } = req.body;

    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== template.slug) {
      const existing = await PromptTemplate.findOne({
        slug,
        _id: { $ne: template._id },
      });
      if (existing) {
        return res.status(400).json({ message: "Slug already in use" });
      }
      template.slug = slug;
    }

    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (icon !== undefined) template.icon = icon;
    if (color !== undefined) template.color = color;
    if (order !== undefined) template.order = order;
    if (isActive !== undefined) template.isActive = isActive;
    if (prompts !== undefined) template.prompts = prompts;
    if (variables !== undefined) template.variables = variables;

    await template.save();
    res.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Slug must be unique" });
    }
    res.status(500).json({ message: "Failed to update template" });
  }
});

// DELETE /api/prompt-templates/:id — Delete template (admin)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const template = await PromptTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Clean up user overrides for this template
    await UserPromptOverride.deleteMany({ templateId: req.params.id });

    await template.deleteOne();
    res.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
});

module.exports = router;
