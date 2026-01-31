// src/components/Analytics/PieChartCard.jsx
import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

const PieChartCard = ({ title, data, colors, height = 300 }) => {
    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
            <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({
                            cx,
                            cy,
                            midAngle,
                            innerRadius,
                            outerRadius,
                            percent,
                        }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

                            return (
                                <text
                                    x={x}
                                    y={y}
                                    fill="white"
                                    textAnchor={x > cx ? "start" : "end"}
                                    dominantBaseline="central"
                                    className="text-sm font-bold"
                                >
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                        outerRadius={100}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PieChartCard;
