import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList,
} from "recharts";

const translations = {
    en: {
        title: "Global Government Bitcoin Holdings (2025)",
        subtitle: "Top two nations hold over 66% of tracked government holdings",
        countries: {
            "United States": "United States",
            China: "China",
            "United Kingdom": "United Kingdom",
            Ukraine: "Ukraine",
            Bhutan: "Bhutan",
            UAE: "UAE",
            "El Salvador": "El Salvador",
        },
        tooltip: "Holdings",
    },
    zh: {
        title: "全球政府比特幣持有量 (2025)",
        subtitle: "前兩大持異國佔所有追蹤政府持有量的 66% 以上",
        countries: {
            "United States": "美國",
            China: "中國",
            "United Kingdom": "英國",
            Ukraine: "烏克蘭",
            Bhutan: "不丹",
            UAE: "阿聯酋",
            "El Salvador": "薩爾瓦多",
        },
        tooltip: "持有量",
    },
};

const rawData = [
    { id: "United States", value: 207189 },
    { id: "China", value: 190000 },
    { id: "United Kingdom", value: 61245 },
    { id: "Ukraine", value: 46351 },
    { id: "Bhutan", value: 13029 },
    { id: "UAE", value: 6333 },
    { id: "El Salvador", value: 6105 },
];

export default function BitcoinHoldingsChart({ lang = "en" }: { lang?: "en" | "zh" }) {
    const [isMounted, setIsMounted] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const t = translations[lang];

    const data = rawData.map(item => ({
        ...item,
        name: t.countries[item.id as keyof typeof t.countries]
    }));

    useEffect(() => {
        setIsMounted(true);
        // Initial check
        if (document.documentElement.classList.contains("dark")) {
            setIsDark(true);
        }

        // Observer for class changes on html element (Astro usually toggles 'dark' class)
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

    const barColor = isDark ? "#22d3ee" : "#0891b2"; // cyan-400 : cyan-600
    const textColor = isDark ? "#e5e7eb" : "#374151"; // gray-200 : gray-700
    const axisColor = isDark ? "#9ca3af" : "#4b5563"; // gray-400 : gray-600

    return (
        <div className="w-full h-[400px] my-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-w-0">
            <h3 className="text-center text-lg font-bold mb-1 text-gray-900 dark:text-gray-100">
                {t.title}
            </h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t.subtitle}
            </p>
            {!isMounted ? null : (
            <ResponsiveContainer width="100%" height="90%">
                <BarChart
                    layout="vertical"
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#374151" : "#e5e7eb"} />
                    <XAxis type="number" stroke={axisColor} tickFormatter={(value) => `${value / 1000}k`} />
                    <YAxis type="category" dataKey="name" width={100} stroke={axisColor} fontSize={12} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDark ? "#1f2937" : "#ffffff",
                            borderColor: isDark ? "#374151" : "#e5e7eb",
                            color: textColor,
                        }}
                        formatter={(value) => {
                            const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                            return [`${numericValue.toLocaleString()} BTC`, t.tooltip];
                        }}
                    />
                    <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]}>
                        <LabelList
                            dataKey="value"
                            position="right"
                            formatter={(value) => {
                                const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                                return numericValue.toLocaleString();
                            }}
                            fill={textColor}
                            fontSize={12}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            )}
        </div>
    );
}
