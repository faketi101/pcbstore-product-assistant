const express = require("express");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User.model");
const ReportTemplate = require("../models/ReportTemplate.model");
const verifyToken = require("../middleware/auth.middleware");
const verifyAdmin = require("../middleware/admin.middleware");

const router = express.Router();

const legacyReportFields = {
  description: "Description",
  faq: "FAQ",
  keyFeatures: "Key Features",
  specifications: "Specifications",
  metaTitleDescription: "Meta Title & Description",
  titleFixed: "Title",
  imageRenamed: "Image Renamed & Fixed",
  productReCheck: "Product Recheck",
  category: "Category",
  attributes: "Attributes",
  deliveryCharge: "Delivery Charge",
  warranty: "Warranty",
  warrantyClaimReasons: "Warranty Claim Reasons",
  brand: "Brand",
  price: "Price",
  internalLink: "Internal Link",
};

const humanize = (value = "") => value
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[_-]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const actionsFromValues = (values = {}, definitions = []) => {
  const labels = new Map(definitions.map((item) => [item.key, item.label]));
  return Object.entries(values || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => ({ key, label: labels.get(key) || humanize(key), value: Number(value) }));
};

const getReportEntries = (data = {}) => {
  if (Array.isArray(data.reportEntries)) return data.reportEntries;
  const entries = [];
  const representedKeys = new Set();
  const template = data.reportTemplate;

  (template?.groups || []).forEach((group) => {
    (group.fields || []).forEach((field) => {
      representedKeys.add(field.key);
      const actions = actionsFromValues(data.dynamicFields?.[field.key], field.counters || []);
      if (actions.length) entries.push({ templateName: template.name || "Report", groupName: group.name || "Work", fieldKey: field.key, label: field.label || humanize(field.key), actions });
    });
  });

  Object.entries(data.dynamicFields || {}).forEach(([fieldKey, values]) => {
    if (representedKeys.has(fieldKey)) return;
    const actions = actionsFromValues(values);
    if (actions.length) entries.push({ templateName: template?.name || "Other Work", groupName: "Other", fieldKey, label: humanize(fieldKey), actions });
  });

  Object.entries(legacyReportFields).forEach(([fieldKey, label]) => {
    const actions = actionsFromValues(data[fieldKey]);
    if (actions.length) entries.push({ templateName: "Product Management", groupName: "Product Work", fieldKey, label, actions });
  });

  (data.customFields || []).forEach((field) => {
    if (Number(field.value) > 0) entries.push({ templateName: field.templateName || template?.name || "Other Work", groupName: field.groupName || "Custom Work", fieldKey: `custom:${String(field.name).trim().toLowerCase()}`, label: field.name, actions: [{ key: "completed", label: "Completed", value: Number(field.value) }] });
  });
  return entries;
};

const aggregateReportEntries = (reports) => {
  const merged = new Map();
  reports.flatMap((report) => getReportEntries(report.data || report)).forEach((entry) => {
    const entryKey = `${entry.templateName}\u0000${entry.groupName}\u0000${entry.fieldKey}\u0000${entry.label}`;
    if (!merged.has(entryKey)) merged.set(entryKey, { ...entry, actions: [] });
    const target = merged.get(entryKey);
    (entry.actions || []).forEach((action) => {
      let existing = target.actions.find((item) => item.key === action.key && item.label === action.label);
      if (!existing) { existing = { ...action, value: 0 }; target.actions.push(existing); }
      existing.value += Number(action.value) || 0;
    });
  });
  return [...merged.values()];
};

/* ---------------------------------------------
   FORMAT REPORT FOR WHATSAPP
---------------------------------------------- */

const formatReportForWhatsApp = (reportData, type = "hourly", date = "") => {
  const { data } = reportData;

  let output =
    type === "hourly" ? "Hourly Update:\n\n" : "Today's work done:\n\n";

  if (date) {
    output =
      type === "hourly"
        ? `Hourly Update (${date}):\n\n`
        : `Today's work done (${date}):\n\n`;
  }

  output += "Work Summary\n";

  const reportEntries = getReportEntries(data);
  if (reportEntries.length) {
    const sections = new Map();
    reportEntries.forEach((entry) => {
      const key = `${entry.templateName}\u0000${entry.groupName}`;
      if (!sections.has(key)) sections.set(key, { templateName: entry.templateName, groupName: entry.groupName, entries: [] });
      sections.get(key).entries.push(entry);
    });
    output += [...sections.values()].map((section) => {
      const heading = section.templateName === section.groupName ? section.templateName : `${section.templateName} — ${section.groupName}`;
      return `${heading}\n${section.entries.map((entry) => `- ${entry.label}: ${entry.actions.map((action) => `${action.label.toLowerCase()} ${action.value}`).join(", ")}`).join("\n")}`;
    }).join("\n\n");
    return output;
  }

  const lines = [];

  const getActionTexts = (field) => {
    if (!field) return [];

    const actions = [];

    if (field.generated > 0) actions.push(`generated ${field.generated}`);
    if (field.added > 0) actions.push(`added ${field.added}`);
    if (field.fixed > 0) actions.push(`fixed ${field.fixed}`);

    return actions;
  };

  const pushLine = (label, field) => {
    const actions = getActionTexts(field);
    if (actions.length) {
      lines.push(`- ${label} ${actions.join(", ")}`);
    }
  };

  pushLine("description", data.description);
  pushLine("FAQ", data.faq);
  pushLine("key features", data.keyFeatures);
  pushLine("specifications", data.specifications);
  pushLine("meta title and description", data.metaTitleDescription);
  pushLine("warranty claim reasons", data.warrantyClaimReasons);

  if (data.titleFixed) {
    const actions = [];
    if (data.titleFixed.fixed > 0)
      actions.push(`fixed ${data.titleFixed.fixed}`);
    if (data.titleFixed.added > 0)
      actions.push(`added ${data.titleFixed.added}`);
    if (actions.length) {
      lines.push(`- title ${actions.join(", ")}`);
    }
  }

  if (data.imageRenamed?.fixed > 0) {
    lines.push(`- image renamed and fixed ${data.imageRenamed.fixed}`);
  }

  // Handle productReCheck with check and fixed
  if (data.productReCheck) {
    const actions = [];
    if (data.productReCheck.check > 0)
      actions.push(`checked ${data.productReCheck.check}`);
    if (data.productReCheck.fixed > 0)
      actions.push(`fixed ${data.productReCheck.fixed}`);
    if (actions.length) {
      lines.push(`- product recheck ${actions.join(", ")}`);
    }
  }

  if (data.category?.added > 0)
    lines.push(`- category added ${data.category.added}`);
  if (data.attributes?.added > 0)
    lines.push(`- attributes added ${data.attributes.added}`);
  if (data.deliveryCharge?.added > 0)
    lines.push(`- delivery charge added ${data.deliveryCharge.added}`);
  if (data.warranty?.added > 0)
    lines.push(`- warranty added ${data.warranty.added}`);
  if (data.brand?.added > 0) lines.push(`- brand added ${data.brand.added}`);
  if (data.price?.added > 0) lines.push(`- price added ${data.price.added}`);
  if (data.internalLink?.added > 0)
    lines.push(`- internal link added ${data.internalLink.added}`);

  if (data.customFields?.length) {
    data.customFields.forEach((field) => {
      if (field.value > 0) {
        lines.push(`- ${field.name} ${field.value}`);
      }
    });
  }

  output += lines.join(",\n");
  return output;
};

/* ---------------------------------------------
   AGGREGATE DAILY REPORT
---------------------------------------------- */

const aggregateDailyReport = (hourlyReports) => {
  const aggregated = {
    reportEntries: aggregateReportEntries(hourlyReports),
    reportTemplate: null,
    dynamicFields: {},
    description: { generated: 0, added: 0 },
    faq: { generated: 0, added: 0 },
    keyFeatures: { generated: 0, added: 0 },
    specifications: { generated: 0, added: 0 },
    metaTitleDescription: { generated: 0, added: 0 },
    warrantyClaimReasons: { generated: 0, added: 0 },
    titleFixed: { fixed: 0, added: 0 },
    imageRenamed: { fixed: 0 },
    productReCheck: { check: 0, fixed: 0 },
    category: { added: 0 },
    attributes: { added: 0 },
    deliveryCharge: { added: 0 },
    warranty: { added: 0 },
    brand: { added: 0 },
    price: { added: 0 },
    internalLink: { added: 0 },
    customFields: [],
  };

  const customFieldsMap = new Map();

  hourlyReports.forEach((report) => {
    const { data } = report;

    Object.keys(aggregated).forEach((key) => {
      if (key === "customFields" || key === "reportTemplate" || key === "dynamicFields" || key === "reportEntries") return;
      if (data[key]) {
        Object.keys(data[key]).forEach((subKey) => {
          aggregated[key][subKey] += data[key][subKey] || 0;
        });
      }
    });

    if (data.customFields?.length) {
      data.customFields.forEach((field) => {
        customFieldsMap.set(
          field.name,
          (customFieldsMap.get(field.name) || 0) + field.value,
        );
      });
    }

    if (data.reportTemplate && data.dynamicFields) {
      aggregated.reportTemplate = data.reportTemplate;
      Object.entries(data.dynamicFields).forEach(([fieldKey, counters]) => {
        aggregated.dynamicFields[fieldKey] ||= {};
        Object.entries(counters || {}).forEach(([counterKey, value]) => {
          aggregated.dynamicFields[fieldKey][counterKey] = (aggregated.dynamicFields[fieldKey][counterKey] || 0) + (Number(value) || 0);
        });
      });
    }
  });

  customFieldsMap.forEach((value, name) => {
    aggregated.customFields.push({ name, value });
  });

  return aggregated;
};

const LEGACY_TEMPLATE_ROLE = "__legacy__";

const reportMatchesTemplate = (report, templateRole) => {
  if (!templateRole) return true;
  const reportRole = report?.data?.reportTemplate?.role;
  if (templateRole === LEGACY_TEMPLATE_ROLE) return !reportRole;
  return reportRole === templateRole;
};

const filterReports = (reports = [], filters = {}) => {
  let filtered = [...reports];
  if (filters.date) {
    filtered = filtered.filter((report) => report.date === filters.date);
  }
  if (filters.startDate) {
    filtered = filtered.filter((report) => report.date >= filters.startDate);
  }
  if (filters.endDate) {
    filtered = filtered.filter((report) => report.date <= filters.endDate);
  }
  if (filters.templateRole) {
    filtered = filtered.filter((report) =>
      reportMatchesTemplate(report, filters.templateRole),
    );
  }
  return filtered;
};

const buildTemplateOptions = (reports = [], templates = []) => {
  const options = new Map();
  templates.forEach((template) => {
    if (template.role) options.set(template.role, template.name || template.role);
  });

  let hasLegacyReports = false;
  reports.forEach((report) => {
    const template = report?.data?.reportTemplate;
    if (template?.role) {
      options.set(template.role, template.name || template.role);
    } else {
      hasLegacyReports = true;
    }
  });

  const result = [...options.entries()]
    .map(([role, name]) => ({ role, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (hasLegacyReports) {
    result.push({ role: LEGACY_TEMPLATE_ROLE, name: "Legacy / General" });
  }
  return result;
};

/* ---------------------------------------------
   ROUTES
---------------------------------------------- */

router.get("/filter-templates", verifyToken, async (req, res) => {
  try {
    const [user, templates] = await Promise.all([
      User.findById(req.userId, "reports"),
      ReportTemplate.find({ isActive: true }, "name role").lean(),
    ]);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ templates: buildTemplateOptions(user.reports || [], templates) });
  } catch (error) {
    res.status(500).json({ message: "Unable to load report templates." });
  }
});

router.get(
  "/admin/filter-templates",
  verifyToken,
  verifyAdmin,
  async (_req, res) => {
    try {
      const [users, templates] = await Promise.all([
        User.find({}, "reports"),
        ReportTemplate.find({}, "name role").lean(),
      ]);
      const reports = users.flatMap((user) => user.reports || []);
      res.json({ templates: buildTemplateOptions(reports, templates) });
    } catch (error) {
      res.status(500).json({ message: "Unable to load report templates." });
    }
  },
);

// GET hourly reports with optional filters
router.get("/hourly", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const reports = filterReports(user.reports || [], req.query);

    // Sort by timestamp descending (newest first)
    reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ reports });
  } catch (e) {
    console.error("Get hourly reports error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST hourly
router.post("/hourly", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { data, date, time } = req.body;

    if (!data)
      return res.status(400).json({ message: "Report data is required." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.reports = user.reports || [];

    const now = new Date();
    const reportDate = date || now.toISOString().split("T")[0];
    const reportTime =
      time || `${now.getHours().toString().padStart(2, "0")}:00`;

    const report = {
      id: uuidv4(),
      date: reportDate,
      time: reportTime,
      timestamp: new Date(`${reportDate}T${reportTime}:00`).toISOString(),
      type: "hourly",
      data,
    };

    user.reports.push(report);
    await user.save();

    res.status(201).json({ message: "Hourly report created.", report });
  } catch (e) {
    console.error("Create hourly report error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET daily by date
router.get("/daily/:date", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const hourly = filterReports(user.reports || [], {
      date: req.params.date,
      templateRole: req.query.templateRole,
    });
    if (!hourly.length)
      return res.status(404).json({ message: "No reports found." });

    const data = aggregateDailyReport(hourly);

    res.json({
      report: {
        date: req.params.date,
        type: "daily",
        hourlyReportsCount: hourly.length,
        data,
        formattedText: formatReportForWhatsApp(
          { data },
          "daily",
          req.params.date,
        ),
      },
    });
  } catch (e) {
    console.error("Get daily report error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET multiple daily reports with date range
router.get("/daily", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const reports = filterReports(user.reports || [], req.query);

    // Get unique dates
    const dates = [...new Set(reports.map((r) => r.date))].sort().reverse();

    // Filter by date range if provided
    let filteredDates = dates;
    if (req.query.startDate && req.query.endDate) {
      filteredDates = dates.filter(
        (date) => date >= req.query.startDate && date <= req.query.endDate,
      );
    } else if (req.query.startDate) {
      filteredDates = dates.filter((date) => date >= req.query.startDate);
    } else if (req.query.endDate) {
      filteredDates = dates.filter((date) => date <= req.query.endDate);
    }

    // Aggregate daily reports for each date
    const dailyReports = filteredDates.map((date) => {
      const hourly = reports.filter((r) => r.date === date);
      const data = aggregateDailyReport(hourly);

      return {
        date,
        type: "daily",
        hourlyReportsCount: hourly.length,
        data,
        formattedText: formatReportForWhatsApp({ data }, "daily", date),
      };
    });

    res.json({ reports: dailyReports });
  } catch (e) {
    console.error("Get daily reports error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// UPDATE hourly report
router.put("/hourly/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const reportIndex = user.reports.findIndex((r) => r.id === req.params.id);

    if (reportIndex === -1) {
      return res.status(404).json({ message: "Report not found." });
    }

    // Update the report data and timestamp to maintain correct sort order
    const updatedReport = {
      ...user.reports[reportIndex],
      ...req.body,
      id: req.params.id, // Preserve the original ID
    };

    // Update timestamp based on date and time
    if (updatedReport.date && updatedReport.time) {
      updatedReport.timestamp = new Date(
        `${updatedReport.date}T${updatedReport.time}:00`,
      ).toISOString();
    }

    user.reports[reportIndex] = updatedReport;

    await user.save();

    res.json({
      message: "Report updated successfully.",
      report: user.reports[reportIndex],
    });
  } catch (e) {
    console.error("Update hourly report error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// DELETE hourly report
router.delete("/hourly/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const reportIndex = user.reports.findIndex((r) => r.id === req.params.id);

    if (reportIndex === -1) {
      return res.status(404).json({ message: "Report not found." });
    }

    user.reports.splice(reportIndex, 1);
    await user.save();

    res.json({ message: "Report deleted successfully." });
  } catch (e) {
    console.error("Delete hourly report error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ADMIN: Get reports from all users with optional date range and userId filter
router.get("/admin/reports", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, templateRole } = req.query;

    const userQuery = userId ? { _id: userId } : {};
    const users = await User.find(userQuery, "name email reports");

    const allReports = [];
    users.forEach((u) => {
      const reports = filterReports(u.reports || [], {
        startDate,
        endDate,
        templateRole,
      });

      reports.forEach((report) => {
        allReports.push({
          id: report.id,
          date: report.date,
          time: report.time,
          timestamp: report.timestamp,
          type: report.type,
          data: report.data,
          formattedText: formatReportForWhatsApp(report, "hourly", report.date),
          userName: u.name,
          userEmail: u.email,
          userId: u._id,
        });
      });
    });

    // Sort by timestamp descending (newest first)
    allReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ reports: allReports });
  } catch (e) {
    console.error("Admin get reports error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ADMIN: Get daily aggregated reports across all users
router.get("/admin/daily", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, templateRole } = req.query;

    const userQuery = userId ? { _id: userId } : {};
    const users = await User.find(userQuery, "name email reports");

    // Group all reports by user+date
    const userDateMap = new Map(); // key: `userId|date`

    users.forEach((u) => {
      const reports = filterReports(u.reports || [], {
        startDate,
        endDate,
        templateRole,
      });

      // Group by date for this user
      const dateMap = new Map();
      reports.forEach((r) => {
        if (!dateMap.has(r.date)) dateMap.set(r.date, []);
        dateMap.get(r.date).push(r);
      });

      dateMap.forEach((hourlyReports, date) => {
        const data = aggregateDailyReport(hourlyReports);
        userDateMap.set(`${u._id}|${date}`, {
          date,
          type: "daily",
          hourlyReportsCount: hourlyReports.length,
          data,
          formattedText: formatReportForWhatsApp({ data }, "daily", date),
          userName: u.name,
          userEmail: u.email,
          userId: u._id,
        });
      });
    });

    const dailyReports = Array.from(userDateMap.values()).sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.userName.localeCompare(b.userName),
    );

    res.json({ reports: dailyReports });
  } catch (e) {
    console.error("Admin get daily reports error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

// ADMIN: Get combined range summary across all users
router.get("/admin/range", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userId, templateRole } = req.query;

    const userQuery = userId ? { _id: userId } : {};
    const users = await User.find(userQuery, "name email reports");

    // If a specific user is selected, return their individual summary
    if (userId) {
      const userSummaries = [];
      users.forEach((u) => {
        const reports = filterReports(u.reports || [], {
          startDate,
          endDate,
          templateRole,
        });

        if (reports.length === 0) return;

        const data = aggregateDailyReport(reports);
        const dates = [...new Set(reports.map((r) => r.date))].sort();

        userSummaries.push({
          userName: u.name,
          userEmail: u.email,
          userId: u._id,
          type: "range",
          dateRange: { from: dates[0], to: dates[dates.length - 1] },
          totalDays: dates.length,
          totalReports: reports.length,
          data,
          formattedText: formatReportForWhatsApp(
            { data },
            "daily",
            `${dates[0]} to ${dates[dates.length - 1]}`,
          ),
        });
      });

      userSummaries.sort((a, b) => a.userName.localeCompare(b.userName));
      return res.json({ reports: userSummaries });
    }

    // "All Users" — return a single combined summary
    const allReports = [];
    const contributingUserIds = new Set();
    users.forEach((u) => {
      const reports = filterReports(u.reports || [], {
        startDate,
        endDate,
        templateRole,
      });
      if (reports.length) contributingUserIds.add(u._id.toString());
      allReports.push(...reports);
    });

    if (allReports.length === 0) {
      return res.json({ reports: [] });
    }

    const data = aggregateDailyReport(allReports);
    const allDates = [...new Set(allReports.map((r) => r.date))].sort();

    const combinedSummary = {
      userName: "All Users",
      userEmail: "",
      userId: null,
      type: "range",
      dateRange: {
        from: allDates[0],
        to: allDates[allDates.length - 1],
      },
      totalDays: allDates.length,
      totalReports: allReports.length,
      totalUsers: contributingUserIds.size,
      data,
      formattedText: formatReportForWhatsApp(
        { data },
        "daily",
        `${allDates[0]} to ${allDates[allDates.length - 1]}`,
      ),
    };

    res.json({ reports: [combinedSummary] });
  } catch (e) {
    console.error("Admin get range reports error:", e);
    res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
