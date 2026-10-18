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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900">AI Nudge-Bot Assistant</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  AG Grid Hackathon Feature
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Draft warm, friendly payment reminders with instant PayPal checkout links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (2 Columns) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-1 text-xs bg-white">
          {/* Left Column: Receivables Scoreboard */}
          <div className="space-y-3 md:col-span-1 border-r border-slate-200 pr-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                Pending Receivables ({unpaidInvoices.length})
              </h4>
              <span className="text-[10px] text-slate-500">Select client</span>
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
                        ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                        {inv.customer?.name}
                      </span>
                      <span className="font-mono font-bold text-blue-600">
                        {formatMoney(inv.outstandingBalance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{inv.invoiceNumber}</span>
                      {overdueDays > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          {overdueDays}d overdue
                        </span>
                      ) : (
                        <span className="text-slate-500">Current</span>
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
                  <label className="text-slate-700 block mb-2 font-semibold">
                    Select Nudge Tone:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTone('gentle')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        tone === 'gentle'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-xs font-semibold">Warm & Gentle</span>
                      <span className="text-[10px] text-slate-500">Friendly check-in</span>
                    </button>

                    <button
                      onClick={() => setTone('professional')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        tone === 'professional'
                          ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-xs font-semibold">Professional</span>
                      <span className="text-[10px] text-slate-500">Standard business</span>
                    </button>

                    <button
                      onClick={() => setTone('urgent')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        tone === 'urgent'
                          ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-xs font-semibold">Firm & Direct</span>
                      <span className="text-[10px] text-slate-500">For late accounts</span>
                    </button>
                  </div>
                </div>

                {/* Draft Output Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-semibold">Drafted Nudge Email:</span>
                    <span className="text-[11px] text-blue-600 font-medium">
                      To: {selectedInv.customer?.email}
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      rows="10"
                      value={nudgeDraft}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:bg-white focus:border-blue-400"
                    ></textarea>
                  </div>
                </div>

                {/* Success Feedback */}
                {sentSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center space-x-2 font-medium">
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
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer font-medium"
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Open Invoice & Pay with PayPal</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer font-semibold shadow-2xs transition-colors"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
                    </button>

                    <button
                      onClick={handleSimulateSend}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Nudge Email</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-slate-500">
                <p>No unpaid invoices available to nudge!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
