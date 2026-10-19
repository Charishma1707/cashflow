import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  CreditCard,
  FileText,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { chatWithMcp, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const OWNER_SUGGESTED_PROMPTS = [
  'How well is my business going and how will it grow in 6 and 12 months?',
  'Prepare reminders for overdue invoices',
  'Pay Canva Pro subscription with PayPal',
  'Show merchant liquidity runway and cash flow',
];

export default function OwnerAiPage() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello Marcus! I am your **Cashflow Copilot AI Business Advisor**, connected directly to the **PayPal Remote MCP Server** and your store ledger.\n\nI can calculate your 6 & 12-month financial runway, initialize PayPal sandbox payments for operational SaaS subscriptions (Canva, Figma, AWS), and prepare polite reminders for clients with overdue invoices.\n\nWhat would you like to investigate?`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remindersSent, setRemindersSent] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithMcp(prompt, [], {
        role: 'owner',
      });

      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: response.reply,
        toolCall: response.toolCall,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ Copilot encountered an issue: ${err.response?.data?.error || err.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReminders = () => {
    setRemindersSent(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `sent-${Date.now()}`,
        role: 'assistant',
        text: `✅ **Reminders Dispatched!** Notification emails and PayPal payment links have been proposed to the respective clients.`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900">AI Business Copilot & Operations</h1>
        <p className="text-xs text-slate-500">
          Executive financial forecasting, SaaS subscription settlements, and automated invoice collections.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`space-y-3 max-w-xl ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {/* Bubble */}
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Action Card: Overdue Invoices Reminder Proposal */}
                {msg.toolCall?.name === 'remind_overdue_invoices' && msg.toolCall.result?.proposedReminders && (
                  <div className="bg-white border-2 border-violet-200 rounded-2xl p-4 shadow-md space-y-3 text-left">
                    <div className="flex items-center space-x-2 text-violet-700">
                      <Sparkles className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Proposed Overdue Invoice Reminders ({msg.toolCall.result.count})
                      </h4>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {msg.toolCall.result.proposedReminders.map((r, i) => (
                        <div key={i} className="py-2 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900">
                              {r.customerName} (#{r.invoiceNumber})
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{r.customerEmail}</p>
                          </div>
                          <span className="font-mono font-bold text-rose-600">{r.balanceDue}</span>
                        </div>
                      ))}
                    </div>

                    {!remindersSent ? (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={handleConfirmReminders}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Send Nudge Reminders
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-emerald-600 flex items-center space-x-1 pt-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Reminders successfully queued</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Card: SaaS Subscription PayPal Checkout */}
                {msg.toolCall?.name === 'pay_subscription_with_paypal' && msg.toolCall.result && (
                  <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-md space-y-3 text-left">
                    <div className="flex items-center space-x-2 text-blue-700">
                      <CreditCard className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        PayPal Sandbox Payment Initialized
                      </h4>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">{msg.toolCall.result.description}</p>
                      <p className="font-mono text-base font-bold text-blue-600">{msg.toolCall.result.amount}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        PayPal Order ID: {msg.toolCall.result.paypalOrderId}
                      </p>
                    </div>

                    <a
                      href={msg.toolCall.result.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    >
                      <span>Authorize via PayPal Sandbox</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3 text-slate-400">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-violet-600 animate-pulse" />
              </div>
              <LoadingSpinner message="Consulting PayPal MCP server & store accounts..." />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
          {OWNER_SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700 whitespace-nowrap shadow-xs transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 border-t border-slate-100 bg-white flex items-center space-x-3"
        >
          <input
            type="text"
            placeholder="Ask Copilot about runway, SaaS payments, or unpaid accounts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
