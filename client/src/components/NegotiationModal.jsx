import React, { useState } from 'react';
import { Bot, Sparkles, X, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';
import { formatMoney } from '../services/api';
import PayPalCheckoutButton from './PayPalCheckoutButton';

export const NegotiationModal = ({ isOpen, onClose, listing, customerEmail, onOrderPlaced }) => {
  const [offerPrice, setOfferPrice] = useState(
    listing ? Math.round((listing.priceCents * 0.85) / 100) : 100
  );
  const [buyerNotes, setBuyerNotes] = useState('Requesting volume discount with immediate payment');
  const [negotiating, setNegotiating] = useState(false);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !listing) return null;

  const handleStartNegotiation = async (e) => {
    e.preventDefault();
    setNegotiating(true);
    setError('');

    try {
      const offerCents = Math.round(Number(offerPrice) * 100);
      const res = await fetch('/api/negotiations/orchestrate-autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing._id,
          customerEmail: customerEmail || 'sarah.j@gmail.com',
          initialOfferCents: offerCents,
          buyerNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Negotiation failed');
      }

      setSession(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setNegotiating(false);
    }
  };

  const finalPriceCents = session?.finalPriceCents || listing.priceCents;
  const isAgreed = session?.status === 'agreed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">AI Autonomous Agent Negotiation</h3>
              <p className="text-xs text-indigo-200">Customer Agent & Seller Agent negotiate on PayPal Sandbox</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Listing Snapshot */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {listing.category || 'Goods'}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">{listing.title}</h4>
              <p className="text-xs text-slate-500">Seller: {listing.businessName || 'Artisan Merchant'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">List Price</p>
              <p className="text-lg font-black text-slate-900">{formatMoney(listing.priceCents)}</p>
            </div>
          </div>

          {!session ? (
            <form onSubmit={handleStartNegotiation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Your Proposed Offer ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={listing.priceCents / 100}
                    step="1"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Recommended range: {formatMoney(listing.priceCents * 0.75)} – {formatMoney(listing.priceCents * 0.95)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Negotiation Instructions / Notes for Agent
                </label>
                <textarea
                  rows="2"
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={negotiating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {negotiating ? (
                  <span>Autonomous Agents Negotiating...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Launch AI Negotiation</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Negotiation Transcript */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 max-h-64 overflow-y-auto">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Negotiation bus stream ({session.messages?.length || 0} rounds)
                </p>
                {session.messages?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs space-y-1 ${
                      msg.senderRole === 'customer_agent'
                        ? 'bg-blue-50 border border-blue-100 text-blue-900 ml-4'
                        : 'bg-emerald-50 border border-emerald-100 text-emerald-900 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px]">
                      <span>{msg.senderRole === 'customer_agent' ? '🤖 Customer Agent' : '🏬 Seller Agent'}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-white/70">
                        {msg.type} • {formatMoney(msg.offerCents)}
                      </span>
                    </div>
                    <p className="text-slate-700">{msg.notes || 'Counter offer computed deterministically.'}</p>
                  </div>
                ))}
              </div>

              {/* Final Agreed Status */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isAgreed ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isAgreed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {isAgreed ? 'Agreement Reached!' : `Session Status: ${session.status}`}
                    </p>
                    <p className="text-xs text-slate-600">
                      Final Agreed Price: <span className="font-black text-slate-900">{formatMoney(finalPriceCents)}</span> (Original: {formatMoney(listing.priceCents)})
                    </p>
                  </div>
                </div>
              </div>

              {/* PayPal Payment */}
              {isAgreed && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Protected by server spending policy engine and PayPal Sandbox escrow.</span>
                  </div>

                  <PayPalCheckoutButton
                    amount={finalPriceCents / 100}
                    orderData={{
                      listingId: listing._id,
                      items: [{ title: listing.title, quantity: 1, unitPriceCents: finalPriceCents, totalCents: finalPriceCents }],
                      customerEmail,
                      businessId: listing.businessId,
                      businessName: listing.businessName,
                      type: listing.type || 'one_time_goods',
                    }}
                    onSuccess={(order) => {
                      if (onOrderPlaced) onOrderPlaced(order);
                      onClose();
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NegotiationModal;
