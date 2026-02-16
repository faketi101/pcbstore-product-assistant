const express = require("express");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User.model");
const verifyToken = require("../middleware/auth.middleware");
const verifyAdmin = require("../middleware/admin.middleware");

const router = express.Router();

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

  output += "Products\n";

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
      if (key === "customFields") return;
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
  });

  customFieldsMap.forEach((value, name) => {
    aggregated.customFields.push({ name, value });
  });

  return aggregated;
};

/* ---------------------------------------------
   ROUTES
---------------------------------------------- */

// GET hourly reports with optional filters
router.get("/hourly", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    let reports = user.reports || [];

    // Filter by date if provided
    if (req.query.date) {
      reports = reports.filter((r) => r.date === req.query.date);
    }

    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      reports = reports.filter((r) => {
        return r.date >= req.query.startDate && r.date <= req.query.endDate;
      });
    } else if (req.query.startDate) {
      reports = reports.filter((r) => r.date >= req.query.startDate);
    } else if (req.query.endDate) {
      reports = reports.filter((r) => r.date <= req.query.endDate);
    }

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

    const hourly = (user.reports || []).filter(
      (r) => r.date === req.params.date,
    );
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

    let reports = user.reports || [];

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
    const { startDate, endDate, userId } = req.query;

    const userQuery = userId ? { _id: userId } : {};
    const users = await User.find(userQuery, "name email reports");

    const allReports = [];
    users.forEach((u) => {
      let reports = u.reports || [];

      // Filter by date range
      if (startDate) reports = reports.filter((r) => r.date >= startDate);
      if (endDate) reports = reports.filter((r) => r.date <= endDate);

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
    const { startDate, endDate, userId } = req.query;

    const userQuery = userId ? { _id: userId } : {};
    const users = await User.find(userQuery, "name email reports");

    // Group all reports by user+date
    const userDateMap = new Map(); // key: `userId|date`

    users.forEach((u) => {
      let reports = u.reports || [];
      if (startDate) reports = reports.filter((r) => r.date >= startDate);
      if (endDate) reports = reports.filter((r) => r.date <= endDate);

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
    const { startDate, endDate, userId } = req.query;

    const userQuery = userId ? { _id: userId } : {};
    const users = await User.find(userQuery, "name email reports");

    // If a specific user is selected, return their individual summary
    if (userId) {
      const userSummaries = [];
      users.forEach((u) => {
        let reports = u.reports || [];
        if (startDate) reports = reports.filter((r) => r.date >= startDate);
        if (endDate) reports = reports.filter((r) => r.date <= endDate);

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
    users.forEach((u) => {
      let reports = u.reports || [];
      if (startDate) reports = reports.filter((r) => r.date >= startDate);
      if (endDate) reports = reports.filter((r) => r.date <= endDate);
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
      totalUsers: users.length,
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
