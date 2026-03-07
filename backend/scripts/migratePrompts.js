/**
 * Migration Script: Migrate existing Product & Category prompts
 * to the new PromptTemplate system.
 *
 * Run once: node scripts/migratePrompts.js
 *
 * What it does:
 * 1. Creates "Product Prompt" and "Category Prompt" PromptTemplate documents
 *    with their variables, prompt sections, and default templates.
 * 2. Migrates per-user prompt customizations from User.prompts and
 *    User.categoryPrompts into UserPromptOverride documents.
 * 3. Safe to re-run — skips templates that already exist by slug.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/database");
const PromptTemplate = require("../models/PromptTemplate.model");
const UserPromptOverride = require("../models/UserPromptOverride.model");
const User = require("../models/User.model");
const {
  DEFAULT_STATIC_PROMPT,
  DEFAULT_MAIN_PROMPT_TEMPLATE,
} = require("../config/defaultPrompts");
const {
  DEFAULT_CATEGORY_PROMPT_1,
  DEFAULT_CATEGORY_PROMPT_2,
} = require("../config/defaultCategoryPrompts");

async function migrate() {
  await connectDB();
  console.log("🔄 Starting prompt migration...\n");

  // ── 1. Product Prompt Template ──────────────────────
  let productTemplate = await PromptTemplate.findOne({
    slug: "product-prompt",
  });
  if (!productTemplate) {
    productTemplate = await PromptTemplate.create({
      name: "Product Prompt",
      slug: "product-prompt",
      description: "Generate long-form, SEO-optimized product prompts",
      icon: "FileText",
      color: "primary",
      order: 0,
      isActive: true,
      variables: [
        {
          name: "Product Name",
          key: "productName",
          type: "text",
          placeholder: "e.g. NVIDIA RTX 4090",
          required: true,
          persistent: false,
          order: 0,
          gridColumn: "full",
        },
        {
          name: "Product Specifications / Information",
          key: "productSpecs",
          type: "textarea",
          placeholder: "Paste raw specs here...",
          required: false,
          persistent: false,
          order: 1,
          gridColumn: "full",
        },
        {
          name: "Product Category",
          key: "productCategory",
          type: "text",
          placeholder: "e.g. Graphics Card",
          required: false,
          persistent: false,
          order: 2,
          gridColumn: "half",
        },
        {
          name: "Product Sub-Category",
          key: "productSubCategory",
          type: "text",
          placeholder: "e.g. Desktop GPU",
          required: false,
          persistent: false,
          order: 3,
          gridColumn: "half",
        },
        {
          name: "Website Name",
          key: "websiteName",
          type: "text",
          defaultValue: "PCB Store",
          placeholder: "e.g. PCB Store",
          required: false,
          persistent: true,
          order: 4,
          gridColumn: "half",
        },
        {
          name: "Location",
          key: "location",
          type: "text",
          defaultValue: "Bangladesh",
          placeholder: "e.g. Bangladesh",
          required: false,
          persistent: true,
          order: 5,
          gridColumn: "half",
        },
      ],
      prompts: [
        {
          name: "Main Prompt",
          key: "mainPrompt",
          defaultTemplate: DEFAULT_MAIN_PROMPT_TEMPLATE,
          description:
            "Use ${variableName} for placeholders: productName, productSpecs, productCategory, productSubCategory, websiteName, location.",
          order: 0,
          hasVariables: true,
        },
        {
          name: "Static Prompt (2nd Prompt)",
          key: "staticPrompt",
          defaultTemplate: DEFAULT_STATIC_PROMPT,
          description:
            "This is the static instruction prompt. It is copied as-is (no variable replacement).",
          order: 1,
          hasVariables: false,
        },
      ],
    });
    console.log("✅ Created Product Prompt template");
  } else {
    console.log("⏭️  Product Prompt template already exists, skipping create");
  }

  // ── 2. Category Prompt Template ─────────────────────
  let categoryTemplate = await PromptTemplate.findOne({
    slug: "category-prompt",
  });
  if (!categoryTemplate) {
    categoryTemplate = await PromptTemplate.create({
      name: "Category Prompt",
      slug: "category-prompt",
      description:
        "Generate SEO-optimized category content and key features/specs prompts",
      icon: "FolderOpen",
      color: "emerald",
      order: 1,
      isActive: true,
      variables: [
        {
          name: "Product Name",
          key: "productName",
          type: "text",
          placeholder: "e.g. NVIDIA RTX 4090",
          required: true,
          persistent: false,
          order: 0,
          gridColumn: "half",
        },
        {
          name: "Product Main Category",
          key: "productMainCategory",
          type: "text",
          placeholder: "e.g. PC Components",
          required: true,
          persistent: false,
          order: 1,
          gridColumn: "half",
        },
        {
          name: "Product Sub Category",
          key: "productSubCategory",
          type: "text",
          placeholder: "e.g. Graphics Cards",
          required: false,
          persistent: false,
          order: 2,
          gridColumn: "half",
        },
        {
          name: "Product Sub Category 2",
          key: "productSubCategory2",
          type: "text",
          placeholder: "e.g. NVIDIA GPUs",
          required: false,
          persistent: false,
          order: 3,
          gridColumn: "half",
        },
        {
          name: "Related Categories (comma separated)",
          key: "relatedCategories",
          type: "text",
          placeholder: "e.g. Gaming Monitors, Power Supplies, CPU Coolers",
          required: false,
          persistent: false,
          order: 4,
          gridColumn: "full",
        },
        {
          name: "Specs",
          key: "specs",
          type: "textarea",
          placeholder: "Paste product specifications here...",
          required: false,
          persistent: false,
          order: 5,
          gridColumn: "full",
        },
        {
          name: "Product Content",
          key: "productContent",
          type: "textarea",
          placeholder: "Paste complete product content here...",
          required: false,
          persistent: false,
          order: 6,
          gridColumn: "full",
        },
      ],
      prompts: [
        {
          name: "SEO Category Content",
          key: "categoryPrompt1",
          defaultTemplate: DEFAULT_CATEGORY_PROMPT_1,
          description:
            "Placeholders: ${productName}, ${productMainCategory}, ${productSubCategory}, ${productSubCategory2}, ${relatedCategories}, ${specs}",
          order: 0,
          hasVariables: true,
        },
        {
          name: "Key Features & Specs",
          key: "categoryPrompt2",
          defaultTemplate: DEFAULT_CATEGORY_PROMPT_2,
          description: "Placeholder: ${productContent}",
          order: 1,
          hasVariables: true,
        },
      ],
    });
    console.log("✅ Created Category Prompt template");
  } else {
    console.log("⏭️  Category Prompt template already exists, skipping create");
  }

  // ── 3. Migrate per-user prompt overrides ────────────
  const users = await User.find({
    $or: [
      { "prompts.staticPrompt": { $ne: "" } },
      { "prompts.mainPromptTemplate": { $ne: "" } },
      { "categoryPrompts.categoryPrompt1": { $ne: "" } },
      { "categoryPrompts.categoryPrompt2": { $ne: "" } },
    ],
  });

  let migratedCount = 0;

  for (const user of users) {
    // Product prompt overrides
    const hasProductOverride =
      (user.prompts?.mainPromptTemplate &&
        user.prompts.mainPromptTemplate !== DEFAULT_MAIN_PROMPT_TEMPLATE) ||
      (user.prompts?.staticPrompt &&
        user.prompts.staticPrompt !== DEFAULT_STATIC_PROMPT);

    if (hasProductOverride) {
      const overrides = {};
      if (
        user.prompts.mainPromptTemplate &&
        user.prompts.mainPromptTemplate !== DEFAULT_MAIN_PROMPT_TEMPLATE
      ) {
        overrides.mainPrompt = user.prompts.mainPromptTemplate;
      }
      if (
        user.prompts.staticPrompt &&
        user.prompts.staticPrompt !== DEFAULT_STATIC_PROMPT
      ) {
        overrides.staticPrompt = user.prompts.staticPrompt;
      }

      if (Object.keys(overrides).length > 0) {
        await UserPromptOverride.findOneAndUpdate(
          { userId: user._id, templateId: productTemplate._id },
          { promptOverrides: overrides },
          { upsert: true },
        );
        migratedCount++;
        console.log(`  📦 Migrated product prompt overrides for ${user.name}`);
      }
    }

    // Category prompt overrides
    const hasCategoryOverride =
      (user.categoryPrompts?.categoryPrompt1 &&
        user.categoryPrompts.categoryPrompt1 !== DEFAULT_CATEGORY_PROMPT_1) ||
      (user.categoryPrompts?.categoryPrompt2 &&
        user.categoryPrompts.categoryPrompt2 !== DEFAULT_CATEGORY_PROMPT_2);

    if (hasCategoryOverride) {
      const overrides = {};
      if (
        user.categoryPrompts.categoryPrompt1 &&
        user.categoryPrompts.categoryPrompt1 !== DEFAULT_CATEGORY_PROMPT_1
      ) {
        overrides.categoryPrompt1 = user.categoryPrompts.categoryPrompt1;
      }
      if (
        user.categoryPrompts.categoryPrompt2 &&
        user.categoryPrompts.categoryPrompt2 !== DEFAULT_CATEGORY_PROMPT_2
      ) {
        overrides.categoryPrompt2 = user.categoryPrompts.categoryPrompt2;
      }

      if (Object.keys(overrides).length > 0) {
        await UserPromptOverride.findOneAndUpdate(
          { userId: user._id, templateId: categoryTemplate._id },
          { promptOverrides: overrides },
          { upsert: true },
        );
        migratedCount++;
        console.log(`  📦 Migrated category prompt overrides for ${user.name}`);
      }
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Templates created/verified: 2`);
  console.log(`   User overrides migrated: ${migratedCount}`);
  console.log(
    `\n💡 The old prompt routes (/api/prompts, /api/category-prompts) still work.`,
  );
  console.log(
    `   You can remove them once you confirm the new system works.\n`,
  );

  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
