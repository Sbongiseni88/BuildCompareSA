"use client";

import React, { useState } from 'react';
import {
    Calculator,
    ArrowRight,
    Building,
    Layers,
    Hammer,
    PaintBucket,
    CheckCircle,
    Loader2,
    FileCheck,
    Plus
} from 'lucide-react';
import { Material } from '@/types';

// Interfaces for the Form
interface SpecForm {
    foundation: string;
    structure: string;
    roofing: string;
    finishing: string;
}

export default function SmartEstimator() {
    const [specs, setSpecs] = useState<SpecForm>({
        foundation: '',
        structure: '',
        roofing: '',
        finishing: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedBoQ, setGeneratedBoQ] = useState<Material[]>([]);
    const [step, setStep] = useState(1);
    const [includeLabor, setIncludeLabor] = useState(false);

    // Simulated AI Logic (Mansion Architect)
    const generateBoQ = async () => {
        setIsGenerating(true);
        // Simulate AI thinking time
        await new Promise(r => setTimeout(r, 2500));

        // Simple rule-based logic to simulate AI reasoning
        const materials: Material[] = [];
        const timestamp = Date.now();

        // Foundation Logic
        if (specs.foundation.toLowerCase().includes('30mpa') || specs.foundation.toLowerCase().includes('concrete')) {
            materials.push({ id: `est-${timestamp}-1`, name: 'PPC Surebuild Cement 42.5N', category: 'cement', quantity: 120, unit: 'bags', brand: 'PPC' });
            materials.push({ id: `est-${timestamp}-2`, name: 'River Sand', category: 'other', quantity: 12, unit: 'm3' });
            materials.push({ id: `est-${timestamp}-3`, name: '19mm Stone', category: 'other', quantity: 10, unit: 'm3' });
        }

        // Structure Logic
        if (specs.structure.toLowerCase().includes('brick') || specs.structure.toLowerCase().includes('double')) {
            materials.push({ id: `est-${timestamp}-4`, name: 'Corobrik Mamore Red Satin', category: 'bricks', quantity: 15000, unit: 'units', brand: 'Corobrik' });
            materials.push({ id: `est-${timestamp}-5`, name: 'Brickforce 150mm', category: 'steel', quantity: 50, unit: 'rolls' });
        }

        // Default items if empty inputs (for demo robustness)
        if (materials.length === 0) {
            materials.push({ id: `est-${timestamp}-def-1`, name: 'General Construction Cement', category: 'cement', quantity: 50, unit: 'bags' });
        }

        // LABOR ESTIMATION LOGIC
        if (includeLabor) {
            materials.push({ id: `est-${timestamp}-lab-1`, name: 'General General Labor', category: 'labor', quantity: 3, unit: 'days' });
            materials.push({ id: `est-${timestamp}-lab-2`, name: 'Skilled Bricklayer', category: 'labor', quantity: 5, unit: 'days' });
        }

        setGeneratedBoQ(materials);
        setIsGenerating(false);
        setStep(2);
    };

    const reset = () => {
        setSpecs({ foundation: '', structure: '', roofing: '', finishing: '' });
        setGeneratedBoQ([]);
        setStep(1);
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    <Calculator className="w-8 h-8 text-yellow-400" />
                    Mansion Architect Smart Estimator
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Enter your engineering specifications (e.g. "30MPa concrete raft foundation", "Double skin brick wall").
                    Our AI interprets SANS 10400 standards to generate a commercial Bill of Quantities.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Input Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 border-l-4 border-l-yellow-500">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-yellow-400" />
                            Technical Specs
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Foundation Layer</label>
                                <textarea
                                    className="input-field text-sm min-h-[80px]"
                                    placeholder="e.g., 30MPa concrete strip footings, 600x230mm..."
                                    value={specs.foundation}
                                    onChange={(e) => setSpecs({ ...specs, foundation: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Structural Skeleton</label>
                                <textarea
                                    className="input-field text-sm min-h-[80px]"
                                    placeholder="e.g., Double skin clay brick, Y12 rebar lintels..."
                                    value={specs.structure}
                                    onChange={(e) => setSpecs({ ...specs, structure: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Roofing Specs</label>
                                <textarea
                                    className="input-field text-sm min-h-[60px]"
                                    placeholder="e.g., Timber trusses, concrete roof tiles..."
                                    value={specs.roofing}
                                    onChange={(e) => setSpecs({ ...specs, roofing: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="labor"
                                    checked={includeLabor}
                                    onChange={(e) => setIncludeLabor(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 text-yellow-500 focus:ring-yellow-500 bg-slate-900"
                                />
                                <label htmlFor="labor" className="text-sm text-slate-300 cursor-pointer">
                                    Include Labor Estimate
                                </label>
                            </div>

                            <button
                                onClick={generateBoQ}
                                disabled={isGenerating}
                                className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
                            >
                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                                {isGenerating ? 'Analyzing Specs...' : 'Generate BoQ'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Output Area */}
                <div className="lg:col-span-2">
                    {step === 1 && !isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center p-12 glass-card border border-dashed border-slate-700">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse-glow">
                                <Building className="w-10 h-10 text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-500 mb-2">Ready to Estimate</h3>
                            <p className="text-slate-600 text-center max-w-md">
                                Fill in the technical specifications on the left to generate a comprehensive material list needed for your project.
                            </p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center p-12 glass-card">
                            <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mb-6" />
                            <h3 className="text-xl font-bold text-white mb-2">Analyzing SANS 10400 Standards...</h3>
                            <div className="w-64 space-y-2">
                                <div className="flex items-center gap-3 text-sm text-slate-400 animate-pulse">
                                    <CheckCircle className="w-4 h-4 text-green-500" /> Verifying Structural Load
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-400 animate-pulse" style={{ animationDelay: '0.5s' }}>
                                    <CheckCircle className="w-4 h-4 text-green-500" /> Calculating Material Volumes
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-400 animate-pulse" style={{ animationDelay: '1s' }}>
                                    <CheckCircle className="w-4 h-4 text-green-500" /> Matching Retail Stock Codes
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && !isGenerating && (
                        <div className="glass-card overflow-hidden animate-slide-up">
                            <div className="p-6 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <FileCheck className="w-6 h-6 text-green-400" />
                                        Generated Bill of Quantities
                                    </h3>
                                    <p className="text-sm text-slate-400">Based on engineering inputs provided</p>
                                </div>
                                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-500/20">
                                    AI CONFIDENCE: 94%
                                </span>
                            </div>

                            <div className="p-0">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Material Item</th>
                                            <th>Category</th>
                                            <th>Est. Quantity</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generatedBoQ.map((item) => (
                                            <tr key={item.id}>
                                                <td className="font-medium text-white">{item.name}</td>
                                                <td className="text-slate-400 text-sm">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${item.category === 'labor' ? 'bg-blue-500/20 text-blue-400' :
                                                            item.category === 'cement' ? 'bg-gray-500/20 text-gray-300' : 'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {item.category?.toUpperCase() || 'GENERAL'}
                                                    </span>
                                                </td>
                                                <td className="font-mono text-yellow-400">{item.quantity} {item.unit}</td>
                                                <td>
                                                    <button className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-700 hover:bg-yellow-500 hover:text-slate-900 rounded-lg transition-colors text-slate-300 font-medium">
                                                        <Plus className="w-3 h-3" /> Add
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                                <button onClick={reset} className="text-sm text-slate-400 hover:text-white px-4 py-2">
                                    Discard & Start Over
                                </button>
                                <button className="btn-primary flex items-center gap-2 px-6 py-2 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Approve & Price Check
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
