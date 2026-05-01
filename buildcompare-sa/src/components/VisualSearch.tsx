"use client";

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload,
    FileText,
    Image as ImageIcon,
    Loader2,
    CheckCircle,
    AlertCircle,
    X,
    Camera,
    Clock,
    Package,
    Hammer,
    Search,
    Zap,
    BarChart3,
} from 'lucide-react';
import { Material } from '@/types';

interface VisualSearchProps {
    onMaterialsExtracted: (materials: Material[]) => void;
}

// ── Stage Definitions ─────────────────────────────────────────────────
interface ProcessingStage {
    id: string;
    label: string;
    icon: React.ReactNode;
    status: 'pending' | 'active' | 'completed' | 'error';
    detail?: string;
}

const INITIAL_STAGES: ProcessingStage[] = [
    { id: 'upload',       label: 'Uploading document',                icon: <Upload className="w-4 h-4" />,    status: 'pending' },
    { id: 'extract',      label: 'Extracting data from file',        icon: <FileText className="w-4 h-4" />,  status: 'pending' },
    { id: 'analyze',      label: 'Analyzing BOQ items',              icon: <Search className="w-4 h-4" />,    status: 'pending' },
    { id: 'deduplicate',  label: 'Deduplicating materials',          icon: <Zap className="w-4 h-4" />,       status: 'pending' },
    { id: 'pricing',      label: 'Searching for material prices',    icon: <BarChart3 className="w-4 h-4" />, status: 'pending' },
    { id: 'labour',       label: 'Calculating labour costs',         icon: <Hammer className="w-4 h-4" />,    status: 'pending' },
    { id: 'complete',     label: 'Finalizing results',               icon: <CheckCircle className="w-4 h-4" />, status: 'pending' },
];

// ── Progress Event from backend ─────────────────────────────────────────
interface ProgressEvent {
    stage: string;
    progress: number;
    message: string;
    totalItems?: number;
    processedItems?: number;
    estimatedTimeRemaining?: number;
    partialResults?: { name: string; price: number; store: string }[];
    error?: string;
    materials?: Material[];
}

export default function VisualSearch({ onMaterialsExtracted }: VisualSearchProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stages, setStages] = useState<ProcessingStage[]>(INITIAL_STAGES);
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [totalItems, setTotalItems] = useState(0);
    const [processedItems, setProcessedItems] = useState(0);
    const [eta, setEta] = useState<number | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [partialResults, setPartialResults] = useState<{ name: string; price: number; store: string }[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    const updateStage = (stageId: string, detail?: string) => {
        setStages(prev => prev.map(s => {
            if (s.id === stageId) return { ...s, status: 'active', detail };
            if (s.id === 'complete' && stageId === 'complete') return { ...s, status: 'completed', detail };
            // Mark all earlier stages as completed
            const order = INITIAL_STAGES.map(st => st.id);
            const currentIdx = order.indexOf(stageId);
            const thisIdx = order.indexOf(s.id);
            if (thisIdx < currentIdx && s.status !== 'error') return { ...s, status: 'completed' };
            return s;
        }));
    };

    const handleDrop = useCallback(async (acceptedFiles: File[]) => {
        const uploadedFile = acceptedFiles[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsProcessing(true);
        setErrorMessage(null);
        setProgress(0);
        setTotalItems(0);
        setProcessedItems(0);
        setEta(null);
        setPartialResults([]);
        setStatusMessage('Starting...');
        setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'pending', detail: undefined })));

        // Route ALL uploads (Images, PDFs, Excel) to the Vercel-hosted /api/analyze endpoint
        await handleFileUpload(uploadedFile);
        return;
    }, [onMaterialsExtracted]);

    const handleProgressEvent = (event: ProgressEvent) => {
        setProgress(event.progress);
        setStatusMessage(event.message);

        if (event.totalItems !== undefined) setTotalItems(event.totalItems);
        if (event.processedItems !== undefined) setProcessedItems(event.processedItems);
        if (event.estimatedTimeRemaining !== undefined) setEta(event.estimatedTimeRemaining);

        if (event.partialResults && event.partialResults.length > 0) {
            setPartialResults(prev => {
                const newResults = [...prev, ...event.partialResults!];
                // Keep only latest 50 to avoid memory issues
                return newResults.slice(-50);
            });
        }

        if (event.stage === 'error') {
            setErrorMessage(event.message);
            setStages(prev => prev.map(s =>
                s.status === 'active' ? { ...s, status: 'error' } : s
            ));
            setIsProcessing(false);
            return;
        }

        if (event.stage === 'complete') {
            updateStage('complete', event.message);
            if (event.materials && event.materials.length > 0) {
                onMaterialsExtracted(event.materials);
            }
            return;
        }

        updateStage(event.stage, event.message);
    };

    // Process file via Vercel-hosted /api/analyze endpoint
    const handleFileUpload = async (uploadFile: File) => {
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('fileName', uploadFile.name);

        const simpleStages: ProcessingStage[] = [
            { id: 'upload', label: 'Uploading file', icon: <Upload className="w-4 h-4" />, status: 'active' },
            { id: 'analyze', label: 'AI Document Analysis', icon: <Search className="w-4 h-4" />, status: 'pending' },
            { id: 'complete', label: 'Finalizing', icon: <CheckCircle className="w-4 h-4" />, status: 'pending' },
        ];
        setStages(simpleStages);
        setProgress(15);

        try {
            setStages(prev => prev.map(s =>
                s.id === 'upload' ? { ...s, status: 'completed' } :
                s.id === 'analyze' ? { ...s, status: 'active' } : s
            ));
            setProgress(40);
            setStatusMessage('AI is analyzing your document...');

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Analysis failed');

            setStages(prev => prev.map(s => ({ ...s, status: 'completed' })));
            setProgress(100);
            setStatusMessage(`Found ${data.materials?.length || 0} items.`);

            if (data.materials) {
                onMaterialsExtracted(data.materials);
            }
        } catch (error: any) {
            setErrorMessage(error.message);
            setStages(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
        } finally {
            setIsProcessing(false);
        }
    };

    const cancelProcessing = () => {
        abortControllerRef.current?.abort();
        setIsProcessing(false);
        resetUpload();
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        },
        maxFiles: 1,
        disabled: isProcessing,
    });

    const resetUpload = () => {
        setFile(null);
        setErrorMessage(null);
        setIsProcessing(false);
        setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'pending', detail: undefined })));
        setProgress(0);
        setTotalItems(0);
        setProcessedItems(0);
        setEta(null);
        setPartialResults([]);
        setStatusMessage('');
    };

    const formatEta = (seconds: number): string => {
        if (seconds < 5) return 'almost done';
        if (seconds < 60) return `~${seconds}s remaining`;
        return `~${Math.ceil(seconds / 60)}m remaining`;
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {!file ? (
                /* ─── Dropzone ─────────────────────────────────────────── */
                <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 cursor-pointer ${isDragActive
                        ? 'border-yellow-400 bg-yellow-500/10 scale-102'
                        : 'border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800/50'
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                            <Upload className={`w-10 h-10 text-yellow-400 transition-transform duration-500 ${isDragActive ? 'animate-bounce' : ''}`} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">
                            {isDragActive ? 'Drop your BoQ here!' : 'Upload BoQ or Material List'}
                        </h3>
                        <p className="text-slate-400 max-w-md">
                            Drag & drop your Bill of Quantities (PDF, Excel) or site photos for instant pricing with live progress tracking.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-4 flex-wrap justify-center">
                            <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> PDF / Excel</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                            <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Images</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                            <span className="flex items-center gap-1"><Upload className="w-4 h-4" /> CSV</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full justify-center">
                            <button className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20 hover:scale-105">
                                Browse Files
                            </button>
                            <label className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-105 border border-slate-700">
                                <Camera className="w-5 h-5" />
                                Take Photo
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            handleDrop([e.target.files[0]]);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── Processing View ──────────────────────────────────── */
                <div className="glass-card p-8 animate-fade-in relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 h-1.5 bg-slate-800 w-full">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Close / Cancel */}
                    <button
                        onClick={isProcessing ? cancelProcessing : resetUpload}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                        title={isProcessing ? 'Cancel processing' : 'Close'}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* File Header */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-3 relative">
                            {file.type.startsWith('image') ? (
                                <ImageIcon className="w-8 h-8 text-yellow-400" />
                            ) : (
                                <FileText className="w-8 h-8 text-blue-400" />
                            )}
                            {isProcessing && (
                                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-800">
                                    <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                                </div>
                            )}
                        </div>
                        <h3 className="text-lg font-semibold text-white">{file.name}</h3>
                        <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>

                    {/* Main Status Message */}
                    <div className="text-center mb-6">
                        <p className="text-white font-medium text-lg">{statusMessage || 'Processing your BOQ document...'}</p>

                        {/* Item Counter */}
                        {totalItems > 0 && (
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5 text-sm">
                                    <Package className="w-4 h-4 text-yellow-400" />
                                    <span className="text-slate-300 font-medium">
                                        {processedItems > 0
                                            ? <>{processedItems} <span className="text-slate-500">of</span> {totalItems} items</>
                                            : <>{totalItems} items detected</>
                                        }
                                    </span>
                                </div>
                                {eta !== null && eta > 0 && (
                                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{formatEta(eta)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Progress Percentage */}
                        <div className="mt-3 flex items-center justify-center gap-2">
                            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-xs font-bold text-yellow-400 w-10">{progress}%</span>
                        </div>
                    </div>

                    {/* Stages List */}
                    <div className="space-y-2 max-w-md mx-auto mb-6">
                        {stages.map((stage) => (
                            <div
                                key={stage.id}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                                    stage.status === 'active'
                                        ? 'bg-yellow-500/5 border border-yellow-500/20 scale-[1.02]'
                                        : stage.status === 'completed'
                                        ? 'opacity-50'
                                        : stage.status === 'error'
                                        ? 'bg-red-500/5 border border-red-500/20'
                                        : 'opacity-25'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                                    stage.status === 'completed' ? 'bg-green-500/20 text-green-400'
                                    : stage.status === 'active' ? 'bg-yellow-500/20 text-yellow-400'
                                    : stage.status === 'error' ? 'bg-red-500/20 text-red-400'
                                    : 'bg-slate-800 text-slate-600'
                                }`}>
                                    {stage.status === 'completed' ? <CheckCircle className="w-4 h-4" />
                                    : stage.status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : stage.status === 'error' ? <AlertCircle className="w-4 h-4" />
                                    : stage.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${
                                        stage.status === 'active' ? 'text-white'
                                        : stage.status === 'error' ? 'text-red-400'
                                        : 'text-slate-400'
                                    }`}>
                                        {stage.label}
                                    </p>
                                    {stage.detail && stage.status === 'active' && (
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{stage.detail}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Partial Results */}
                    {partialResults.length > 0 && (
                        <div className="mt-4 border-t border-slate-800 pt-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Prices found so far ({partialResults.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {partialResults.slice(-10).map((r, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs">
                                        <span className="text-slate-300 truncate max-w-[55%]">{r.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-yellow-400 font-bold">R{r.price.toFixed(2)}</span>
                                            <span className="text-slate-600 truncate max-w-[60px]">{r.store}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {errorMessage && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-400 animate-slide-up">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">{errorMessage}</p>
                                <button
                                    onClick={resetUpload}
                                    className="mt-2 text-xs text-red-300 underline hover:text-white transition-colors"
                                >
                                    Try again with a different file
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tips */}
            {!file && (
                <div className="mt-8 flex flex-col md:flex-row gap-6 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-yellow-400 font-semibold mb-2">Tips for best results:</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li>• Excel files with clear headers (Description, Qty, Unit) process fastest</li>
                            <li>• PDF BoQs from Word/Google Docs work well — scanned images may not</li>
                            <li>• Large BoQs (100+ items) show live progress as they process</li>
                            <li>• Include quantities in your documents for accurate pricing</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
