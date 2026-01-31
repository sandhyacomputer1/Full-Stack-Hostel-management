const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const rateLimit = require("express-rate-limit");

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select("-password")
      .populate("assignedHostel");

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "User account is deactivated" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(500).json({ message: "Token verification failed" });
  }
};

// Check if user has required role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Rate limiting for sensitive operations

const sensitiveOperationLimit = (req, res, next) => {
  const sensitiveOperationLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit to 10 requests per user
    message: {
      message: "Too many attempts. Try again later after 15 min.",
    },
  });

  setTimeout(next, 100);
};

// Check if user is admin only

const authorizeAdmin = authorizeRoles("admin");

// Check if user is admin or manager
const authorizeAdminOrManager = authorizeRoles("admin", "manager");

// Check if user is admin , manager, watchman
const authorizeAdminManagerOrWatchman = authorizeRoles(
  "admin",
  "manager",
  "watchman"
);

// ============================================
// PARENT AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Authenticate parent via JWT token
 * Attaches req.parent = { phone, students: [...] }
 */
const authenticateParent = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify this is a parent token
    if (decoded.role !== "parent") {
      return res.status(403).json({ message: "Invalid token type" });
    }

    // Find parent session
    const ParentSession = require("../models/parentSession.model");
    const session = await ParentSession.findOne({ phone: decoded.phone })
      .populate({
        path: "students",
        select: "name studentId class batch assignedHostel status",
      });

    if (!session) {
      return res.status(401).json({ message: "Session not found" });
    }

    // Attach parent info to request
    req.parent = {
      phone: session.phone,
      students: session.students,
      studentIds: session.students.map((s) => s._id.toString()),
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(500).json({ message: "Token verification failed" });
  }
};

/**
 * Verify parent owns the student in req.params.studentId
 */
const verifyParentOwnsStudent = (req, res, next) => {
  const studentId = req.params.studentId || req.params.id;

  if (!req.parent) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!req.parent.studentIds.includes(studentId)) {
    return res.status(403).json({
      message: "Access denied. You do not have permission to view this student",
    });
  }

  next();
};


module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeAdmin,
  authorizeAdminOrManager,
  authorizeAdminManagerOrWatchman,
  sensitiveOperationLimit,
  authenticateParent,
  verifyParentOwnsStudent,
};
