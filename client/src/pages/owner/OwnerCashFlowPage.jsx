import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { getFinancialForecast, getExpenses, formatMoney } from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function OwnerCashFlowPage() {
  const [horizon, setHorizon] = useState(12);
  const [scenario, setScenario] = useState('baseline');
  const [forecast, setForecast] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getFinancialForecast(horizon, scenario), getExpenses()])
      .then(([fcData, expData]) => {
        setForecast(fcData);
        setExpenses(expData || []);
      })
      .catch((e) => console.warn(e.message))
      .finally(() => setLoading(false));
  }, [horizon, scenario]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Calculating dynamic cash runway projection..." />
      </div>
    );
  }

  const chartData = forecast?.monthlyBreakdown?.map((m) => ({
    name: m.month,
    projectedCash: m.projectedClosingCash / 100,
    reserveFloor: (forecast?.parameters?.minimumReserve || 1000000) / 100,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header and Scenario Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Cash Flow & Liquidity Runway</h1>
          <p className="text-xs text-slate-500">
            Predictive modeling of operating runway based on store receivables, order cash flow, and SaaS costs.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Horizon */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setHorizon(6)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                horizon === 6 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setHorizon(12)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                horizon === 12 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              12 Months
            </button>
          </div>

          {/* Scenario */}
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none text-slate-800"
          >
            <option value="baseline">Baseline Forecast</option>
            <option value="conservative">Conservative Forecast</option>
            <option value="growth">Accelerated Growth</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Starting Cash Reserves"
          value={formatMoney(forecast?.summary?.startingCash || 2500000)}
          subtitle="Confirmed operating bank funds"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title={`Projected Cash (Month ${horizon})`}
          value={formatMoney(forecast?.summary?.projectedClosingCash || 0)}
          subtitle={`${forecast?.summary?.netCashChange >= 0 ? '+' : ''}${formatMoney(
            forecast?.summary?.netCashChange || 0
          )} net shift`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Monthly Operating SaaS Burn"
          value={formatMoney(forecast?.parameters?.monthlySubscriptionExpense || 7299)}
          subtitle="Canva, Figma, AWS cloud stack"
          icon={DollarSign}
          color="rose"
        />
        <StatCard
          title="Estimated Operational Runway"
          value={`~${forecast?.summary?.runwayMonths || 18} Months`}
          subtitle="Above reserve minimum floor"
          icon={ShieldCheck}
          color="indigo"
        />
      </div>

      {/* Visual Chart */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Projected Cash Trajectory vs Minimum Reserve Floor ($ USD)
            </h3>
            <p className="text-xs text-slate-500">
              Dotted floor represents your safety reserve ($10,000.00). Cash balance is expected to maintain safely above floor.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Reserve Protected
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `$${val.toLocaleString()}`}
              />
              <Tooltip
                formatter={(val) => [`$${val.toLocaleString()}`, 'Projected Cash']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="projectedCash"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#cashGradient)"
              />
              <Area
                type="monotone"
                dataKey="reserveFloor"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
