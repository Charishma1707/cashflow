import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, X, ExternalLink, ArrowRight, AlertCircle, FileCheck } from 'lucide-react';
import { formatMoney, submitMilestoneDeliverable } from '../services/api';

export const MilestoneEscrowModal = ({ isOpen, onClose, order, onUpdated }) => {
  const [selectedMilestone, setSelectedMilestone] = useState(0);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const milestones = order.milestones || [];
  const currentMilestone = milestones[selectedMilestone] || milestones[0];

  const handleSubmitDeliverable = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const response = await submitMilestoneDeliverable(order._id, selectedMilestone, {
        deliverableUrl,
        deliverableNotes,
      });

      setResult(response.data);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalReleasedCents = milestones
    .filter((m) => m.status === 'released')
    .reduce((sum, m) => sum + m.amountCents, 0);

  const totalEscrowLockedCents = (order.totalCents || 0) - totalReleasedCents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-teal-900 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Milestone Escrow & AI Verifier Agent</h3>
              <p className="text-xs text-teal-200">
                Order #{order.orderNumber} • Escrow Balance: {formatMoney(totalEscrowLockedCents)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Escrow Balance Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Released to Merchant</p>
              <p className="text-xl font-black text-emerald-950 mt-1">{formatMoney(totalReleasedCents)}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Disbursed via PayPal Payouts API</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Held in Escrow</p>
              <p className="text-xl font-black text-slate-900 mt-1">{formatMoney(totalEscrowLockedCents)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Pending AI Verifier Inspection</p>
            </div>
          </div>

          {/* Milestones Stepper */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Service Milestones</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {milestones.map((m, idx) => {
                const isSelected = selectedMilestone === idx;
                const isReleased = m.status === 'released';
                const isRejected = m.status === 'rejected';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedMilestone(idx);
                      setResult(null);
                      setError('');
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Milestone {idx + 1}</span>
                      {isReleased ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isRejected ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate mt-1">{m.title}</p>
                    <p className="text-xs text-teal-700 font-extrabold mt-0.5">
                      {formatMoney(m.amountCents)} ({m.percentage}%)
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Milestone Detail & Deliverable Submission */}
          {currentMilestone && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{currentMilestone.title}</h4>
                  <p className="text-xs text-slate-500">Amount: {formatMoney(currentMilestone.amountCents)}</p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    currentMilestone.status === 'released'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentMilestone.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {currentMilestone.status}
                </span>
              </div>

              {currentMilestone.verifierSummary && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    currentMilestone.status === 'released'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  <p className="font-bold mb-0.5">AI Verifier Agent Summary:</p>
                  <p>{currentMilestone.verifierSummary}</p>
                </div>
              )}

              {currentMilestone.status !== 'released' && (
                <form onSubmit={handleSubmitDeliverable} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Deliverable URL (Active HTTPS link or Github PR)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://github.com/org/repo/pull/1"
                      value={deliverableUrl}
                      onChange={(e) => setDeliverableUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Inspection Notes / Criteria Fulfilled
                    </label>
                    <textarea
                      rows="2"
                      required
                      placeholder="Specification met, test coverage at 95%, deployed to staging."
                      value={deliverableNotes}
                      onChange={(e) => setDeliverableNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    ></textarea>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                  >
                    {submitting ? 'AI Verifier Agent Inspecting...' : 'Submit Deliverable for AI Verification'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestoneEscrowModal;
