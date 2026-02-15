const verifyAdmin = (req, res, next) => {
  // First check if user is authenticated (should be used after verifyToken middleware)
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Check if user has admin role
  if (req.userRole !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
};

module.exports = verifyAdmin;
