"use client";

import React, { useState, useEffect } from 'react';
import {
    X,
    Search,
    FolderOpen,
    Bot,
    Camera,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    ChevronRight,
} from 'lucide-react';

interface OnboardingTourProps {
    onComplete: () => void;
    onNavigate: (tab: string) => void;
}

const steps = [
    {
        icon: Sparkles,
        title: 'Welcome to BuildCompare SA! 🏗️',
        description:
            "South Africa's smartest construction materials price comparison platform. Let's take a quick tour so you can start saving on every project.",
        tip: 'This tour takes about 30 seconds',
        color: 'from-yellow-400 to-orange-500',
    },
    {
        icon: Search,
        title: 'Search & Compare Prices',
        description:
            'Search for any building material and instantly compare prices across Builders Warehouse, Leroy Merlin, Cashbuild, and local yards. Use GPS to find the closest deals.',
        tip: 'Try searching: "50kg Cement" or "Face Brick"',
        color: 'from-blue-400 to-blue-600',
        tabLink: 'compare',
    },
    {
        icon: FolderOpen,
        title: 'Manage Your Projects',
        description:
            'Create project folders for each site, track budgets, add materials and monitor spending. All your data is saved to the cloud.',
        tip: 'Start with your current job site!',
        color: 'from-green-400 to-emerald-600',
        tabLink: 'projects',
    },
    {
        icon: Camera,
        title: 'Upload Your BoQ',
        description:
            'Snap a photo of your Bill of Quantities or upload a PDF/Excel file. Our AI extracts the materials and generates a full price comparison automatically.',
        tip: 'Supports handwritten lists too!',
        color: 'from-purple-400 to-purple-600',
        tabLink: 'compare',
    },
    {
        icon: Bot,
        title: 'AI Concierge — Your Assistant',
        description:
            "Got a question? Ask the AI Concierge anything — material quantities, alternative products, cost estimates. It's like having an expert on call 24/7.",
        tip: 'Try: "How many bricks for a 10m wall?"',
        color: 'from-pink-400 to-pink-600',
    },
];

export default function OnboardingTour({ onComplete, onNavigate }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;

    const handleNext = () => {
        if (isLast) {
            handleClose();
        } else {
            setSlideDirection('right');
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirst) {
            setSlideDirection('left');
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleClose = () => {
        setIsExiting(true);
        // Save that user has seen onboarding
        try {
            localStorage.setItem('buildcompare_onboarding_complete', 'true');
        } catch {
            // ignore
        }
        setTimeout(() => {
            onComplete();
        }, 300);
    };

    const handleGoToFeature = (tab: string) => {
        handleClose();
        setTimeout(() => onNavigate(tab), 350);
    };

    const Icon = step.icon;

    return (
        <div className={`fixed inset-0 z-[90] flex items-center justify-center p-4 transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

            {/* Card */}
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-slate-800">
                    <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Skip button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-8 pt-6 space-y-6" key={currentStep}>
                    {/* Step counter */}
                    <div className="flex items-center gap-2">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep
                                        ? 'w-8 bg-yellow-400'
                                        : i < currentStep
                                            ? 'w-4 bg-yellow-400/40'
                                            : 'w-4 bg-slate-700'
                                    }`}
                            />
                        ))}
                        <span className="ml-auto text-xs text-slate-500 font-medium">
                            {currentStep + 1} of {steps.length}
                        </span>
                    </div>

                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg animate-fade-in`}>
                        <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Text */}
                    <div className="space-y-3 animate-fade-in">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {step.title}
                        </h2>
                        <p className="text-slate-400 leading-relaxed">
                            {step.description}
                        </p>
                    </div>

                    {/* Tip box */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-300 font-medium">{step.tip}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={handlePrev}
                            disabled={isFirst}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isFirst
                                    ? 'text-slate-600 cursor-not-allowed'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>

                        <div className="flex items-center gap-2">
                            {step.tabLink && (
                                <button
                                    onClick={() => handleGoToFeature(step.tabLink!)}
                                    className="px-4 py-2.5 text-sm font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-xl transition-all flex items-center gap-1"
                                >
                                    Try it <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl text-sm transition-all shadow-lg shadow-yellow-400/20 flex items-center gap-2 hover:scale-105"
                            >
                                {isLast ? "Let's Go!" : 'Next'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
