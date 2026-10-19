import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  ShoppingBag,
  CreditCard,
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { chatWithMcp, formatMoney } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const SUGGESTED_PROMPTS = [
  'Find organic groceries under $20',
  'How much monthly budget do I have remaining?',
  'What bills do I have pending?',
  'Recommend breakfast staples for this week',
];

export default function CustomerAiPage() {
  const { currentCustomer } = useAuth();
  const { addToCart } = useCart();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${currentCustomer?.name || 'there'}! I'm your **FreshCart Shopping & Spending Assistant**.\n\nI can help you explore fresh organic groceries, check your monthly spending allowance, and review any unpaid delivery invoices.\n\nHow can I help you today?`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
        role: 'client',
        clientEmail: currentCustomer.email,
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
          text: `⚠️ I encountered an issue: ${err.response?.data?.error || err.message}. Please try again!`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900">AI Shopping & Spending Assistant</h1>
        <p className="text-xs text-slate-500">
          Discover seasonal produce, check allowance limits, and prepare verified grocery orders.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Chat Messages */}
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
                    : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xs'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`space-y-3 max-w-xl ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {/* Text Bubble */}
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Interactive Action Card: Product Search Recommendations */}
                {msg.toolCall?.name === 'search_products' && msg.toolCall.result?.products?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {msg.toolCall.result.products.map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2 text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{prod.title}</h4>
                            <p className="text-[11px] font-mono font-bold text-blue-600">{prod.price}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            addToCart({
                              _id: prod.id,
                              title: prod.title,
                              priceCents: Math.round(parseFloat(prod.price.replace('$', '')) * 100),
                              imageUrl: prod.imageUrl,
                            });
                          }}
                          className="w-full flex items-center justify-center space-x-1 py-1.5 bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Shopping Cart</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Action Card: Spending Allowance Progress */}
                {msg.toolCall?.name === 'get_customer_spending_allowance' && msg.toolCall.result && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 text-left space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-900">Monthly Spending Status</span>
                      <span className="font-mono font-bold text-blue-700">
                        {msg.toolCall.result.spentThisMonth} / {msg.toolCall.result.monthlyBudgetLimit}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Available Remaining Budget:</span>
                      <strong className="text-emerald-700">{msg.toolCall.result.remainingBudget}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Prepaid Balance:</span>
                      <strong className="text-blue-700">{msg.toolCall.result.availablePrepaidBalance}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3 text-slate-400">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-600 animate-pulse" />
              </div>
              <LoadingSpinner message="Consulting catalog & accounts..." />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Bar */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700 whitespace-nowrap shadow-xs transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-slate-100 bg-white flex items-center space-x-3">
          <input
            type="text"
            placeholder="Ask anything about fresh groceries, your budget, or orders..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
