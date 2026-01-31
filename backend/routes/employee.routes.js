const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const Employee = require("../models/employee.model");
const User = require("../models/user.model");
const Hostel = require("../models/hostel.model");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");
const { uploadConfigs, handleUploadError } = require("../middlewares/upload");

// ✅ IMPROVED: Middleware to parse AND sanitize JSON strings in FormData
const parseFormDataJSON = (req, res, next) => {
  if (
    req.body.emergencyContact &&
    typeof req.body.emergencyContact === "string"
  ) {
    try {
      const parsed = JSON.parse(req.body.emergencyContact);

      // ✅ Sanitize nested values (trim whitespace)
      req.body.emergencyContact = {
        name: parsed.name?.trim() || "",
        phone: parsed.phone?.trim() || "",
        relation: parsed.relation?.trim() || "",
      };

      console.log(
        "✅ Parsed and sanitized emergencyContact:",
        req.body.emergencyContact
      );
    } catch (e) {
      console.error("❌ Failed to parse emergencyContact:", e);
      return res
        .status(400)
        .json({ success: false, message: "Invalid emergencyContact format" });
    }
  }
  next();
};

// @route   POST /api/employees
// @desc    Add a new employee (and optionally create login)
// @access  Admin/Manager
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  uploadConfigs.employeeDocuments,
  parseFormDataJSON,
  [
    // ✅ Step 3: Validation
    check("fullName", "Full name is required").notEmpty().trim(),
    check("phone", "Valid 10-digit Indian phone number is required")
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Phone must start with 6-9 and be exactly 10 digits"),
    check("role", "Valid role is required")
      .isIn([
        "watchman",
        "mess_staff",
        "cleaner",
        "warden",
        "manager",
        "mess_manager",
      ])
      .withMessage("Invalid role selected"),
    check("department", "Department is required").notEmpty().trim(),
    check("salary", "Valid salary amount is required")
      .isNumeric()
      .withMessage("Salary must be a number")
      .custom((value) => value >= 0)
      .withMessage("Salary cannot be negative"),
    check("address", "Address is required").notEmpty().trim(),
    check(
      "emergencyContact.name",
      "Emergency contact name is required"
    ).notEmpty(),
    check("emergencyContact.phone", "Emergency contact phone is required")
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Emergency contact phone must be valid 10-digit number"),
    check(
      "emergencyContact.relation",
      "Emergency contact relation is required"
    ).notEmpty(),
    check("email")
      .optional()
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    check("createLogin").optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation errors:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((err) => ({
          field: err.path || err.param,
          message: err.msg,
        })),
      });
    }

    const session = await Employee.startSession();
    session.startTransaction();

    try {
      const hostelId =
        req.body.hostelId ||
        req.user.assignedHostel?._id ||
        req.user.assignedHostel._id;

      if (!hostelId) {
        throw new Error(
          "Hostel assignment missing. Please contact administrator."
        );
      }

      console.log("📝 Creating employee for hostel:", hostelId);
      console.log("📥 Received data:", {
        fullName: req.body.fullName,
        role: req.body.role,
        phone: req.body.phone,
        emergencyContact: req.body.emergencyContact,
      });

      // Check for duplicates
      const existingEmployee = await Employee.findOne({
        phone: req.body.phone,
        assignedHostel: hostelId,
        status: "ACTIVE",
      });

      if (existingEmployee) {
        throw new Error(
          `Active employee with phone ${req.body.phone} already exists in this hostel`
        );
      }

      // Check if email already used for login
      if (req.body.createLogin && req.body.email) {
        const existingUser = await User.findOne({
          email: req.body.email,
          assignedHostel: hostelId,
        });
        if (existingUser) {
          throw new Error(
            `Email ${req.body.email} is already registered for another user`
          );
        }
      }

      // Create Employee Record
      const employeeData = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        email: req.body.email,
        gender: req.body.gender,
        role: req.body.role,
        department: req.body.department,
        salary: Number(req.body.salary),
        shift: req.body.shift || "GENERAL",
        employmentType: req.body.employmentType || "FULL_TIME",
        address: req.body.address,
        emergencyContact: req.body.emergencyContact,
        status: req.body.status || "ACTIVE",
        joiningDate: req.body.joiningDate,
        notes: req.body.notes,
        assignedHostel: hostelId,
        createdBy: req.user._id,
      };

      // Generate employee code
      const employeeCode = await Employee.generateEmployeeCode();
      console.log("✅ Generated employee code:", employeeCode);

      employeeData.employeeCode = employeeCode;

      const newEmployee = new Employee(employeeData);

      console.log("📝 Saving employee...");
      await newEmployee.save({ session });

      console.log("✅ Employee saved successfully:", newEmployee.employeeCode);

      // Handle file uploads
      if (req.files) {
        if (req.files.profilePhoto && req.files.profilePhoto[0]) {
          newEmployee.profilePhoto = {
            url: req.files.profilePhoto[0].path,
            uploadedAt: new Date(),
          };
          console.log("✅ Profile photo uploaded");
        }

        // Handle other documents
        const docTypes = ["aadhar", "pan", "resume", "other"];
        docTypes.forEach((type) => {
          if (req.files[type] && req.files[type].length > 0) {
            if (!newEmployee.documents) newEmployee.documents = [];

            req.files[type].forEach((file) => {
              newEmployee.documents.push({
                type: type,
                fileUrl: file.path,
                verified: false,
                uploadedAt: new Date(),
              });
            });
            console.log(`✅ ${type} document(s) uploaded`);
          }
        });

        await newEmployee.save({ session });
      }

      // Auto-Create User Account for Loggable Roles
      const LOGIN_ROLES = ["manager", "warden", "watchman", "mess_manager"];
      let linkedUser = null;

      const createLoginFlag =
        req.body.createLogin === "true" || req.body.createLogin === true;

      if (LOGIN_ROLES.includes(employeeData.role) && createLoginFlag) {
        if (!req.body.email) {
          throw new Error("Email is required when creating login access");
        }

        if (!req.body.password) {
          throw new Error("Password is required when creating login access");
        }

        console.log("🔐 Creating user account for:", req.body.email);

        const userData = {
          name: employeeData.fullName,
          email: req.body.email,
          phone: employeeData.phone,
          password: req.body.password,
          role: employeeData.role,
          assignedHostel: hostelId,
          employeeId: newEmployee.employeeCode,
          department: employeeData.department,
          isActive: true,
        };

        const newUser = new User(userData);
        await newUser.save({ session });

        newEmployee.userId = newUser._id;
        await newEmployee.save({ session });

        linkedUser = newUser;
        console.log("✅ User account created and linked");
      }

      await session.commitTransaction();
      console.log("✅ Transaction committed successfully");

      res.status(201).json({
        success: true,
        message: linkedUser
          ? "Employee and login account created successfully"
          : "Employee added successfully",
        employee: newEmployee,
        loginCreated: !!linkedUser,
        userEmail: linkedUser?.email || null,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("❌ Add Employee Error:", error);

      let statusCode = 500;
      let errorMessage = error.message || "Failed to create employee";

      if (error.name === "ValidationError") {
        statusCode = 400;
        errorMessage = Object.values(error.errors)
          .map((e) => e.message)
          .join(", ");
      }

      if (error.code === 11000) {
        statusCode = 400;
        const field = Object.keys(error.keyPattern)[0];
        errorMessage = `An employee with this ${field} already exists`;
      }

      res.status(statusCode).json({ success: false, message: errorMessage });
    } finally {
      session.endSession();
    }
  }
);

// @route   GET /api/employees/hostel-info
// @desc    Get hostel information for payment receipt
// @access  Admin/Manager/Warden
router.get(
  "/hostel-info",
  authenticateToken,
  async (req, res) => {
    try {
      // Get hostel ID from user assignment
      const hostelId =
        req.user.assignedHostel?._id || req.user.assignedHostel;

      if (!hostelId) {
        return res
          .status(400)
          .json({ success: false, message: "Hostel assignment missing" });
      }

      // Find hostel details
      const hostel = await Hostel.findById(hostelId)
        .populate("ownerId", "name email")
        .select("name address ownerName ownerMobile phone email");

      if (!hostel) {
        return res
          .status(404)
          .json({ success: false, message: "Hostel not found" });
      }

      console.log("🏠 Hostel info fetched:", hostel);

      res.status(200).json({
        success: true,
        data: {
          name: hostel.name,
          address: hostel.address,
          ownerName: hostel.ownerId?.name || "Hostel Owner",
          ownerMobile: hostel.ownerId?.phone || hostel.ownerMobile || "N/A",
          ownerEmail: hostel.ownerId?.email || "N/A"
        }
      });

    } catch (error) {
      console.error("Error fetching hostel info:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching hostel information"
      });
    }
  }
);

// @route   GET /api/employees
// @desc    Get all employees for a hostel
// @access  Admin/Manager/Warden
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { role, status, search } = req.query;
    // ✅ FIXED: Handle both populated and non-populated hostel
    const hostelId =
      req.user.assignedHostel?._id || req.user.assignedHostel._id;

    if (!hostelId) {
      return res
        .status(400)
        .json({ success: false, message: "Hostel assignment missing" });
    }

    console.log("🔍 Fetching employees for hostel:", hostelId);

    let query = {
      assignedHostel: hostelId,
    };

    if (role) query.role = role;

    if (status) query.status = status;

    if (search) {
      query.$or = [
        {
          fullName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          employeeCode: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "email lastLogin isActive")
      .populate("createdBy", "name email")
      .lean();

    console.log(`✅ Found ${employees.length} employees`);

    res.json({ success: true, count: employees.length, employees: employees });
  } catch (error) {
    console.error("❌ Fetch Employees Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch employees",
    });
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee by ID
// @access  Admin/Manager/Warden
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      // ✅ FIXED
      const hostelId =
        req.user.assignedHostel?._id || req.user.assignedHostel._id;
      const employee = await Employee.findOne({
        _id: req.params.id,
        assignedHostel: hostelId,
      })
        .populate("userId", "email lastLogin isActive")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean();

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      console.log("✅ Employee details fetched:", employee.employeeCode);

      res.json({ success: true, employee: employee });
    } catch (error) {
      console.error("❌ Fetch Single Employee Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch employee details",
      });
    }
  }
);

// @route   PUT /api/employees/:id
// @desc    Update employee details (and optionally update/create/remove login)
// @access  Admin/Manager
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  uploadConfigs.employeeDocuments,
  parseFormDataJSON,
  [
    check("fullName").optional().notEmpty().trim(),
    check("phone")
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Phone must start with 6-9 and be exactly 10 digits"),
    check("role")
      .optional()
      .isIn([
        "watchman",
        "mess_staff",
        "cleaner",
        "warden",
        "manager",
        "mess_manager",
      ])
      .withMessage("Invalid role selected"),
    check("department").optional().notEmpty().trim(),
    check("salary")
      .optional()
      .isNumeric()
      .custom((value) => value >= 0)
      .withMessage("Salary cannot be negative"),
    check("address").optional().notEmpty().trim(),
    check("emergencyContact.name").optional().notEmpty(),
    check("emergencyContact.phone")
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Emergency contact phone must be valid 10-digit number"),
    check("emergencyContact.relation").optional().notEmpty(),
    check("email")
      .optional()
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    check("updateLogin").optional(),
    check("removeLogin").optional(), // ✅ NEW
    check("password").optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation errors:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((err) => ({
          field: err.path || err.param,
          message: err.msg,
        })),
      });
    }

    const session = await Employee.startSession();
    session.startTransaction();

    try {
      const hostelId =
        req.user.assignedHostel?._id || req.user.assignedHostel._id;

      if (!hostelId) {
        throw new Error(
          "Hostel assignment missing. Please contact administrator."
        );
      }

      const employee = await Employee.findOne({
        _id: req.params.id,
        assignedHostel: hostelId,
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      console.log("📝 Updating employee:", employee.employeeCode);
      console.log("📥 Request body:", req.body);

      // Phone duplicate check (excluding current employee)
      if (req.body.phone && req.body.phone !== employee.phone) {
        const existingEmployee = await Employee.findOne({
          phone: req.body.phone,
          assignedHostel: hostelId,
          status: "ACTIVE",
          _id: { $ne: req.params.id },
        });

        if (existingEmployee) {
          throw new Error(
            `Active employee with phone ${req.body.phone} already exists`
          );
        }
      }

      // Build updates safely
      const updates = { ...req.body };
      delete updates.employeeCode;
      delete updates.createdBy;
      delete updates.assignedHostel;
      delete updates.userId;
      delete updates._id;
      updates.updatedBy = req.user._id;

      // Handle file uploads (profile + docs)
      if (req.files) {
        if (req.files.profilePhoto && req.files.profilePhoto[0]) {
          updates.profilePhoto = {
            url: req.files.profilePhoto[0].path,
            uploadedAt: new Date(),
          };
          console.log("✅ Profile photo updated");
        }

        const docTypes = ["aadhar", "pan", "resume", "other"];

        if (docTypes.some((type) => req.files[type])) {
          updates.documents = updates.documents || employee.documents || [];

          docTypes.forEach((type) => {
            if (req.files[type] && req.files[type].length > 0) {
              req.files[type].forEach((file) => {
                updates.documents.push({
                  type,
                  fileUrl: file.path,
                  verified: false,
                  uploadedAt: new Date(),
                });
              });
              console.log(`✅ ${type} document(s) added`);
            }
          });
        }
      }

      const updatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true, session }
      ).session(session);

      console.log("✅ Employee updated:", updatedEmployee.employeeCode);

      // ===== LOGIN HANDLING (CREATE / UPDATE / REMOVE / NO-TOUCH) =====
      const LOGIN_ROLES = ["manager", "warden", "watchman", "mess_manager"];

      const updateLoginFlag =
        req.body.updateLogin === "true" || req.body.updateLogin === true;
      const removeLoginFlag =
        req.body.removeLogin === "true" || req.body.removeLogin === true;

      let linkedUser = null;

      // 1) REMOVE LOGIN ACCESS (delete user + unlink)
      if (removeLoginFlag && employee.userId) {
        await User.findByIdAndDelete(employee.userId, { session });
        updatedEmployee.userId = undefined;
        await updatedEmployee.save({ session });
        console.log("🗑️ Login access removed and user deleted");
      }

      // 2) CREATE / UPDATE LOGIN (only for allowed roles)
      if (LOGIN_ROLES.includes(updatedEmployee.role) && updateLoginFlag) {
        if (!updatedEmployee.userId) {
          // CREATE new login
          if (!req.body.email || !req.body.password) {
            throw new Error(
              "Email and password required to create login access"
            );
          }

          const existingUser = await User.findOne({
            email: req.body.email,
            assignedHostel: hostelId,
          });

          if (existingUser) {
            throw new Error(`Email ${req.body.email} already registered`);
          }

          const userData = {
            name: updatedEmployee.fullName,
            email: req.body.email,
            phone: updatedEmployee.phone,
            password: req.body.password,
            role: updatedEmployee.role,
            assignedHostel: hostelId,
            employeeId: updatedEmployee.employeeCode,
            department: updatedEmployee.department,
            isActive: true,
          };

          linkedUser = new User(userData);
          await linkedUser.save({ session });

          updatedEmployee.userId = linkedUser._id;
          await updatedEmployee.save({ session });

          console.log("✅ New user account created and linked");
        } else {
          // UPDATE existing login
          const user = await User.findById(updatedEmployee.userId);
          if (user) {
            const userUpdates = {};
            if (updates.fullName) userUpdates.name = updates.fullName;
            if (updates.phone) userUpdates.phone = updates.phone;
            if (updates.email) userUpdates.email = updates.email;
            if (req.body.password) userUpdates.password = req.body.password;

            if (Object.keys(userUpdates).length > 0) {
              await User.findByIdAndUpdate(
                updatedEmployee.userId,
                userUpdates,
                { session }
              );
              console.log("✅ Existing user account updated");
            }
            linkedUser = user;
          }
        }
      }

      await session.commitTransaction();
      console.log("✅ Transaction committed");

      res.json({
        success: true,
        message:
          updateLoginFlag || removeLoginFlag
            ? "Employee and login access updated successfully"
            : "Employee updated successfully",
        employee: updatedEmployee,
        loginUpdated: !!linkedUser || removeLoginFlag,
        userEmail: linkedUser?.email || null,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("❌ Update Employee Error:", error);

      let statusCode = 500;
      let errorMessage = error.message || "Failed to update employee";

      if (error.name === "ValidationError") {
        statusCode = 400;
        errorMessage = Object.values(error.errors)
          .map((e) => e.message)
          .join(", ");
      }

      if (error.code === 11000) {
        statusCode = 400;
        const field = Object.keys(error.keyPattern)[0];
        errorMessage = `${field} already exists`;
      }

      res.status(statusCode).json({ success: false, message: errorMessage });
    } finally {
      session.endSession();
    }
  }
);


// @route   DELETE /api/employees/:id (Soft Delete)
// @desc    Deactivate employee (and associated login)
// @access  Admin/Manager
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    const session = await Employee.startSession();
    session.startTransaction();

    try {
      // ✅ FIXED
      const hostelId = req.user.assignedHostel?._id || req.user.assignedHostel;
      const employee = await Employee.findOne({
        _id: req.params.id,
        assignedHostel: hostelId,
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      console.log("🗑️ Deactivating employee:", employee.employeeCode);

      employee.status = "INACTIVE";
      employee.updatedBy = req.user._id;
      await employee.save({ session });

      if (employee.userId) {
        await User.findByIdAndUpdate(
          employee.userId,
          {
            isActive: false,
          },
          { session }
        );
        console.log("✅ User account deactivated");
      }

      await session.commitTransaction();
      console.log("✅ Employee deactivated successfully");

      res.json({
        success: true,
        message: "Employee deactivated and login access suspended",
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("❌ Delete Employee Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to deactivate employee",
      });
    } finally {
      session.endSession();
    }
  }
);

// @route   POST /api/employees/:id/pay-salary
// @desc    Record salary payment as an expense
// @access  Admin/Manager
router.post(
  "/:id/pay-salary",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  [
    check("amount", "Valid amount is required")
      .isNumeric()
      .custom((val) => val > 0),
    check("paymentMode", "Payment mode is required")
      .isIn(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"])
      .withMessage("Invalid payment mode"),
    check("month", "Salary month is required (format: YYYY-MM)").matches(
      /^\d{4}-(0[1-9]|1[0-2])$/
    ),
  ],
  async (req, res) => {
    const session = await Employee.startSession();
    session.startTransaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // ✅ FIXED
      const hostelId =
        req.user.assignedHostel?._id || req.user.assignedHostel._id;
      const employee = await Employee.findOne({
        _id: req.params.id,
        assignedHostel: hostelId,
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      const { amount, paymentMode, month, remarks, transactionId } = req.body;
      const Expense = require("../models/expense.model");

      console.log(
        `💰 Recording salary payment for ${employee.fullName} - ${month}`
      );

      const existingSalaryPayment = await Expense.findOne({
        category: "salary",
        tags: {
          $all: [employee.employeeCode, month],
        },
        assignedHostel: hostelId, // ✅ FIXED
        status: "active",
      });

      if (existingSalaryPayment) {
        throw new Error(
          `Salary for ${month} already recorded for this employee`
        );
      }

      const expenseData = {
        type: "hostel_expense",
        category: "salary",
        amount: parseFloat(amount),
        description: `Salary - ${employee.fullName} (${employee.employeeCode}) - ${month}`,
        date: new Date(),
        paymentMode,
        transactionId,
        vendor: {
          name: employee.fullName,
          contact: employee.phone,
          address: employee.address || "Hostel Staff",
        },
        recordedBy: req.user._id,
        assignedHostel: hostelId, // ✅ FIXED
        remarks: remarks || `Salary payment for ${month}`,
        tags: ["salary", employee.employeeCode, month, employee.role],
        status: "active",
      };

      const newExpense = new Expense(expenseData);
      await newExpense.save({ session });

      await session.commitTransaction();
      console.log("✅ Salary payment recorded");

      res
        .status(201)
        .json({
          success: true,
          message: `Salary for ${month} recorded successfully`,
          expenseId: newExpense._id,
          amount: amount,
        });
    } catch (error) {
      await session.abortTransaction();
      console.error("❌ Pay Salary Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to record salary payment",
      });
    } finally {
      session.endSession();
    }
  }
);

// @route   POST /api/employees/:id/documents
// @desc    Upload documents for an employee
// @access  Admin/Manager
router.post(
  "/:id/documents",
  authenticateToken,
  authorizeRoles("admin", "manager"),
  uploadConfigs.employeeDocuments,
  handleUploadError,
  async (req, res) => {
    try {
      // ✅ FIXED
      const hostelId =
        req.user.assignedHostel?._id || req.user.assignedHostel._id;
      const employee = await Employee.findOne({
        _id: req.params.id,
        assignedHostel: hostelId,
      });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      console.log("📎 Uploading documents for:", employee.employeeCode);
      console.log("📁 Files received:", Object.keys(req.files));

      const allowedFields = [
        "profilePhoto",
        "aadhar",
        "pan",
        "resume",
        "other",
      ];
      let uploadCount = 0;

      allowedFields.forEach((field) => {
        if (req.files[field] && req.files[field].length > 0) {
          const files = req.files[field];

          if (field === "profilePhoto") {
            employee.profilePhoto = {
              url: files[0].path,
              uploadedAt: new Date(),
            };
            uploadCount++;
            console.log(`✅ Profile photo uploaded: ${files[0].filename}`);
          } else if (field === "other") {
            if (!employee.documents) employee.documents = [];

            files.forEach((file) => {
              employee.documents.push({
                type: "other",
                fileUrl: file.path,
                verified: false,
                uploadedAt: new Date(),
              });
              uploadCount++;
            });
            console.log(`✅ ${files.length} other document(s) uploaded`);
          } else {
            if (!employee.documents) employee.documents = [];

            const existingIndex = employee.documents.findIndex(
              (doc) => doc.type === field
            );
            if (existingIndex !== -1) {
              employee.documents[existingIndex] = {
                type: field,
                fileUrl: files[0].path,
                verified: false,
                uploadedAt: new Date(),
              };
              console.log(`✅ ${field} updated`);
            } else {
              employee.documents.push({
                type: field,
                fileUrl: files[0].path,
                verified: false,
                uploadedAt: new Date(),
              });
              console.log(`✅ ${field} uploaded`);
            }
            uploadCount++;
          }
        }
      });

      if (uploadCount === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No valid files uploaded" });
      }

      await employee.save();
      console.log(`✅ ${uploadCount} document(s) saved successfully`);

      res.json({
        success: true,
        message: `${uploadCount} document(s) uploaded successfully`,
        uploadedCount: uploadCount,
        employee: employee,
      });
    } catch (error) {
      console.error("❌ Employee Document Upload Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload documents",
      });
    }
  }
);

module.exports = router;
