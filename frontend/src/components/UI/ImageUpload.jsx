import React, { useState, useRef } from "react";
import { X, Eye, Camera, FileText } from "lucide-react";
import toast from "react-hot-toast";

const ImageUpload = ({
  label,
  name,
  value,
  onChange,
  accept = "image/*",
  maxSize = 5, // MB
  required = false,
  type = "image", // "image" or "document"
  preview = true,
  className = "",
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value?.url || null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size should be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    const validTypes = accept.split(",").map((type) => type.trim());
    const isValidType = validTypes.some((validType) => {
      if (validType === "image/*") {
        return file.type.startsWith("image/");
      }
      if (validType === "application/*") {
        return file.type.startsWith("application/");
      }
      return file.type === validType;
    });

    if (!isValidType) {
      toast.error("Invalid file type");
      return;
    }

    // Create preview URL for images
    if (file.type.startsWith("image/") && preview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    // Call onChange with file
    onChange(file);
    toast.success("File selected successfully");
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const viewImage = () => {
    if (previewUrl || value?.url) {
      window.open(previewUrl || value?.url, "_blank");
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="space-y-3">
        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:border-gray-400"
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            name={name}
            accept={accept}
            onChange={handleChange}
            className="hidden"
            required={required}
          />

          <div className="space-y-2">
            {type === "image" ? (
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
            ) : (
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-primary-600">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                {type === "image" ? "PNG, JPG, JPEG" : "PDF, DOC, DOCX"} up to{" "}
                {maxSize}MB
              </p>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        {(previewUrl || value?.url) && (
          <div className="relative">
            {type === "image" && preview ? (
              <div className="relative inline-block">
                <img
                  src={previewUrl || value?.url}
                  alt="Preview"
                  className="h-32 w-32 object-cover rounded-lg border border-gray-200"
                />
                <div className="absolute top-2 right-2 flex space-x-1">
                  <button
                    type="button"
                    onClick={viewImage}
                    className="p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {value?.name || "Document uploaded"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Click view to open in new tab
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={viewImage}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
