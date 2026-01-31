// src/components/Reports/ReportTable.jsx
import React from "react";
import { Download, FileText } from "lucide-react";

const ReportTable = ({
    title,
    icon: Icon,
    columns,
    data,
    onExport,
    loading = false,
    emptyMessage = "No data available"
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-lg border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        {Icon && <Icon className="h-5 w-5 mr-2 text-gray-600" />}
                        {title}
                    </h3>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    {Icon && <Icon className="h-5 w-5 mr-2 text-gray-600" />}
                    {title}
                </h3>
                {onExport && data.length > 0 && (
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                )}
            </div>

            {/* Table */}
            {data.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                {columns.map((column, index) => (
                                    <th
                                        key={index}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                                    {columns.map((column, colIndex) => (
                                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {column.render
                                                ? column.render(row[column.key], row)
                                                : row[column.key] || "—"
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">{emptyMessage}</p>
                </div>
            )}
        </div>
    );
};

export default ReportTable;
