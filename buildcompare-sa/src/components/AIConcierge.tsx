import React, { useState, useEffect, useRef } from 'react';
import {
    Bot,
    Send,
    X,
    Sparkles,
    MessageCircle,
    Lightbulb,
    AlertTriangle,
    ArrowRight,
    Minimize2,
    Maximize2,
    Mic,
    MicOff
} from 'lucide-react';
import { ChatMessage } from '@/types';
import { generateAIResponse } from '@/data/mockData';
import { useToast } from '@/contexts/ToastContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIConciergeProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function AIConcierge({ isOpen, onToggle }: AIConciergeProps) {
    const { showWarning } = useToast();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Howzit! 👋 I\'m your BuildCompare AI assistant. Ask me about material prices, quantity estimates, SANS 10400 regulations, or anything construction-related in South Africa.',
            timestamp: new Date(),
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Voice Recognition Setup
    const startVoiceRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showWarning('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-ZA'; // South African English
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognition.start();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: inputValue,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            // Build conversation history for the API (exclude the welcome message)
            const history = [...messages, userMessage]
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: inputValue,
                    history: history.slice(0, -1), // Exclude current message (sent separately)
                }),
            });

            if (!response.ok) throw new Error('API request failed');
            if (!response.body) throw new Error('No response body');

            // Create placeholder for AI message
            const aiMessageId = `ai-${Date.now()}`;
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
            }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                aiContent += chunk;

                setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                        ? { ...msg, content: aiContent }
                        : msg
                ));
            }

        } catch (error) {
            console.log("Using Offline AI Mode (Fallback)");
            // Fallback to robust mock data (Offline Mode)
            await new Promise(resolve => setTimeout(resolve, 1000)); // Extra thinking time for mock
            const aiResponse = generateAIResponse(inputValue);
            setMessages(prev => [...prev, aiResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const quickPrompts = [
        { icon: Lightbulb, text: 'What cement do I need?', color: 'text-yellow-400' },
        { icon: AlertTriangle, text: 'Brick quantities for a 10m wall', color: 'text-orange-400' },
        { icon: Sparkles, text: 'Best prices on steel rebar', color: 'text-blue-400' },
    ];

    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-2xl shadow-yellow-500/20 flex items-center justify-center text-slate-900 hover:scale-110 hover:-translate-y-1 transition-all hover:shadow-yellow-500/40 group overflow-hidden animate-pulse-glow"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
                <Bot className="w-8 h-8 relative z-10" />
                <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-slate-900 rounded-full animate-bounce"></div>
            </button>
        );
    }

    return (
        <div
            className={`fixed right-0 top-0 h-full z-50 flex flex-col bg-slate-900/85 backdrop-blur-3xl shadow-2xl transition-all duration-500 ease-in-out ${isMinimized
                ? 'w-20 shadow-none border-l border-transparent bg-transparent backdrop-blur-none pointer-events-none'
                : 'w-full md:w-[450px] shadow-black/80 border-l border-slate-700/50'
                }`}
        >
            {/* Header */}
            {!isMinimized && (
                <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-b from-slate-800/80 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-400 blur-md opacity-40 rounded-full animate-pulse-glow" />
                            <div className="relative w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg border border-yellow-300/30">
                                <Bot className="w-6 h-6 text-slate-900 drop-shadow-sm" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-white tracking-tight">AI Concierge</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-bold tracking-widest uppercase text-green-400">Online & Ready</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all bg-slate-800/50 border border-transparent hover:border-slate-600"
                            title="Minimize"
                        >
                            <Minimize2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onToggle}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all bg-slate-800/50 border border-transparent hover:border-red-500/30"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`animate-slide-up ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 shadow-md border border-yellow-300/30">
                                        <Bot className="w-4 h-4 text-slate-900" />
                                    </div>
                                )}
                                <div
                                    className={`relative p-5 rounded-3xl shadow-lg max-w-[85%] transition-all ${
                                        message.role === 'user' 
                                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900 rounded-tr-sm ml-auto border border-yellow-300/50' 
                                            : 'bg-slate-800/80 backdrop-blur-md border border-slate-700/80 text-slate-100 rounded-tl-sm shadow-black/40 hover:border-yellow-500/30'
                                    }`}
                                >
                                    <div className={`text-[15px] leading-relaxed ${message.role === 'user' ? 'font-semibold' : 'prose-sm'}`}>
                                        {message.role === 'user' ? (
                                            <span className="whitespace-pre-wrap">{message.content}</span>
                                        ) : (
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3 space-y-1.5" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3 space-y-1.5" {...props} />,
                                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                    strong: ({node, ...props}) => <strong className="font-bold text-yellow-500" {...props} />,
                                                    h3: ({node, ...props}) => <h3 className="text-[16px] font-black tracking-tight text-white mt-4 mb-2" {...props} />
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                    <p className={`text-[10px] mt-3 font-bold tracking-widest uppercase ${message.role === 'user' ? 'text-slate-800/70 text-right' : 'text-slate-500'}`}>
                                        {message.timestamp.toLocaleTimeString('en-ZA', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex items-center gap-3 mt-2 animate-fade-in pl-1">
                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-md border border-yellow-300/30">
                                    <Bot className="w-4 h-4 text-slate-900 animate-pulse" />
                                </div>
                                <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 p-4 rounded-3xl rounded-tl-sm shadow-lg max-w-[85%]">
                                    <div className="flex items-center gap-1.5 h-1.5">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts */}
                    {messages.length <= 1 && (
                        <div className="px-4 pb-4 space-y-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Quick Questions</p>
                            {quickPrompts.map((prompt, index) => {
                                const Icon = prompt.icon;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setInputValue(prompt.text);
                                            // Optional: automatically send when quick prompt is clicked
                                            // setTimeout(handleSendMessage, 100);
                                        }}
                                        className="w-full flex items-center justify-between p-3.5 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 hover:border-yellow-500/50 transition-all duration-300 group text-left hover:shadow-lg hover:-translate-y-0.5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-slate-900/80 group-hover:bg-slate-900 transition-colors ${prompt.color} shadow-inner`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-[14px] font-medium text-slate-300 group-hover:text-white transition-colors">{prompt.text}</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                                            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-yellow-400" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-5 border-t border-slate-700/50 bg-slate-900/90 backdrop-blur-3xl pb-8 md:pb-6">
                        <div className="flex items-end gap-2.5">
                            <div className="flex-1 relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message..."
                                    rows={1}
                                    className="w-full bg-slate-800/50 hover:bg-slate-800 focus:bg-slate-800 text-white placeholder-slate-500 border border-slate-700 focus:border-yellow-500/50 rounded-2xl px-5 py-3.5 pr-4 min-h-[52px] max-h-32 outline-none resize-none transition-all shadow-inner font-medium text-[15px]"
                                    style={{ height: 'auto' }}
                                />
                            </div>
                            {/* Voice Input Button */}
                            <button
                                onClick={startVoiceRecognition}
                                disabled={isListening || isTyping}
                                className={`w-14 h-[52px] rounded-2xl flex items-center justify-center transition-all border shadow-lg ${isListening
                                    ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse-glow hover:bg-red-500 hover:text-white'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                                    } disabled:opacity-50 active:scale-95`}
                                title={isListening ? 'Listening...' : 'Start voice input'}
                            >
                                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                            {/* Send Button */}
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                className="w-14 h-[52px] bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center text-slate-900 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Send className="w-6 h-6 ml-1" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-4 text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                            <Sparkles className="w-3 h-3 text-yellow-500/70" />
                            <span>AI-powered • Voice enabled</span>
                            <Sparkles className="w-3 h-3 text-yellow-500/70" />
                        </div>
                    </div>
                </>
            )}

            {/* Minimized State Floating Button */}
            {isMinimized && (
                <div className="flex-1 flex flex-col items-center justify-end pb-24 pr-4 md:pb-6 pointer-events-auto">
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="relative w-[3.5rem] h-[3.5rem] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 hover:border-yellow-500/50 rounded-2xl flex items-center justify-center text-yellow-400 hover:scale-110 transition-all shadow-2xl group animate-bounce"
                    >
                        <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-[3px] border-slate-900 animate-pulse"></div>
                    </button>
                </div>
            )}
        </div>
    );
}
