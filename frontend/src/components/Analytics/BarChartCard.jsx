// src/components/Analytics/BarChartCard.jsx
import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

const BarChartCard = ({ title, data, dataKeys, colors, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                        }}
                    />
                    <Legend />
                    {dataKeys.map((key, index) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            fill={colors[index]}
                            radius={[8, 8, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BarChartCard;
