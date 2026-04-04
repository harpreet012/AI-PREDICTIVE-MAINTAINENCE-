import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, X, Minimize2, Maximize2, Trash2, ChevronDown } from 'lucide-react';

const API = '/api';

const AIBotIcon = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
      <linearGradient id="earGrad" x1="0" y1="0" x2="0" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <filter id="eyeGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="botShadow">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.3" />
      </filter>
    </defs>

    {/* Antenna Base */}
    <rect x="46" y="10" width="8" height="15" fill="#cbd5e1" />
    {/* Antenna Bulb */}
    <circle cx="50" cy="10" r="8" fill="url(#earGrad)" filter="url(#eyeGlow)" />

    {/* Ear Knobs */}
    <path d="M12 40 Q5 40 5 45 L5 65 Q5 70 12 70" fill="url(#earGrad)" />
    <path d="M88 40 Q95 40 95 45 L95 65 Q95 70 88 70" fill="url(#earGrad)" />

    {/* Main Head */}
    <rect x="15" y="25" width="70" height="60" rx="28" fill="url(#headGrad)" stroke="#cbd5e1" strokeWidth="1" filter="url(#botShadow)" />

    {/* Face Screen */}
    <rect x="26" y="38" width="48" height="32" rx="14" fill="url(#screenGrad)" stroke="#38bdf8" strokeWidth="1" />

    {/* Eyes */}
    <ellipse cx="38" cy="52" rx="4" ry="6" fill="#38bdf8" filter="url(#eyeGlow)" />
    <ellipse cx="62" cy="52" rx="4" ry="6" fill="#38bdf8" filter="url(#eyeGlow)" />

    {/* Smile */}
    <path d="M44 60 Q50 64 56 60" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" filter="url(#eyeGlow)" />
  </svg>
);

const QUICK_PROMPTS = [
  { label: '🔴 Critical alerts?',      text: 'Any critical machines or alerts right now?' },
  { label: '📊 Fleet health',           text: 'Give me an overview of the fleet health status.' },
  { label: '🔮 Failure predictions',    text: 'Which machines are at highest failure risk this week?' },
  { label: '🔧 Maintenance schedule',   text: 'What maintenance actions should I schedule this week?' },
  { label: '🌡️ Temperature issues',     text: 'Are there any temperature anomalies in the fleet?' },
  { label: '📳 Vibration analysis',     text: 'Analyze vibration levels across all machines.' },
];

function MessageBubble({ msg, index }) {
  const isBot = msg.role === 'assistant';
  // Parse markdown-like bold (**text**)
  const formatText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i} style={{ display: 'block', marginBottom: line === '' ? 6 : 0 }}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} style={{ color: '#f0f6ff', fontWeight: 700 }}>{part}</strong>
              : <span key={j}>{part}</span>
          )}
        </span>
      );
    });
  };

  return (
    <motion.div
      className={`chatbot-msg ${msg.role}`}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {isBot && (
        <div className="chatbot-msg-avatar">
          <AIBotIcon size={16} />
        </div>
      )}
      <div className="chatbot-msg-bubble">
        <div style={{ lineHeight: 1.55, fontSize: 12.5 }}>{formatText(msg.text)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span className="chatbot-msg-time">
            {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.aiEnabled === true && (
            <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
              GPT-4o
            </span>
          )}
          {msg.aiEnabled === false && (
            <span style={{ fontSize: 9, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: 8 }}>
              Rule-based
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatBot() {
  const [open,     setOpen]     = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "👋 Hi! I'm your **AI Maintenance Assistant** powered by GPT-4o.\n\nI have real-time access to your fleet data. Ask me about:\n• Equipment health & critical alerts\n• Failure predictions & risk analysis\n• Maintenance recommendations\n• Sensor anomaly analysis",
      time: new Date(),
      aiEnabled: true,
    }
  ]);
  const [input,   setInput]   = useState('');
  const [typing,  setTyping]  = useState(false);
  const [unread,  setUnread]  = useState(0);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const { token }  = useAuth();

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = useCallback(async (text = input.trim()) => {
    if (!text || typing) return;
    setShowQuick(false);
    const userMsg = { role: 'user', text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const { data } = await axios.post(`${API}/chat`,
        { message: text, context: {} },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const botMsg = {
        role: 'assistant',
        text: data.reply,
        time: new Date(),
        aiEnabled: data.aiEnabled,
        model: data.model,
      };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(n => n + 1);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ Could not connect to AI service. Please make sure the server is running and try again.',
        time: new Date(),
        aiEnabled: false,
      }]);
    } finally {
      setTyping(false);
    }
  }, [input, typing, token, open]);

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: "Chat cleared! How can I help you with your maintenance operations?",
      time: new Date(),
    }]);
    setShowQuick(true);
  };

  const panelWidth  = expanded ? 480 : 370;
  const panelHeight = expanded ? 620 : 500;

  return (
    <div className="chatbot-root">

      {/* ── Floating Action Button ── */}
      <motion.button
        className="chatbot-fab"
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.1, boxShadow: '0 12px 40px rgba(59,130,246,0.6)' }}
        whileTap={{ scale: 0.9 }}
        animate={open ? { rotate: 0 } : { rotate: 0 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <AIBotIcon size={26} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {!open && unread > 0 && (
            <motion.span
              className="chatbot-unread"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            >{unread}</motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring when closed */}
        {!open && (
          <motion.span
            style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.5)', pointerEvents: 'none' }}
            animate={{ scale: [1, 1.4, 1.4], opacity: [0.8, 0, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="chatbot-panel"
            style={{ width: panelWidth, maxHeight: panelHeight }}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-avatar">
                <AIBotIcon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="chatbot-title">AI Maintenance Assistant</div>
                <div className="chatbot-subtitle">
                  <span className="chatbot-online-dot" />
                  GPT-4o · Maintenance Expert
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <motion.button
                  className="chatbot-close"
                  title="Clear chat"
                  onClick={clearChat}
                  whileHover={{ scale: 1.1, color: '#ef4444' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 size={13} />
                </motion.button>
                <motion.button
                  className="chatbot-close"
                  title={expanded ? 'Minimize' : 'Expand'}
                  onClick={() => setExpanded(e => !e)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </motion.button>
                <motion.button
                  className="chatbot-close"
                  onClick={() => setOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={13} />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="chatbot-messages">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} index={i} />
              ))}

              {/* Typing indicator */}
              {typing && (
                <motion.div
                  className="chatbot-msg assistant"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="chatbot-msg-avatar"><AIBotIcon size={16} /></div>
                  <div className="chatbot-msg-bubble chatbot-typing">
                    <span /><span /><span />
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <AnimatePresence>
              {showQuick && (
                <motion.div
                  className="chatbot-quick-prompts"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ fontSize: 10, color: '#4b5e78', fontWeight: 600, width: '100%', marginBottom: 2 }}>QUICK ACTIONS</div>
                  {QUICK_PROMPTS.map(p => (
                    <motion.button
                      key={p.text}
                      className="chatbot-quick-btn"
                      onClick={() => sendMessage(p.text)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      {p.label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle quick prompts */}
            {!showQuick && (
              <button
                style={{ background: 'none', border: 'none', color: '#4b5e78', fontSize: 10, cursor: 'pointer', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setShowQuick(true)}
              >
                <ChevronDown size={10} /> Show quick actions
              </button>
            )}

            {/* Input */}
            <div className="chatbot-input-row">
              <input
                ref={inputRef}
                className="chatbot-input"
                placeholder="Ask about your fleet…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={typing}
              />
              <motion.button
                className="chatbot-send"
                onClick={() => sendMessage()}
                disabled={!input.trim() || typing}
                whileHover={{ scale: 1.08, boxShadow: '0 0 16px rgba(59,130,246,0.5)' }}
                whileTap={{ scale: 0.92 }}
              >
                <Send size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
