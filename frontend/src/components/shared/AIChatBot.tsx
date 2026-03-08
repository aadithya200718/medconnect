import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp: string;
}

export default function AIChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            content: "Hello! I'm MedConnect AI Assistant. I can help you with general health questions, medication information, and understanding your prescriptions. How can I help you today?",
            timestamp: new Date().toISOString()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await api.post('/ai/chat', {
                message: userMessage.content,
                history: messages.map(m => ({ role: m.role, content: m.content }))
            });

            const botMessage: ChatMessage = {
                role: 'model',
                content: response.data.data?.response || 'Sorry, I could not process your request.',
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'model',
                content: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating Chat Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white'
                        }}
                    >
                        <MessageCircle size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        style={{
                            background: '#1e1e2e',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-4 py-3"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white'
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Bot size={20} />
                                <div>
                                    <h3 className="font-semibold text-sm">MedConnect AI</h3>
                                    <p className="text-xs opacity-80">Health Assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: msg.role === 'user'
                                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                                : 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                        }}
                                    >
                                        {msg.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="white" />}
                                    </div>
                                    <div
                                        className="max-w-[75%] rounded-xl px-3 py-2 text-sm"
                                        style={{
                                            background: msg.role === 'user'
                                                ? 'rgba(16, 185, 129, 0.15)'
                                                : 'rgba(99, 102, 241, 0.15)',
                                            color: '#e0e0e0',
                                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                                            borderBottomLeftRadius: msg.role === 'user' ? '12px' : '4px'
                                        }}
                                    >
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-2">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                    >
                                        <Bot size={14} color="white" />
                                    </div>
                                    <div
                                        className="rounded-xl px-4 py-3 flex items-center gap-2"
                                        style={{ background: 'rgba(99, 102, 241, 0.15)' }}
                                    >
                                        <Loader2 size={14} className="animate-spin" style={{ color: '#8b5cf6' }} />
                                        <span className="text-xs" style={{ color: '#a0a0b0' }}>Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Ask a health question..."
                                    className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        color: '#e0e0e0',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isLoading}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                                    style={{
                                        background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)',
                                        color: input.trim() ? 'white' : '#666',
                                        opacity: isLoading ? 0.5 : 1
                                    }}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <p className="text-center mt-2 text-xs" style={{ color: '#666' }}>
                                Not a substitute for medical advice
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
