const mongoose = require("mongoose");

const userPromptOverrideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromptTemplate",
      required: true,
    },
    // Stores user's custom template text per prompt section key
    // e.g. { "mainPrompt": "customized text...", "staticPrompt": "..." }
    promptOverrides: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index: one override per user per template
userPromptOverrideSchema.index({ userId: 1, templateId: 1 }, { unique: true });

const UserPromptOverride = mongoose.model(
  "UserPromptOverride",
  userPromptOverrideSchema,
);

module.exports = UserPromptOverride;
