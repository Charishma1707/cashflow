import React, { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Save,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getBusinessSettings,
  updateBusinessSettings,
  getPayPalStatus,
  formatMoney,
} from '../services/api';

export default function SettingsPage({ onSettingsUpdated }) {
  const [business, setBusiness] = useState(null);
  const [paypalStatus, setPaypalStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [openingBalance, setOpeningBalance] = useState('');
  const [minimumCashReserve, setMinimumCashReserve] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bizData, ppData] = await Promise.all([getBusinessSettings(), getPayPalStatus()]);
      setBusiness(bizData);
      setPaypalStatus(ppData);

      setName(bizData.name || '');
      setCurrency(bizData.currency || 'USD');
      setOpeningBalance((bizData.openingBalance / 100).toFixed(2));
      setMinimumCashReserve((bizData.minimumCashReserve / 100).toFixed(2));
      setContactEmail(bizData.contactEmail || '');
      setAddress(bizData.address || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(false);
      setError(null);

      const updated = await updateBusinessSettings({
        name,
        currency,
        openingBalance: Number(openingBalance),
        minimumCashReserve: Number(minimumCashReserve),
        contactEmail,
        address,
      });

      setBusiness(updated);
      setSavedSuccess(true);
      if (onSettingsUpdated) onSettingsUpdated(updated);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading configuration..." />;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Workspace Settings</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Configure business entity profile, cash reserve threshold, and PayPal Sandbox keys
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Business settings and cash reserve floor updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Business Profile Form (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Business Financial Profile</h3>
              <p className="text-xs text-slate-500 font-medium">Core parameters used across your cashflow dashboard</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-600 font-bold block mb-1">Business Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="CAD">CAD ($) - Canadian Dollar</option>
                  <option value="AUD">AUD ($) - Australian Dollar</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Opening Cash Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
                />
                <span className="text-[11px] text-slate-400 font-medium mt-1 block">
                  Starting balance prior to recorded transactions
                </span>
              </div>

              <div>
                <label className="text-slate-600 font-bold block mb-1">Minimum Cash Reserve ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={minimumCashReserve}
                  onChange={(e) => setMinimumCashReserve(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
                />
                <span className="text-[11px] text-slate-400 font-medium mt-1 block">
                  Liquidity floor threshold for warning alerts
                </span>
              </div>
            </div>

            <div>
              <label className="text-slate-600 font-bold block mb-1">Billing Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Business Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* PayPal Sandbox Diagnostics Box (Right col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>PayPal Sandbox Status</span>
          </div>

          <div
            className={`p-4 rounded-2xl border ${
              paypalStatus?.configured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-xs">
              {paypalStatus?.configured ? (
                <>
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Sandbox Credentials Active</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Setup Credentials in .env</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed font-medium">
              {paypalStatus?.configured
                ? 'Your backend has verified PayPal Sandbox client credentials and is ready to process live test payments.'
                : 'Set PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET in server/.env and VITE_PAYPAL_CLIENT_ID in client/.env.'}
            </p>
          </div>

          <div className="space-y-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono">
            <div>
              <span className="text-slate-400 font-sans font-bold text-[10px] uppercase block">Environment</span>
              <span className="text-slate-800 font-bold">sandbox</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans font-bold text-[10px] uppercase block">REST API Base URL</span>
              <span className="text-blue-600 truncate block text-[11px] font-bold">
                {paypalStatus?.baseUrl || 'https://api-m.sandbox.paypal.com'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans font-bold text-[10px] uppercase block">Configured Client ID</span>
              <span className="text-slate-700 font-medium">
                {paypalStatus?.maskedClientId || 'None (Missing)'}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-800 block">How to Test Payments:</span>
            <ol className="text-[11px] text-slate-600 font-medium list-decimal list-inside space-y-1">
              <li>Log in to <span className="text-blue-600 font-bold">developer.paypal.com</span></li>
              <li>Go to <strong>Apps & Credentials</strong> & copy Sandbox Client ID / Secret</li>
              <li>Under <strong>Sandbox Accounts</strong>, use the test Personal buyer login to approve orders</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
