import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Copy,
  CheckCircle2,
  Clock,
  User,
  CreditCard,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  FileText,
} from 'lucide-react';
import { formatMoney } from '../services/api';

export default function NudgeBotModal({ invoices = [], onClose, onSelectInvoice }) {
  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.outstandingBalance > 0
  );

  const [selectedInv, setSelectedInv] = useState(unpaidInvoices[0] || null);
  const [tone, setTone] = useState('gentle'); // 'gentle', 'professional', 'urgent'
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const getDaysOverdue = (dueDate) => {
    const diff = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const generateNudgeText = (inv, selectedTone) => {
    if (!inv) return '';
    const days = getDaysOverdue(inv.dueDate);
    const clientName = inv.customer?.name || 'Customer';
    const amount = formatMoney(inv.outstandingBalance);
    const invoiceNum = inv.invoiceNumber;
    const dueDateStr = new Date(inv.dueDate).toLocaleDateString();

    if (selectedTone === 'gentle') {
      return `Hey ${clientName}! 👋

Hope you're having a productive week. 

Just dropping a quick, gentle heads-up regarding invoice ${invoiceNum} for ${amount}, which had a due date of ${dueDateStr}${
        days > 0 ? ` (${days} days ago)` : ''
      }. 

No pressure at all—whenever you have a spare moment, you can settle it instantly online using our secure PayPal link below:

🔗 Pay with PayPal: http://localhost:5173/invoices?pay=${inv._id}

Thanks so much for partnering with Acme Studio!

Warm regards,
Acme Studio Billing Team`;
    }

    if (selectedTone === 'professional') {
      return `Dear ${clientName},

This is a courteous reminder that invoice ${invoiceNum} for ${amount} was scheduled for settlement on ${dueDateStr}${
        days > 0 ? ` and is currently ${days} days past due` : ''
      }.

We would greatly appreciate it if you could review the invoice and complete payment at your earliest convenience via PayPal:

🔗 Secure PayPal Payment Link: http://localhost:5173/invoices?pay=${inv._id}

If payment has already been sent or if you have any billing questions, please let us know.

Sincerely,
Acme Studio Finance Department`;
    }

    return `Attention: ${clientName} Accounts Payable,

Invoice ${invoiceNum} for ${amount} is currently ${days > 0 ? `${days} days ` : ''}OVERDUE (due date: ${dueDateStr}).

To keep your account in good standing and prevent service interruptions, please settle the outstanding balance immediately using our online PayPal gateway:

🔗 Immediate Payment Gateway: http://localhost:5173/invoices?pay=${inv._id}

Thank you for your prompt cooperation.

Acme Studio Treasury`;
  };

  const nudgeDraft = selectedInv ? generateNudgeText(selectedInv, tone) : '';

  const handleCopy = () => {
    navigator.clipboard?.writeText(nudgeDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateSend = () => {
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">AI Nudge-Bot Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  AG Grid Hackathon Feature
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Draft warm, friendly payment reminders with instant PayPal checkout links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (2 Columns) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-1 text-xs">
          {/* Left Column: Receivables Scoreboard */}
          <div className="space-y-3 md:col-span-1 border-r border-slate-800/80 pr-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Pending Receivables ({unpaidInvoices.length})
              </h4>
              <span className="text-[10px] text-slate-400">Select client</span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {unpaidInvoices.map((inv) => {
                const isSelected = selectedInv?._id === inv._id;
                const overdueDays = getDaysOverdue(inv.dueDate);
                return (
                  <div
                    key={inv._id}
                    onClick={() => setSelectedInv(inv)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/20'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {inv.customer?.name}
                      </span>
                      <span className="font-mono font-bold text-cyan-400">
                        {formatMoney(inv.outstandingBalance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{inv.invoiceNumber}</span>
                      {overdueDays > 0 ? (
                        <span className="text-rose-400 font-medium">
                          {overdueDays}d overdue
                        </span>
                      ) : (
                        <span className="text-slate-400">Current</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: AI Tone Selection & Message Draft */}
          <div className="md:col-span-2 space-y-4">
            {selectedInv ? (
              <>
                {/* Tone Selector */}
                <div>
                  <label className="text-slate-400 block mb-2 font-medium">
                    Select Nudge Tone:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTone('gentle')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        tone === 'gentle'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-semibold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs">Warm & Gentle</span>
                      <span className="text-[10px] text-slate-400">Friendly check-in</span>
                    </button>

                    <button
                      onClick={() => setTone('professional')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        tone === 'professional'
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-semibold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs">Professional</span>
                      <span className="text-[10px] text-slate-400">Standard business</span>
                    </button>

                    <button
                      onClick={() => setTone('urgent')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        tone === 'urgent'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 font-semibold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs">Firm & Direct</span>
                      <span className="text-[10px] text-slate-400">For late accounts</span>
                    </button>
                  </div>
                </div>

                {/* Draft Output Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Drafted Nudge Email:</span>
                    <span className="text-[11px] text-cyan-400">
                      To: {selectedInv.customer?.email}
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      rows="10"
                      value={nudgeDraft}
                      className="w-full p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-slate-200 font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
                    ></textarea>
                  </div>
                </div>

                {/* Success Feedback */}
                {sentSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Nudge sent to {selectedInv.customer?.email} with PayPal payment link!</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onSelectInvoice(selectedInv);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span>Open Invoice & Pay with PayPal</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer font-medium"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
                    </button>

                    <button
                      onClick={handleSimulateSend}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-md shadow-cyan-900/30 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Nudge Email</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <p>No unpaid invoices available to nudge!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
