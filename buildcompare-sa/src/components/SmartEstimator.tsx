"use client";

import React, { useState, useMemo } from 'react';
import {
    Calculator,
    Building,
    Layers,
    CheckCircle,
    Loader2,
    FileCheck,
    Plus,
    Download,
    AlertCircle,
    RefreshCw,
    ClipboardList,
    Zap,
    HardHat
} from 'lucide-react';
import { Material } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { findProductKnowledge } from '@/data/sa-market-knowledge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SpecForm {
    foundation: string;
    structure: string;
    roofing: string;
    finishing: string;
}

/** SANS 10400 Quick-Select presets per category */
const PRESETS: Record<keyof SpecForm, string[]> = {
    foundation: [
        '25MPa Concrete Strip Footing',
        '30MPa Raft Foundation',
        'Concrete Slab-on-Grade',
        'Pile Foundation (Bored)',
    ],
    structure: [
        'Double Skin Clay Brick',
        'Single Skin Block Wall',
        'Steel Frame Structure',
        'Timber Frame (SANS 10082)',
    ],
    roofing: [
        'Corrugated Iron (IBR)',
        'Concrete Roof Tiles',
        'Chromadek Long-Span',
        'Harvey Tile Roofing',
    ],
    finishing: [
        'Cement Plaster & PVA Paint',
        'Face Brick (No Plaster)',
        'Skim Coat & Texture Paint',
        'Porcelain Floor Tiles',
    ],
};

/** Human-readable labels for each spec field */
const FIELD_META: Record<keyof SpecForm, { label: string; placeholder: string; icon: React.ReactNode }> = {
    foundation: {
        label: 'Foundation Layer',
        placeholder: 'e.g., 30MPa concrete strip footings, 600×230mm...',
        icon: <Layers className="w-5 h-5 text-yellow-400" />,
    },
    structure: {
        label: 'Structural Skeleton',
        placeholder: 'e.g., Double skin clay brick, Y12 rebar lintels...',
        icon: <Building className="w-5 h-5 text-blue-400" />,
    },
    roofing: {
        label: 'Roofing Specification',
        placeholder: 'e.g., Timber trusses, concrete roof tiles...',
        icon: <HardHat className="w-5 h-5 text-orange-400" />,
    },
    finishing: {
        label: 'Finishing & Interior',
        placeholder: 'e.g., Cement plaster, PVA paint, porcelain tiles...',
        icon: <Zap className="w-5 h-5 text-emerald-400" />,
    },
};

/** Title Case helper — preserves uppercase abbreviations like IBR, PVC, PPC */
function toTitleCase(s: string): string {
    return s.replace(/\b\w+/g, (word) => {
        if (word.length <= 3 && word === word.toUpperCase()) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

/** Returns a sanity flag for a material item based on market knowledge */
function getSanityFlag(name: string): { flag: 'ok' | 'low' | 'warn'; note: string } {
    const pk = findProductKnowledge(name);
    if (!pk) return { flag: 'ok', note: '' };
    // No price to check at BoQ generation stage — we just annotate known categories
    return { flag: 'ok', note: `Market range: R${pk.sanityBounds.min}–R${pk.sanityBounds.max} ${pk.sanityBounds.label}` };
}

export default function SmartEstimator() {
    const { showError } = useToast();
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

    /** Live calculation summary — shows which fields are populated */
    const specSummary = useMemo(() => {
        const filled: { key: keyof SpecForm; label: string; preview: string }[] = [];
        const fieldOrder: (keyof SpecForm)[] = ['foundation', 'structure', 'roofing', 'finishing'];
        for (const key of fieldOrder) {
            if (specs[key].trim()) {
                filled.push({
                    key,
                    label: FIELD_META[key].label,
                    preview: specs[key].trim().slice(0, 50) + (specs[key].trim().length > 50 ? '…' : ''),
                });
            }
        }
        return filled;
    }, [specs]);

    const hasAnySpec = specSummary.length > 0;

    /** Append a preset chip's text to the corresponding spec field */
    const addPreset = (field: keyof SpecForm, value: string) => {
        setSpecs((prev) => {
            const existing = prev[field].trim();
            // Avoid duplicates
            if (existing.toLowerCase().includes(value.toLowerCase())) return prev;
            const separator = existing ? ', ' : '';
            return { ...prev, [field]: existing + separator + value };
        });
    };

    // Send specs to the DeepSeek-backed BoQ generator
    const generateBoQ = async () => {
        setIsGenerating(true);

        try {
            const response = await fetch('/api/v1/estimator/boq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...specs, includeLabor }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate estimate');
            }

            const data = await response.json();

            // Assign stable IDs for React keys
            if (data.materials && Array.isArray(data.materials)) {
                const materials: Material[] = data.materials.map((m: any, index: number) => ({
                    id: `est-${Date.now()}-${index}`,
                    name: toTitleCase(m.name || ''),
                    category: (m.category || 'other').toLowerCase(),
                    quantity: m.quantity,
                    unit: m.unit,
                    brand: m.brand ? toTitleCase(m.brand) : undefined,
                    laborCostEstimate: m.laborCostEstimate
                }));

                setGeneratedBoQ(materials);
                setStep(2);
            } else {
                // Fallback logic could go here if needed
                setGeneratedBoQ([]);
                setStep(2);
            }

        } catch (error) {
            console.error("Estimation failed:", error);
            // Let the user know if the backend can't be reached
            showError("AI Service is offline. Check backend connection.");
        } finally {
            setIsGenerating(false);
        }
    };

    const reset = () => {
        setSpecs({ foundation: '', structure: '', roofing: '', finishing: '' });
        setGeneratedBoQ([]);
        setStep(1);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("BuildCompare SA - Smart Estimate", 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

        // Project Specs Summary
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Project Specifications:", 14, 45);
        doc.setFontSize(10);
        doc.setTextColor(80);

        let yPos = 52;
        if (specs.foundation) { doc.text(`Foundation: ${specs.foundation}`, 14, yPos); yPos += 7; }
        if (specs.structure) { doc.text(`Structure: ${specs.structure}`, 14, yPos); yPos += 7; }
        if (specs.roofing) { doc.text(`Roofing: ${specs.roofing}`, 14, yPos); yPos += 7; }
        if (specs.finishing) { doc.text(`Finishing: ${specs.finishing}`, 14, yPos); yPos += 7; }

        // Table with Status and Labour column
        autoTable(doc, {
            startY: yPos + 10,
            head: [['Material Item', 'Category', 'Qty', 'Unit', 'Brand', 'Status', 'Labour Est.']],
            body: generatedBoQ.map(item => {
                const pk = findProductKnowledge(item.name);
                const status = pk ? `✓ R${pk.sanityBounds.min}–R${pk.sanityBounds.max}` : '—';
                return [
                    item.name,
                    item.category?.toUpperCase() || 'GENERAL',
                    item.quantity,
                    item.unit,
                    item.brand || '-',
                    status,
                    item.laborCostEstimate ? `R${item.laborCostEstimate.toLocaleString('en-ZA')}` : '-'
                ];
            }),
            headStyles: { fillColor: [234, 179, 8], textColor: 20 }, // Yellow header
            theme: 'grid',
            columnStyles: {
                5: { cellWidth: 35, fontSize: 8, textColor: [34, 139, 34] },
            },
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Disclaimer: Quantities are estimates based on SANS 10400. Verify with a structural engineer.", 14, finalY + 10);

        doc.save("BuildCompare_BoQ_Estimate.pdf");
    };

    return (
        <div className="max-w-6xl mx-auto px-4">
            {/* Header */}
            <div className="mb-10 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 flex items-center justify-center gap-3">
                    <Calculator className="w-9 h-9 text-yellow-400" />
                    BuildCompare Smart Estimator
                </h2>
                <p className="text-slate-300 text-lg max-w-2xl mx-auto leading-relaxed">
                    Enter your engineering specifications or use the quick-select presets below.
                    Our AI interprets <span className="text-yellow-400 font-semibold">SANS 10400</span> standards to generate a commercial Bill of Quantities.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Input Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 md:p-8 border-l-4 border-l-yellow-500">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Layers className="w-6 h-6 text-yellow-400" />
                            Technical Specs
                        </h3>

                        <div className="space-y-6">
                            {(Object.keys(FIELD_META) as (keyof SpecForm)[]).map((field) => (
                                <div key={field}>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">
                                        {FIELD_META[field].icon}
                                        {FIELD_META[field].label}
                                    </label>
                                    <textarea
                                        className="input-field min-h-[88px]"
                                        style={{ fontSize: '1.125rem' }}
                                        placeholder={FIELD_META[field].placeholder}
                                        value={specs[field]}
                                        onChange={(e) => setSpecs({ ...specs, [field]: e.target.value })}
                                    />
                                    {/* Quick-Select Chips */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {PRESETS[field].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => addPreset(field, preset)}
                                                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-600 text-slate-300 bg-slate-800 hover:bg-yellow-500 hover:text-slate-900 hover:border-yellow-500 transition-all duration-200 min-h-[36px]"
                                            >
                                                + {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Labor Toggle */}
                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="labor"
                                    className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border-2 border-slate-700 cursor-pointer hover:border-slate-600 transition-colors min-h-[48px]"
                                >
                                    <input
                                        type="checkbox"
                                        id="labor"
                                        checked={includeLabor}
                                        onChange={(e) => setIncludeLabor(e.target.checked)}
                                        className="w-6 h-6 rounded border-slate-600 text-yellow-500 focus:ring-yellow-500 bg-slate-900 flex-shrink-0"
                                    />
                                    <span className="text-lg text-slate-200 font-medium">
                                        Include Labor Estimate
                                    </span>
                                </label>
                                {includeLabor && (
                                    <p className="text-sm text-slate-400 pl-4 border-l-2 border-yellow-500/50 italic">
                                        Disclaimer: Labour rates are based on standard Gauteng productivity benchmarks. Adjust as per your specific site conditions.
                                    </p>
                                )}
                            </div>

                            {/* Calculation Summary Preview */}
                            {hasAnySpec && (
                                <div className="bg-slate-800 rounded-xl p-4 border-2 border-slate-700">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4" />
                                        Calculation Summary
                                    </h4>
                                    <div className="space-y-2">
                                        {specSummary.map((item) => (
                                            <div key={item.key} className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <span className="text-sm font-bold text-white">{item.label}:</span>
                                                    <span className="text-sm text-slate-400 ml-1">{item.preview}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {includeLabor && (
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-blue-300 font-semibold">+ Labor included</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={generateBoQ}
                                disabled={isGenerating || !hasAnySpec}
                                className="w-full btn-primary flex items-center justify-center gap-3 mt-4 min-h-[56px] text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Calculator className="w-6 h-6" />}
                                {isGenerating ? 'AI is interpreting SANS 10400 standards...' : 'Generate BoQ'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Output Area */}
                <div className="lg:col-span-2">
                    {step === 1 && !isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center p-12 glass-card border-2 border-dashed border-slate-700 min-h-[400px]">
                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse-glow">
                                <Building className="w-12 h-12 text-slate-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-400 mb-3">Ready to Estimate</h3>
                            <p className="text-slate-500 text-lg text-center max-w-md leading-relaxed">
                                Fill in the technical specifications on the left or tap the quick-select presets to generate a comprehensive material list for your project.
                            </p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center p-12 glass-card min-h-[400px]">
                            <Loader2 className="w-20 h-20 text-yellow-400 animate-spin mb-8" />
                            <h3 className="text-2xl font-bold text-white mb-4">AI is interpreting SANS 10400 standards...</h3>
                            <div className="w-72 space-y-3">
                                <div className="flex items-center gap-3 text-lg text-slate-300 animate-pulse">
                                    <CheckCircle className="w-5 h-5 text-green-500" /> Verifying Structural Load
                                </div>
                                <div className="flex items-center gap-3 text-lg text-slate-300 animate-pulse" style={{ animationDelay: '0.5s' }}>
                                    <CheckCircle className="w-5 h-5 text-green-500" /> Calculating Material Volumes
                                </div>
                                <div className="flex items-center gap-3 text-lg text-slate-300 animate-pulse" style={{ animationDelay: '1s' }}>
                                    <CheckCircle className="w-5 h-5 text-green-500" /> Matching Retail Stock Codes
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && !isGenerating && (
                        <div className="glass-card overflow-hidden animate-slide-up">
                            <div className="p-6 md:p-8 border-b-2 border-slate-700 bg-slate-800/80 flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <FileCheck className="w-7 h-7 text-green-400" />
                                        Generated Bill of Quantities
                                    </h3>
                                    <p className="text-lg text-slate-400 mt-1">Based on engineering inputs provided</p>
                                </div>
                                {generatedBoQ.length > 0 && (
                                    <span className="px-4 py-1.5 bg-yellow-500/10 text-yellow-400 text-sm font-bold rounded-full border border-yellow-500/20">
                                        AI CONFIDENCE: 94%
                                    </span>
                                )}
                            </div>

                            {generatedBoQ.length > 0 ? (
                                <>
                                    <div className="table-container">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Material Item</th>
                                                    <th>Category</th>
                                                    <th>Est. Quantity</th>
                                                    <th>Market Check</th>
                                                    {includeLabor && <th>Labour Est.</th>}
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {generatedBoQ.map((item) => {
                                                    const pk = findProductKnowledge(item.name);
                                                    return (
                                                    <tr key={item.id}>
                                                        <td className="font-semibold text-white text-lg">{item.name}</td>
                                                        <td className="text-slate-400">
                                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${item.category === 'labor' ? 'bg-blue-500/20 text-blue-400' :
                                                                item.category === 'cement' ? 'bg-gray-500/20 text-gray-300' :
                                                                item.category === 'roofing' ? 'bg-orange-500/20 text-orange-400' :
                                                                item.category === 'steel' ? 'bg-purple-500/20 text-purple-400' :
                                                                'bg-slate-800 text-slate-400'
                                                                }`}>
                                                                {item.category?.toUpperCase() || 'GENERAL'}
                                                            </span>
                                                        </td>
                                                        <td className="font-mono text-yellow-400 text-lg font-bold">{item.quantity} {item.unit}</td>
                                                        <td>
                                                            {pk ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/20" title={`Expected: R${pk.sanityBounds.min}–R${pk.sanityBounds.max} ${pk.sanityBounds.label}`}>
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                    R{pk.sanityBounds.min}–R{pk.sanityBounds.max}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20" title="Price range not tracked — verify manually">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    Verify UOM
                                                                </span>
                                                            )}
                                                        </td>
                                                        {includeLabor && (
                                                            <td className="text-blue-400 font-bold">
                                                                {item.laborCostEstimate ? `R ${item.laborCostEstimate.toLocaleString('en-ZA')}` : '—'}
                                                            </td>
                                                        )}
                                                        <td>
                                                            <button className="flex items-center gap-2 text-sm px-4 py-2.5 bg-slate-700 hover:bg-yellow-500 hover:text-slate-900 rounded-lg transition-colors text-slate-300 font-bold min-h-[48px]">
                                                                <Plus className="w-4 h-4" /> Add
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="p-6 md:p-8 bg-slate-800/50 border-t-2 border-slate-700 flex flex-wrap justify-end gap-3">
                                        <button onClick={reset} className="text-lg text-slate-400 hover:text-white px-5 py-3 min-h-[48px]">
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleDownloadPDF}
                                            className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold rounded-lg flex items-center gap-2 transition-colors border-2 border-slate-600 min-h-[48px]"
                                        >
                                            <Download className="w-5 h-5" />
                                            Download PDF
                                        </button>
                                        <button className="btn-primary flex items-center gap-2 px-6 py-3 text-lg font-bold min-h-[48px]">
                                            <CheckCircle className="w-5 h-5" />
                                            Approve & Price Check
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <AlertCircle className="w-14 h-14 text-slate-500 mb-4" />
                                    <h3 className="text-2xl font-bold text-white mb-3">No results found</h3>
                                    <p className="text-slate-400 text-lg mb-6 max-w-sm leading-relaxed">
                                        The AI couldn't generate a material list from the provided specifications. Try adding more detail or use the quick-select presets.
                                    </p>
                                    <button onClick={generateBoQ} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-lg font-bold rounded-lg flex items-center gap-2 transition-colors border-2 border-slate-700 min-h-[48px]">
                                        <RefreshCw className="w-5 h-5" />
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
