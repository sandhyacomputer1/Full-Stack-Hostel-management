const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const path = require("path");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ FIXED: Better folder organization with dynamic paths
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // ✅ FIXED: Organize files by type in Cloudinary
    let folder = "hostel-management/misc";

    if (file.fieldname === "profilePhoto") {
      folder = "hostel-management/employees/profiles";
    } else if (["aadhar", "pan", "resume", "other"].includes(file.fieldname)) {
      folder = "hostel-management/employees/documents";
    } else if (file.fieldname === "photo") {
      folder = "hostel-management/students/profiles";
    } else if (
      ["aadharCard", "addressProof", "idCard"].includes(file.fieldname)
    ) {
      folder = "hostel-management/students/documents";
    } else if (file.fieldname === "expenseReceipts") {
      folder = "hostel-management/expenses";
    } else if (file.fieldname === "profileImage") {
      folder = "hostel-management/users";
    } else if (file.fieldname === "paymentProof") {
      folder = "hostel-management/salary-proofs";
    }

    // ✅ FIXED: Better filename generation
    const timestamp = Date.now();
    const sanitizedName = path
      .parse(file.originalname)
      .name.replace(/[^a-zA-Z0-9]/g, "_");
    const randomStr = Math.random().toString(36).substring(2, 8);

    return {
      folder: folder,
      resource_type: "auto",
      public_id: `${file.fieldname}_${sanitizedName}_${timestamp}_${randomStr}`,
      // ✅ FIXED: Only apply transformation to images
      transformation: file.mimetype.startsWith("image/")
        ? [
            {
              width: 1000,
              height: 1000,
              crop: "limit",
              quality: "auto:good",
              fetch_format: "auto", // Auto-deliver best format (WebP when supported)
            },
          ]
        : undefined,
    };
  },
});

// ✅ FIXED: More comprehensive file type validation
const fileFilter = (req, file, cb) => {
  console.log(
    `📎 Validating file: ${file.fieldname} - ${file.originalname} (${file.mimetype})`
  );

  const allowedTypes = {
    "image/jpeg": true,
    "image/jpg": true,
    "image/png": true,
    "image/webp": true,
    "application/pdf": true,
    "application/msword": true,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  };

  // ✅ FIXED: Check both mimetype and extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
    ".doc",
    ".docx",
  ];

  if (allowedTypes[file.mimetype] && allowedExtensions.includes(ext)) {
    console.log(`✅ File validation passed: ${file.fieldname}`);
    cb(null, true);
  } else {
    console.log(`❌ File validation failed: ${file.fieldname}`);
    cb(
      new Error(
        `Invalid file type for ${file.fieldname}. Only JPEG, PNG, WEBP, PDF, DOC, and DOCX files are allowed.`
      ),
      false
    );
  }
};

// ✅ FIXED: Increased file size limit to 10MB for documents
const uploadToCloudinary = multer({
  storage: cloudinaryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // Max 10 files per request
  },
});

const upload = uploadToCloudinary;

// ✅ Upload configurations remain the same (already correct!)
const uploadConfigs = {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),

  // Multiple files with different field names
  fields: (fields) => upload.fields(fields),

  // Multiple files with same field name
  array: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),

  // Student documents upload
  studentDocuments: upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },
    {
      name: "aadharCard",
      maxCount: 1,
    },
    {
      name: "addressProof",
      maxCount: 1,
    },
    {
      name: "idCard",
      maxCount: 1,
    },
  ]),

  // ✅ Employee documents upload (already correct!)
  employeeDocuments: upload.fields([
    {
      name: "profilePhoto",
      maxCount: 1,
    },
    {
      name: "aadhar",
      maxCount: 1,
    },
    {
      name: "pan",
      maxCount: 1,
    },
    {
      name: "resume",
      maxCount: 1,
    },
    {
      name: "other",
      maxCount: 3,
    },
  ]),

  // Expense Receipts uploads
  expenseReceipts: upload.array("expenseReceipts", 5),

  // Profile Image upload
  profileImage: upload.single("profileImage"),
};

// ✅ FIXED: Enhanced error handling middleware
const handleUploadError = (error, req, res, next) => {
  console.error("❌ Upload Error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB per file.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded. Maximum allowed exceeded.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: `Unexpected file field: ${error.field}. Please check the field names.`,
      });
    }
    // Generic multer error
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }

  // File validation errors
  if (error.message && error.message.includes("Invalid file type")) {
    return res.status(400).json({ success: false, message: error.message });
  }

  // Cloudinary errors
  if (error.message && error.message.includes("cloudinary")) {
    return res.status(500).json({
      success: false,
      message: "Cloud storage error. Please try again.",
    });
  }

  // Pass to next error handler if not handled
  next(error);
};

// ✅ FIXED: Enhanced delete function with error handling
const deleteFromCloudinary = async (publicId) => {
  try {
    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      console.log(`✅ Successfully deleted: ${publicId}`);
    } else {
      console.log(`⚠️ Delete result: ${result.result} for ${publicId}`);
    }

    return result;
  } catch (error) {
    console.error("❌ Error deleting from Cloudinary:", error);
    throw error;
  }
};

// ✅ FIXED: Extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  try {
    // Extract public_id from Cloudinary URL
    // Example: https://res.cloudinary.com/xxx/image/upload/v123456/folder/filename.jpg
    const matches = url.match(/\/([^\/]+)\.(jpg|jpeg|png|webp|pdf|doc|docx)$/i);
    if (matches) {
      return matches[1];
    }
    return null;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

// Helper function to get file URL (already correct)
const getFileUrl = (file) => {
  return file.path; // Cloudinary URL
};

// ✅ ADDED: Bulk delete function
const deleteManyFromCloudinary = async (publicIds) => {
  try {
    console.log(`🗑️ Bulk deleting ${publicIds.length} files from Cloudinary`);
    const result = await cloudinary.api.delete_resources(publicIds);
    console.log(`✅ Bulk delete completed`);
    return result;
  } catch (error) {
    console.error("❌ Error bulk deleting from Cloudinary:", error);
    throw error;
  }
};

module.exports = {
  upload,
  uploadConfigs,
  handleUploadError,
  deleteFromCloudinary,
  getFileUrl,
  cloudinary,
  getPublicIdFromUrl, // ✅ ADDED
  deleteManyFromCloudinary, // ✅ ADDED
};
