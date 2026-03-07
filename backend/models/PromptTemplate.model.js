const mongoose = require("mongoose");

const variableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Display name e.g. "Product Name"
    key: { type: String, required: true }, // Template key e.g. "productName"
    type: {
      type: String,
      enum: ["text", "textarea", "select"],
      default: "text",
    },
    defaultValue: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: false },
    persistent: { type: Boolean, default: false }, // Keep value after form reset
    options: [String], // For select type
    order: { type: Number, default: 0 },
    gridColumn: {
      type: String,
      enum: ["full", "half"],
      default: "full",
    },
  },
  { _id: true },
);

const promptSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Display name e.g. "Main Prompt"
    key: { type: String, required: true }, // Unique key e.g. "mainPrompt"
    defaultTemplate: { type: String, default: "" }, // Default template text
    description: { type: String, default: "" }, // Helper text for editing
    order: { type: Number, default: 0 },
    hasVariables: { type: Boolean, default: true }, // Whether this prompt uses variable replacement
  },
  { _id: true },
);

const promptTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Product Prompt"
    slug: { type: String, required: true, unique: true }, // URL-friendly e.g. "product-prompt"
    description: { type: String, default: "" },
    icon: { type: String, default: "FileText" }, // Lucide icon name
    color: { type: String, default: "primary" }, // Theme color
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    prompts: [promptSectionSchema],
    variables: [variableSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save: generate slug from name if not provided
promptTemplateSchema.pre("validate", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

const PromptTemplate = mongoose.model("PromptTemplate", promptTemplateSchema);

module.exports = PromptTemplate;
