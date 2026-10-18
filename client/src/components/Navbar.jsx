import React from 'react';
import { Plus, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function Navbar({ business, paypalStatus, onOpenInvoiceModal }) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="h-16 border-b border-slate-200/90 bg-white/90 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {business?.name || 'Acme Studio'}
        </h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
          {business?.currency || 'USD'}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Sandbox Status Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border">
          {paypalStatus?.configured ? (
            <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 border-emerald-200 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PayPal Sandbox Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-amber-700 bg-amber-50 border-amber-200 px-2 py-0.5 rounded-full">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>PayPal Credentials Setup Needed</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium hidden md:block">
          {currentDate}
        </div>

        {onOpenInvoiceModal && (
          <button
            onClick={onOpenInvoiceModal}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </button>
        )}
      </div>
    </header>
  );
}

