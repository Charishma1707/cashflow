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
    <header className="h-16 border-b border-slate-800/80 bg-[#0a0e17]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-semibold text-white tracking-tight">
          {business?.name || 'Acme Studio'}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {business?.currency || 'USD'}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Sandbox Status Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-slate-900/60 border-slate-800">
          {paypalStatus?.configured ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">PayPal Sandbox Connected</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400">PayPal Credentials Setup Needed</span>
            </>
          )}
        </div>

        <div className="text-xs text-slate-400 hidden md:block">
          {currentDate}
        </div>

        {onOpenInvoiceModal && (
          <button
            onClick={onOpenInvoiceModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </button>
        )}
      </div>
    </header>
  );
}
