const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

const verifyToken = async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

  if (!token) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Auth failed - no token:", {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!authHeader,
        origin: req.headers.origin,
      });
    }
    return res
      .status(401)
      .json({ message: "Not authenticated. Please log in." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_change_in_production",
    );

    // Resolve authorization from the database so role changes and deleted
    // accounts take effect immediately instead of waiting for the JWT to expire.
    const user = await User.findById(decoded.userId)
      .select("email role isActive")
      .lean();

    if (!user) {
      return res.status(401).json({
        message: "This account no longer exists. Please log in again.",
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        message: "This account has been deactivated. Please contact an administrator.",
      });
    }

    req.userId = user._id.toString();
    req.userRole = user.role;
    req.userEmail = user.email;

    next();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Auth failed - invalid token:", {
        path: req.path,
        error: error.message,
      });
    }
    return res
      .status(401)
      .json({ message: "Invalid or expired token. Please log in again." });
  }
};

module.exports = verifyToken;
