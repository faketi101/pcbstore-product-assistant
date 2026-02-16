const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    links: [
      {
        url: {
          type: String,
          required: true,
        },
        label: {
          type: String,
          default: "",
        },
      },
    ],
    totalTaskCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    totalCompletedTask: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: function (value) {
          return value <= this.totalTaskCount;
        },
        message: "Total completed tasks cannot exceed total task count",
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["Not Started", "Running", "On Hold", "Completed"],
      default: "Not Started",
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastUpdated: {
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      action: {
        type: String,
        default: "",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save middleware to auto-transition task status
taskSchema.pre("save", function (next) {
  // Auto-start: if completed tasks added while "Not Started" or "On Hold", switch to "Running"
  if (
    this.totalCompletedTask > 0 &&
    (this.status === "Not Started" || this.status === "On Hold") &&
    this.totalCompletedTask < this.totalTaskCount
  ) {
    this.status = "Running";
  }

  // Auto-complete if all tasks are done
  if (
    this.totalTaskCount === this.totalCompletedTask &&
    this.totalTaskCount > 0
  ) {
    this.status = "Completed";
    if (!this.endDate) {
      this.endDate = new Date();
    }
  }

  next();
});

// Virtual for completion percentage (for frontend use)
taskSchema.virtual("completionPercentage").get(function () {
  if (this.totalTaskCount === 0) return 0;
  return Math.round((this.totalCompletedTask / this.totalTaskCount) * 100);
});

// Virtual for task duration (for frontend use)
taskSchema.virtual("duration").get(function () {
  if (!this.endDate) return null;
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffMs = end - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtuals are included in JSON output
taskSchema.set("toJSON", { virtuals: true });
taskSchema.set("toObject", { virtuals: true });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
