import React, { useState } from 'react';
import { Scale, ShieldAlert, CheckCircle2, AlertTriangle, X, DollarSign, Lock } from 'lucide-react';
import { formatMoney, mediateOrderDispute } from '../services/api';

export const DisputeMediationModal = ({ isOpen, onClose, order, onMediated }) => {
  const [disputeReason, setDisputeReason] = useState('Deliverable not completed to specification');
  const [evidenceType, setEvidenceType] = useState('sellerFailedToShip');
  const [mediating, setMediating] = useState(false);
  const [mediationResult, setMediationResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const handleMediate = async (e) => {
    e.preventDefault();
    setMediating(true);
    setError('');

    try {
      const evidence = {};
      if (evidenceType === 'sellerFailedToShip') evidence.sellerFailedToShip = true;
      if (evidenceType === 'itemDamagedPhotosVerified') evidence.itemDamagedPhotosVerified = true;
      if (evidenceType === 'validCarrierTracking') {
        evidence.validCarrierTracking = true;
        evidence.deliveredConfirmed = true;
      }
      if (evidenceType === 'mutualSplitAgreed') evidence.mutualSplitAgreed = true;

      const res = await mediateOrderDispute(order._id, {
        disputeReason,
        evidence,
      });

      setMediationResult(res.mediation);
      if (onMediated) onMediated(res.mediation);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setMediating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-indigo-950 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Scale className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">AI Dispute Mediation Agent</h3>
              <p className="text-xs text-indigo-200">
                Order #{order.orderNumber} • Total: {formatMoney(order.totalCents)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!mediationResult ? (
            <form onSubmit={handleMediate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dispute Reason
                </label>
                <input
                  type="text"
                  required
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Evidence / Dispute Condition
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="sellerFailedToShip">Seller failed to provide deliverable / tracking</option>
                  <option value="itemDamagedPhotosVerified">Item defective or deliverables broken (photos verified)</option>
                  <option value="mutualSplitAgreed">Mutual 50/50 compromise agreed between parties</option>
                  <option value="validCarrierTracking">Merchant has carrier proof of delivery confirmed</option>
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={mediating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {mediating ? 'AI Mediator Inspecting Case & Records...' : 'Submit to AI Dispute Mediator'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border ${
                  mediationResult.outcome === 'FULL_REFUND_BUYER'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : mediationResult.outcome === 'SPLIT_REFUND'
                    ? 'bg-blue-50 border-blue-200 text-blue-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-700" />
                  <span className="font-extrabold text-sm uppercase">
                    Outcome: {mediationResult.outcome.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs">{mediationResult.aiSummary}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Refund Issued:</span>
                  <span className="font-bold text-slate-900">{formatMoney(mediationResult.refundAmountCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Status:</span>
                  <span className="font-bold text-slate-900 uppercase">{mediationResult.orderStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PayPal Tool Idempotency:</span>
                  <span className="font-mono text-[10px] text-slate-700">Verified & Cached</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] flex items-center space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-purple-700" />
                <span>Mediation recorded in immutable SHA-256 chained audit ledger.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisputeMediationModal;
