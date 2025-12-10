import React, { useEffect, useState } from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const translations = {
    en: {
        title: "Taiwan's Reserves Composition ($577b)",
        subtitle: "USD holdings represent over 9 in 10 dollars of total reserves",
        assets: {
            "USD Assets": "USD Assets (Bonds, etc.)",
            "Other Assets": "Gold & Other Assets",
        },
        tooltip: "Allocation",
    },
    zh: {
        title: "台灣外匯儲備結構 (5,770 億美元)",
        subtitle: "美元持有量佔總儲備的九成以上",
        assets: {
            "USD Assets": "美元資產 (債券等)",
            "Other Assets": "黃金及其他資產",
        },
        tooltip: "佔比",
    },
};

const rawData = [
    { id: "USD Assets", value: 92 },
    { id: "Other Assets", value: 8 },
];

export default function TaiwanReservesChart({ lang = "en" }: { lang?: "en" | "zh" }) {
    const [isDark, setIsDark] = useState(false);
    const t = translations[lang];

    const data = rawData.map(item => ({
        ...item,
        name: t.assets[item.id as keyof typeof t.assets]
    }));

    useEffect(() => {
        if (document.documentElement.classList.contains("dark")) {
            setIsDark(true);
        }
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "attributes" &&
                    mutation.attributeName === "class"
                ) {
                    setIsDark(document.documentElement.classList.contains("dark"));
                }
            });
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    const COLORS = isDark ? ["#22d3ee", "#ef4444"] : ["#0891b2", "#dc2626"]; // cyan / red
    const textColor = isDark ? "#e5e7eb" : "#374151";

    return (
        <div className="w-full h-[400px] my-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-w-0">
            <h3 className="text-center text-lg font-bold mb-1 text-gray-900 dark:text-gray-100">
                {t.title}
            </h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t.subtitle}
            </p>
            <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string; percent: number }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDark ? "#1f2937" : "#ffffff",
                            borderColor: isDark ? "#374151" : "#e5e7eb",
                            color: textColor,
                        }}
                        formatter={(value: number) => [`${value}%`, t.tooltip]}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
