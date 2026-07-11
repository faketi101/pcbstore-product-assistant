const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: true },
);

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    counters: { type: [counterSchema], default: [] },
  },
  { _id: true },
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    fields: { type: [fieldSchema], default: [] },
  },
  { _id: true },
);

const reportTemplateSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    groups: { type: [groupSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ReportTemplate", reportTemplateSchema);
