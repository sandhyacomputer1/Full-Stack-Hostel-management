// src/components/Reports/ExportButton.jsx
import React, { useState } from "react";
import { Download, FileText, Table } from "lucide-react";
import toast from "react-hot-toast";

const ExportButton = ({
    onExport,
    formats = ["csv", "pdf"],
    label = "Export",
    disabled = false,
    size = "md"
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const sizeClasses = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    const handleExport = async (format) => {
        try {
            setIsExporting(true);
            setShowMenu(false);
            toast.loading(`Exporting as ${format.toUpperCase()}...`);

            await onExport(format);

            toast.dismiss();
            toast.success(`Exported successfully!`);
        } catch (error) {
            console.error("Export error:", error);
            toast.dismiss();
            toast.error("Export failed");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={disabled || isExporting}
                className={`flex items-center gap-2 ${sizeClasses[size]} bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
                {isExporting ? "Exporting..." : label}
            </button>

            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        {formats.includes("csv") && (
                            <button
                                onClick={() => handleExport("csv")}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors"
                            >
                                <Table className="h-4 w-4 text-green-600" />
                                <span>Export as CSV</span>
                            </button>
                        )}
                        {formats.includes("pdf") && (
                            <button
                                onClick={() => handleExport("pdf")}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-t transition-colors"
                            >
                                <FileText className="h-4 w-4 text-red-600" />
                                <span>Export as PDF</span>
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ExportButton;
