import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Download,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  CheckCircle2,
  DollarSign,
  Cpu,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getFinancialForecast, formatMoney } from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ForecastPage() {
  const [horizon, setHorizon] = useState(12);
  const [scenario, setScenario] = useState('baseline');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const gridRef = useRef();

  const fetchForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFinancialForecast(horizon, scenario);
      setForecastData(data);
    } catch (err) {
      console.error('Failed to load forecast data:', err);
      setError(err.message || 'Could not calculate predictive financial forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [horizon, scenario]);

  const onExportCsv = () => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `cashflow_forecast_${horizon}mo_${scenario}.csv`,
      });
    }
  };

  // AG Grid Column Definitions
  const columnDefs = useMemo(
    () => [
      {
        field: 'monthLabel',
        headerName: 'Period',
        width: 130,
        pinned: 'left',
        cellRenderer: (params) => (
          <span className="font-bold text-slate-900 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{params.value}</span>
          </span>
        ),
      },
      {
        field: 'projectedInflowCents',
        headerName: 'Projected Inflow',
        width: 170,
        cellRenderer: (params) => (
          <span className="font-semibold text-emerald-600 flex items-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{formatMoney(params.value)}</span>
          </span>
        ),
      },
      {
        field: 'saasSubscriptionsCents',
        headerName: 'SaaS Tools (Figma/Canva/AWS)',
        width: 220,
        cellRenderer: (params) => (
          <span className="font-medium text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md text-xs">
            {formatMoney(params.value)}
          </span>
        ),
      },
      {
        field: 'operationalExpensesCents',
        headerName: 'Other OpEx',
        width: 150,
        cellRenderer: (params) => (
          <span className="text-slate-600 font-medium">{formatMoney(params.value)}</span>
        ),
      },
      {
        field: 'totalOutflowCents',
        headerName: 'Total Burn',
        width: 150,
        cellRenderer: (params) => (
          <span className="font-semibold text-slate-800">{formatMoney(params.value)}</span>
        ),
      },
      {
        field: 'netCashCents',
        headerName: 'Net Monthly Cash',
        width: 170,
        cellRenderer: (params) => {
          const isPositive = params.value >= 0;
          return (
            <span
              className={`font-bold inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{formatMoney(params.value)}</span>
            </span>
          );
        },
      },
      {
        field: 'cumulativeCashCents',
        headerName: 'Cumulative Liquidity',
        width: 190,
        cellRenderer: (params) => (
          <span className="font-extrabold text-blue-700">{formatMoney(params.value)}</span>
        ),
      },
      {
        field: 'runwayStatus',
        headerName: 'Runway Health',
        width: 150,
        cellRenderer: (params) => {
          const val = params.value;
          if (val === 'HEALTHY') {
            return (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-1 w-max">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>HEALTHY</span>
              </span>
            );
          }
          if (val === 'WARNING') {
            return (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center space-x-1 w-max">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>CAUTION</span>
              </span>
            );
          }
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center space-x-1 w-max">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>CRITICAL</span>
            </span>
          );
        },
      },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  // Chart data formatting
  const chartData = useMemo(() => {
    if (!forecastData?.months) return [];
    return forecastData.months.map((m) => ({
      period: m.monthLabel,
      cash: Math.round(m.cumulativeCashCents / 100),
      inflow: Math.round(m.projectedInflowCents / 100),
      burn: Math.round(m.totalOutflowCents / 100),
      reserveFloor: Math.round(
        (forecastData.currentCashPosition?.minimumReserveCents || 1000000) / 100
      ),
    }));
  }, [forecastData]);

  if (loading && !forecastData) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="Computing 6 & 12-month financial projections..." />
      </div>
    );
  }

  const summary = forecastData?.forecastSummary;
  const curr = forecastData?.currentCashPosition;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">
              AI Financial Engine
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">AG Grid Enterprise Matrix</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2.5">
            <span>Predictive Growth & Runway Forecast</span>
            <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Calculate business trajectory, SaaS burn (Canva, Figma, AWS), and cash runway over 6 and 12 months based on invoice contracts.
          </p>
        </div>

        {/* Horizon and Scenario Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Horizon Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-2xs">
            <button
              onClick={() => setHorizon(6)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                horizon === 6
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setHorizon(12)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                horizon === 12
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12 Months
            </button>
          </div>

          {/* Scenario Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-2xs">
            {[
              { id: 'conservative', label: 'Conservative (80%)' },
              { id: 'baseline', label: 'Baseline (100%)' },
              { id: 'growth', label: 'Growth (125%)' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scenario === s.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Liquid Cash"
          value={formatMoney(curr?.startingCashCents)}
          subtitle="Opening balance + collected - paid"
          icon={DollarSign}
          variant="default"
        />

        <StatCard
          title={`Projected ${horizon}M Net Growth`}
          value={formatMoney(summary?.projectedNetGrowthCents)}
          subtitle={`${scenario.toUpperCase()} scenario model`}
          icon={TrendingUp}
          variant={summary?.projectedNetGrowthCents >= 0 ? 'success' : 'danger'}
        />

        <StatCard
          title="Monthly SaaS Subscriptions"
          value={formatMoney(curr?.monthlySubscriptionBurnCents)}
          subtitle="Figma, Canva, AWS, Adobe tools"
          icon={Layers}
          variant="warning"
        />

        <StatCard
          title="Estimated Operational Runway"
          value={`${summary?.estimatedRunwayMonths || 0} Months`}
          subtitle={
            summary?.isReserveMaintained
              ? 'Reserve floor ($10k) preserved'
              : 'Drops below reserve floor'
          }
          icon={Clock}
          variant={summary?.isReserveMaintained ? 'success' : 'danger'}
        />
      </div>

      {/* Recharts Cash Trajectory Projection */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {horizon}-Month Cash Balance & Runway Trajectory
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Simulated cumulative cash against the $10,000 Minimum Reserve Floor
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-semibold">
            <span className="flex items-center space-x-1.5 text-blue-600">
              <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
              <span>Projected Liquidity</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-500">
              <span className="w-3 h-1 bg-rose-400"></span>
              <span>Reserve Floor ($10k)</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `$${val.toLocaleString()}`}
              />
              <Tooltip
                formatter={(val) => [`$${val.toLocaleString()}`, 'Amount']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <ReferenceLine
                y={10000}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{ value: 'Reserve Floor ($10k)', fill: '#f43f5e', fontSize: 11, position: 'insideTopLeft' }}
              />
              <Area
                type="monotone"
                dataKey="cash"
                name="Projected Cash ($)"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCash)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AG Grid Enterprise Forecasting Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
              <span>AG Grid Enterprise Financial Matrix</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {horizon} Monthly Periods
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Interactive high-precision cash flow schedule with multi-column sorting, filtering, and export.
            </p>
          </div>
          <button
            onClick={onExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer w-max"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Spreadsheet</span>
          </button>
        </div>

        {/* AG Grid Table Container */}
        <div className="ag-theme-quartz w-full rounded-xl overflow-hidden border border-slate-200" style={{ height: '420px' }}>
          <AgGridReact
            ref={gridRef}
            rowData={forecastData?.months || []}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={true}
            pagination={true}
            paginationPageSize={12}
          />
        </div>
      </div>

      {/* AI Strategist Recommendations */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-indigo-800/50">
        <div className="flex items-center space-x-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center text-indigo-300 border border-indigo-400/30">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-wide">
              AI Strategic Growth & Runway Insights
            </h4>
            <span className="text-[11px] text-indigo-200">
              Derived from PayPal Invoicing trends & SaaS Operating Subscriptions
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          {forecastData?.recommendations?.map((rec, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10 text-xs leading-relaxed text-indigo-100"
            >
              <div className="font-semibold text-white mb-1">Recommendation #{i + 1}</div>
              <p>{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
