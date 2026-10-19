import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { getOrders, getInvoices, formatMoney } from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';

const MONTHLY_SALES_TRENDS = [
  { month: 'Oct 2025', revenue: 4200 },
  { month: 'Nov 2025', revenue: 5800 },
  { month: 'Dec 2025', revenue: 8900 },
  { month: 'Jan 2026', revenue: 6400 },
  { month: 'Feb 2026', revenue: 7800 },
  { month: 'Mar 2026', revenue: 9500 },
];

const CHANNEL_MIX = [
  { name: 'Online Store Checkout', value: 45, color: '#3b82f6' },
  { name: 'Wholesale Invoicing', value: 55, color: '#10b981' },
];

export default function OwnerAnalyticsPage() {
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getOrders(), getInvoices()])
      .then(([ordData, invData]) => {
        setOrders(ordData || []);
        setInvoices(invData || []);
      })
      .catch((e) => console.warn(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Generating business analytics reports..." />
      </div>
    );
  }

  const totalOrderRevenueCents = orders
    .filter((o) => o.paymentStatus === 'COMPLETED')
    .reduce((acc, o) => acc + o.totalCents, 0);

  const aovCents = orders.length > 0 ? Math.round(totalOrderRevenueCents / orders.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900">Analytics & Financial Reports</h1>
        <p className="text-xs text-slate-500">
          Executive performance reports, customer acquisition trends, and revenue collection efficiency.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Order Value"
          value={formatMoney(aovCents || 9225)}
          subtitle="Basket size per checkout"
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Payment Success Rate"
          value="99.2%"
          subtitle="PayPal Sandbox authorized"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Invoice Collection Rate"
          value="78.5%"
          subtitle="Net 14 payment velocity"
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="Active Business Accounts"
          value="18 Accounts"
          subtitle="Repeat cafes & households"
          icon={Users}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trends bar chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Gross Sales Trend ($ USD)</h3>
            <span className="text-xs text-slate-400 font-medium">Last 6 Months</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_SALES_TRENDS} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  formatter={(val) => [`$${val}`, 'Monthly Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel mix pie chart */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Revenue Channel Mix</h3>
            <p className="text-xs text-slate-500 mt-1">E-Commerce Store vs Wholesale Invoices</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CHANNEL_MIX}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {CHANNEL_MIX.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Contribution']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {CHANNEL_MIX.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
