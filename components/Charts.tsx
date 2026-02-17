
import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line 
} from 'recharts';
import { BusinessFormData, Language } from '../types';
import { translations } from '../translations';

interface ChartsProps {
  data: BusinessFormData;
  lang: Language;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const BusinessCharts: React.FC<ChartsProps> = ({ data, lang }) => {
  const t = translations[lang];

  // Startup Cost Data
  const startupData = data.startupCosts.map(item => ({
    name: item.name,
    value: item.amount
  }));

  // Monthly Expense Data
  const totalFixed = data.fixedCosts.reduce((acc, i) => acc + i.amount, 0);
  const totalVar = data.variableCosts.reduce((acc, i) => acc + i.amount, 0);
  const monthlyExpenseData = [
    { name: t.chart_fixed, amount: totalFixed },
    { name: t.chart_var, amount: totalVar }
  ];

  // 12-Month Projection
  const monthlyRevenueGoal = data.revenueGoal / 12;
  const totalMonthlyCost = totalFixed + totalVar;
  const projectionData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const cumulativeRev = monthlyRevenueGoal * month;
    const cumulativeProfit = (monthlyRevenueGoal - totalMonthlyCost) * month;
    return {
      month: `${t.chart_month} ${month}`,
      revenue: Math.round(cumulativeRev),
      profit: Math.round(cumulativeProfit)
    };
  });

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 text-center">{t.chart_startup_title}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={startupData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {startupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 text-center">{t.chart_monthly_title}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpenseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold mb-6 text-center">{t.chart_projection_title}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name={t.chart_rev} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" stroke="#10b981" name={t.chart_profit} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BusinessCharts;
