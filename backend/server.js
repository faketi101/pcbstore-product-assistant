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
const reportRoutes = require("./routes/report.routes");

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

// CORS configuration - allow multiple origins for local network access
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // Add your local network IPs here when needed
  // 'http://192.168.1.100:5173',
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV === "development"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_session_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600, // lazy session update (in seconds)
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // requires HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours (still expires on browser close if browser supports it)
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  }),
);

// Debug middleware - log session info in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log("Session ID:", req.sessionID);
    // console.log("Session Data:", req.session);
    next();
  });
}

// Routes
app.use("/api", authRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to PCB Automotions API." });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const HOST = process.env.HOST || "0.0.0.0"; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log(
    `Server is running on http://${HOST}:${PORT} in ${process.env.NODE_ENV || "development"} mode.`,
  );
  console.log(`Local: http://localhost:${PORT}`);

  // Get local network IP
  const os = require("os");
  const networkInterfaces = os.networkInterfaces();
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((iface) => {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`Network: http://${iface.address}:${PORT}`);
      }
    });
  });
});
