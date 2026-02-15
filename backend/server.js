require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const morgan = require("morgan");
const connectDB = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const promptRoutes = require("./routes/prompt.routes");
const categoryPromptRoutes = require("./routes/categoryPrompt.routes");
const reportRoutes = require("./routes/report.routes");
const taskRoutes = require("./routes/task.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Morgan logger - only in development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// CORS configuration - allow multiple origins for local network access and cloud deployment
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Add your local network IPs here when needed
  // 'http://192.168.1.100:5173',
].filter(Boolean);

// Split multiple origins from FRONTEND_URL if provided as comma-separated
if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes(",")) {
  const extraOrigins = process.env.FRONTEND_URL.split(",").map((url) =>
    url.trim(),
  );
  allowedOrigins.push(...extraOrigins);
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      // In development, allow all origins
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      // In production, check against allowed origins
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        console.log(`Allowed origins:`, allowedOrigins);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  touchAfter: 24 * 3600, // lazy session update (in seconds)
  mongoOptions: {
    serverSelectionTimeoutMS: 5000,
  },
});

// Handle session store errors
sessionStore.on("error", function (error) {
  console.error("Session store error:", error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret_key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: "connect.sid", // Explicit session cookie name
    cookie: {
      secure:
        process.env.NODE_ENV === "production" &&
        process.env.COOKIE_SECURE !== "false", // requires HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 'none' for cross-origin in production with HTTPS
      domain: process.env.COOKIE_DOMAIN || undefined, // e.g., '.yourdomain.com' for subdomains
    },
  }),
);

// Debug middleware - log session info
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    console.log("Session ID:", req.sessionID);
    console.log("Session userId:", req.session?.userId);
  }

  // Log session issues in production
  if (process.env.NODE_ENV === "production") {
    // Log when there's no session but we're hitting protected routes
    if (
      !req.session?.userId &&
      req.path.startsWith("/api/") &&
      req.path !== "/api/login" &&
      req.path !== "/api/health"
    ) {
      console.warn(
        `No session for ${req.method} ${req.path} - Session ID: ${req.sessionID}`,
      );
      console.warn(`Cookie header:`, req.headers.cookie);
      console.warn(`Origin:`, req.headers.origin);
    }
  }

  next();
});

// Routes
app.use("/api", authRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api/category-prompts", categoryPromptRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to PCB Automotions API." });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const os = require("os");

  // Get network interfaces to show server IP
  const networkInterfaces = os.networkInterfaces();
  const ips = [];
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((iface) => {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    });
  });

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      ips: ips.length > 0 ? ips : ["Unable to detect - check server logs"],
    },
    mongodb: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      stateDescription:
        ["disconnected", "connected", "connecting", "disconnecting"][
          mongoose.connection.readyState
        ] || "unknown",
      host: mongoose.connection.host || "not connected",
      name: mongoose.connection.name || "not connected",
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasMongodbUri: !!process.env.MONGODB_URI,
      mongodbUriPrefix: process.env.MONGODB_URI?.substring(0, 20) + "...",
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasFrontendUrl: !!process.env.FRONTEND_URL,
      cookieSecure: process.env.COOKIE_SECURE,
    },
    session: {
      cookieSettings: {
        secure:
          process.env.NODE_ENV === "production" &&
          process.env.COOKIE_SECURE !== "false",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        domain: process.env.COOKIE_DOMAIN || undefined,
      },
    },
  });
});

// Session test endpoint - helps debug session issues
app.get("/api/session-test", (req, res) => {
  const hasSession = !!req.session;
  const sessionData = req.session || {};

  // Set a test value if it doesn't exist
  if (req.query.set === "true") {
    req.session.testValue = Date.now();
    req.session.testCounter = (req.session.testCounter || 0) + 1;
  }

  res.json({
    status: "ok",
    hasSession,
    sessionID: req.sessionID,
    isAuthenticated: !!req.session?.userId,
    userId: req.session?.userId || null,
    testValue: sessionData.testValue || null,
    testCounter: sessionData.testCounter || 0,
    cookie: req.headers.cookie || null,
    instructions: {
      test: "Visit /api/session-test?set=true to set session data, then refresh to see if it persists",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("\n=== Environment Configuration ===");
  console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
  console.log("MONGODB_URI:", process.env.MONGODB_URI ? "✓ Set" : "✗ MISSING");
  console.log(
    "SESSION_SECRET:",
    process.env.SESSION_SECRET ? "✓ Set" : "✗ MISSING",
  );
  console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "not set");
  console.log(
    "COOKIE_SECURE:",
    process.env.COOKIE_SECURE || "not set (will default based on NODE_ENV)",
  );
  console.log("=================================\n");

  if (!process.env.SESSION_SECRET) {
    console.warn(
      "⚠️  WARNING: SESSION_SECRET not set! Using default (not secure for production)",
    );
  }
  if (!process.env.MONGODB_URI) {
    console.error(
      "❌ ERROR: MONGODB_URI not set! Database connection will fail.",
    );
  }
});
