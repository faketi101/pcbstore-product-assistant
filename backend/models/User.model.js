const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const reportSchema = new mongoose.Schema({
  id: String,
  date: String,
  time: String,
  timestamp: Date,
  type: String,
  data: {
    description: {
      generated: { type: Number, default: 0 },
      added: { type: Number, default: 0 },
    },
    faq: {
      generated: { type: Number, default: 0 },
      added: { type: Number, default: 0 },
    },
    keyFeatures: {
      generated: { type: Number, default: 0 },
      added: { type: Number, default: 0 },
    },
    specifications: {
      generated: { type: Number, default: 0 },
      added: { type: Number, default: 0 },
    },
    metaTitleDescription: {
      generated: { type: Number, default: 0 },
      added: { type: Number, default: 0 },
    },
    titleFixed: {
      fixed: { type: Number, default: 0 },
      added: { type: Number, default: 0 },
    },
    imageRenamed: {
      fixed: { type: Number, default: 0 },
    },
    category: {
      added: { type: Number, default: 0 },
    },
    attributes: {
      added: { type: Number, default: 0 },
    },
    deliveryCharge: {
      added: { type: Number, default: 0 },
    },
    warranty: {
      added: { type: Number, default: 0 },
    },
    warrantyClaimReasons: {
      added: { type: Number, default: 0 },
    },
    brand: {
      added: { type: Number, default: 0 },
    },
    price: {
      added: { type: Number, default: 0 },
    },
    customFields: [mongoose.Schema.Types.Mixed],
  },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["product_manager", "admin", "user"],
      default: "user",
    },
    prompts: {
      staticPrompt: {
        type: String,
        default: "",
      },
      mainPromptTemplate: {
        type: String,
        default: "",
      },
    },
    reports: [reportSchema],
  },
  {
    timestamps: true,
  },
);

// Method to compare password (plain text vs hashed)
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Pre-save hook to hash password only if it's modified and not already hashed
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (this.password.match(/^\$2[ayb]\$.{56}$/)) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
