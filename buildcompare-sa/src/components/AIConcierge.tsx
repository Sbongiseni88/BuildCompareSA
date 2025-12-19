"use client";

import React, { useState, useRef, useEffect } from 'react';
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
    Maximize2
} from 'lucide-react';
import { ChatMessage } from '@/types';
import { mockChatMessages, generateAIResponse } from '@/data/mockData';

interface AIConciergeProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function AIConcierge({ isOpen, onToggle }: AIConciergeProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

        // Simulate AI thinking
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        const aiResponse = generateAIResponse(inputValue);
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
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
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-lg flex items-center justify-center text-slate-900 hover:scale-110 transition-transform animate-pulse-glow"
            >
                <Bot className="w-7 h-7" />
            </button>
        );
    }

    return (
        <div
            className={`fixed right-0 top-0 h-full z-50 flex flex-col bg-slate-900 border-l border-yellow-500/20 shadow-2xl transition-all duration-300 ${isMinimized ? 'w-16' : 'w-96'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                {!isMinimized && (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                            <Bot className="w-5 h-5 text-slate-900" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">AI Concierge</h3>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs text-green-400">Online</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={onToggle}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

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
                                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                                        <Bot className="w-4 h-4 text-slate-900" />
                                    </div>
                                )}
                                <div
                                    className={
                                        message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                                    }
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    <p className={`text-xs mt-2 opacity-60`}>
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
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-slate-900" />
                                </div>
                                <div className="chat-bubble-ai">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                                        }}
                                        className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-yellow-500/30 transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4 h-4 ${prompt.color}`} />
                                            <span className="text-sm text-slate-300">{prompt.text}</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-yellow-400 transition-colors" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4 border-t border-slate-700 bg-slate-800/30">
                        <div className="flex items-end gap-2">
                            <div className="flex-1 relative">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask about materials, quantities..."
                                    rows={1}
                                    className="input-field resize-none pr-4 min-h-[48px] max-h-32"
                                    style={{ height: 'auto' }}
                                />
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center text-slate-900 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            AI-powered suggestions • Not financial advice
                        </p>
                    </div>
                </>
            )}

            {/* Minimized State */}
            {isMinimized && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-slate-900 hover:scale-110 transition-transform"
                    >
                        <MessageCircle className="w-5 h-5" />
                    </button>
                    {messages.length > 1 && (
                        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-slate-900">
                            {messages.length - 1}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
