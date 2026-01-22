"use client";

import React, { useState } from 'react';
import {
    MessageSquare,
    X,
    Send,
    Star,
    Loader2,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const { user } = useAuthContext();
    const supabase = createClient();

    const [rating, setRating] = useState<number>(0);
    const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'praise' | 'other'>('suggestion');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating && !message) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: submitError } = await supabase
                .from('feedback')
                .insert([{
                    user_id: user?.id || null,
                    user_email: user?.email || 'anonymous',
                    rating,
                    type: feedbackType,
                    message,
                    metadata: {
                        screen_width: window.innerWidth,
                        user_agent: navigator.userAgent,
                        platform: navigator.platform
                    }
                }]);

            if (submitError) throw submitError;

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                // Reset form after closing
                setTimeout(() => {
                    setIsSuccess(false);
                    setRating(0);
                    setFeedbackType('suggestion');
                    setMessage('');
                }, 300);
            }, 2000);

        } catch (err: any) {
            console.error('Feedback submission error:', err);
            setError('Failed to send feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-md p-6 animate-slide-up shadow-2xl border-yellow-500/30">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-yellow-400/20">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Share Feedback</h2>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Help us build better for SA</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isSuccess ? (
                    <div className="py-12 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                        <p className="text-slate-400">Your feedback helps BuildCompare grow. We've received it safely.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Rating */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wide">Overall Rating</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Star
                                            className={`w-8 h-8 ${star <= rating
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-slate-700 hover:text-slate-500'
                                                } transition-colors`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Feedback Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wide">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['suggestion', 'bug', 'praise', 'other'] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setFeedbackType(type)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border ${feedbackType === type
                                                ? 'bg-yellow-400 text-slate-900 border-yellow-400 shadow-lg shadow-yellow-400/10'
                                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wide">Your Comments</label>
                            <textarea
                                required
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="What's on your mind? Suggestions, missing suppliers, or things you love..."
                                className="input-field min-h-[120px] text-sm resize-none leading-relaxed"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium animate-shake">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || (!rating && !message.trim())}
                            className="w-full btn-primary flex items-center justify-center gap-2 h-12 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Submit Feedback</span>
                                </>
                            )}
                        </button>

                        <p className="text-[10px] text-center text-slate-500 leading-relaxed">
                            Your feedback is strictly confidential and used only to improve BuildCompare SA.
                            If reporting a bug, we may collect basic hardware info to help fix it.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
