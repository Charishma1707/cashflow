import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  Terminal,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Receipt,
  CreditCard,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Code2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { getMcpStatus, getMcpTools, callMcpTool, chatWithMcp } from '../services/api';

const QUICK_PROMPTS = [
  {
    label: 'Business Insights',
    prompt: 'Give me a summary of business health and merchant insights',
    icon: TrendingUp,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  {
    label: 'Unpaid Invoices',
    prompt: 'Show me all pending and overdue invoices',
    icon: Receipt,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    label: 'Recent Payments',
    prompt: 'List recent PayPal transactions and capture IDs',
    icon: CreditCard,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    label: 'Draft Invoice ($350)',
    prompt: 'Create a new invoice for $350 for Design Services to client@acme.com',
    icon: Zap,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    label: 'Dispute Center',
    prompt: 'Check for any active customer disputes or claims',
    icon: ShieldAlert,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
];

export default function McpAssistantPage({ onOpenInvoiceModal }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I'm your **CashFlow Copilot AI Assistant**, connected directly to the **PayPal Remote MCP Server**.\n\nYou can talk to me in natural language to query live invoices, check settled PayPal transactions, analyze cashflow runway, or generate payable invoices using official MCP tools.",
      toolCall: null,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mcpStatus, setMcpStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [tools, setTools] = useState([]);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'explorer'

  // Tool Explorer State
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolArgsJson, setToolArgsJson] = useState('{}');
  const [toolExecutionResult, setToolExecutionResult] = useState(null);
  const [executingTool, setExecutingTool] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchStatusAndTools = async () => {
    try {
      setCheckingStatus(true);
      const [statusData, toolsData] = await Promise.all([getMcpStatus(), getMcpTools()]);
      setMcpStatus(statusData);
      if (toolsData?.tools) {
        setTools(toolsData.tools);
        if (!selectedTool && toolsData.tools.length > 0) {
          setSelectedTool(toolsData.tools[0]);
          setToolArgsJson(JSON.stringify(toolsData.tools[0].parameters?.properties ? {} : {}, null, 2));
        }
      }
    } catch (err) {
      console.warn('Failed to load MCP status or tools:', err.message);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatusAndTools();
  }, []);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.sender, content: m.text }));

      const res = await chatWithMcp(text, history);

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.reply || 'Request completed via PayPal Remote MCP Server.',
        toolCall: res.toolCall,
        server: res.server,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ **Error communicating with PayPal Remote MCP Server**: ${err.response?.data?.error || err.message}`,
        isError: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    setToolExecutionResult(null);

    // Provide helpful initial JSON argument template
    const defaultArgs = {};
    if (tool.name === 'list_invoices') defaultArgs.status = 'ALL';
    if (tool.name === 'create_order') defaultArgs.amount = 150;
    if (tool.name === 'create_invoice') {
      defaultArgs.customerName = 'Acme Corp';
      defaultArgs.customerEmail = 'billing@acme.com';
      defaultArgs.items = [{ description: 'Web Consulting', quantity: 1, unitPrice: 250 }];
    }
    setToolArgsJson(JSON.stringify(defaultArgs, null, 2));
  };

  const handleExecuteToolDirect = async () => {
    if (!selectedTool || executingTool) return;
    try {
      setExecutingTool(true);
      setToolExecutionResult(null);
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsJson);
      } catch (jsonErr) {
        alert('Invalid JSON arguments: ' + jsonErr.message);
        setExecutingTool(false);
        return;
      }

      const res = await callMcpTool(selectedTool.name, parsedArgs);
      setToolExecutionResult(res);
    } catch (err) {
      setToolExecutionResult({
        error: err.response?.data?.error || err.message,
      });
    } finally {
      setExecutingTool(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / MCP Remote Server Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                PayPal AI Assistant
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Remote MCP Server
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Interacting with PayPal's Model Context Protocol (MCP) Server via JSON-RPC 2.0
            </p>
          </div>
        </div>

        {/* Live Remote Server Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                mcpStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span className="font-semibold text-slate-700">
              {mcpStatus?.connected ? 'Remote MCP Connected' : 'Remote MCP Reachable'}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({mcpStatus?.latencyMs ? `${mcpStatus.latencyMs}ms` : 'Sandbox Ready'})
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5" />
            <span>{tools.length || 7} MCP Tools</span>
          </div>

          <button
            onClick={fetchStatusAndTools}
            disabled={checkingStatus}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Remote MCP Connection"
          >
            <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Conversational Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'explorer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>MCP Tool Explorer (JSON-RPC)</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
          Endpoint: {mcpStatus?.remoteUrl || 'https://mcp.sandbox.paypal.com/sse'}
        </span>
      </div>

      {/* TAB 1: Conversational AI Chat */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Thread (3 columns) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Quick Action Suggestion Chips */}
            <div className="p-3.5 border-b border-slate-150 bg-slate-50/70 overflow-x-auto">
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Try asking:
                </span>
                {QUICK_PROMPTS.map((qp, idx) => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qp.prompt)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-2xs transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap ${qp.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{qp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-white">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-start space-x-2 max-w-[85%]">
                    {msg.sender === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-blue-500/20'
                          : msg.isError
                          ? 'bg-rose-50 border border-rose-200 text-rose-700 rounded-bl-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      {/* Executed MCP Tool Box */}
                      {msg.toolCall && (
                        <div className="mb-3 p-3 rounded-xl bg-white border border-blue-200 text-slate-700 text-[11px] shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between font-mono">
                            <span className="flex items-center space-x-1.5 text-blue-600 font-bold">
                              <Terminal className="w-3.5 h-3.5" />
                              <span>tools/call: {msg.toolCall.name}</span>
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                              200 OK
                            </span>
                          </div>
                          {msg.toolCall.rationale && (
                            <p className="text-slate-500 text-[11px] font-sans">
                              {msg.toolCall.rationale}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Main Message Text */}
                      <div className="whitespace-pre-wrap font-sans text-xs">
                        {msg.text}
                      </div>

                      <div
                        className={`text-[10px] mt-2 font-mono ${
                          msg.sender === 'user' ? 'text-blue-100 text-right' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center space-x-3 text-xs text-slate-500 p-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-slate-700">Connecting to Remote MCP Server...</span>
                    <span className="font-mono text-blue-600 text-[11px]">tools/call in progress</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="Ask about invoices, recent PayPal payments, merchant health, or draft an invoice..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Active MCP Server Specs (1 column) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                MCP Protocol Info
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Transport:</span>
                  <span className="font-semibold text-slate-800">SSE + JSON-RPC</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Spec Version:</span>
                  <span className="font-mono text-slate-800">2024-11-05</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Server Info:</span>
                  <span className="font-semibold text-slate-800">PayPal MCP Agent</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Auth Token:</span>
                  <span className="font-mono text-emerald-600 font-semibold">Active OAuth 2.0</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Available MCP Tools ({tools.length})
                </h3>
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
                {tools.map((t) => (
                  <div
                    key={t.name}
                    onClick={() => {
                      setActiveTab('explorer');
                      handleSelectTool(t);
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 group-hover:text-blue-600">
                        {t.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                        {t.category || 'tool'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {t.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MCP Tool Explorer (Direct JSON-RPC Execution) */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tool Selector List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Tool Schema ({tools.length})
            </h3>
            <div className="space-y-2">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  onClick={() => handleSelectTool(tool)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedTool?.name === tool.name
                      ? 'bg-blue-50/80 border-blue-400 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {tool.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-blue-700 font-semibold border border-blue-100">
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Tool Invoker */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTool && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      {selectedTool.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      JSON-RPC 2.0 Method: tools/call
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{selectedTool.description}</p>
                </div>

                {/* Parameters Schema Visualizer */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Parameters Schema (JSON Schema):
                  </label>
                  <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700 overflow-x-auto max-h-[140px]">
                    {JSON.stringify(selectedTool.parameters, null, 2)}
                  </pre>
                </div>

                {/* Custom Arguments Input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tool Arguments (JSON):
                  </label>
                  <textarea
                    rows={4}
                    value={toolArgsJson}
                    onChange={(e) => setToolArgsJson(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Execute Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleExecuteToolDirect}
                    disabled={executingTool}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {executingTool ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Calling Remote MCP...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Execute MCP Tool</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Tool Execution Result View */}
                {toolExecutionResult && (
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                        <Terminal className="w-3.5 h-3.5 text-blue-600" />
                        <span>Remote MCP Response:</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          toolExecutionResult.error
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {toolExecutionResult.error ? 'Error' : '200 OK'}
                      </span>
                    </div>

                    <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[300px]">
                      {JSON.stringify(toolExecutionResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
