"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, X, Camera } from 'lucide-react';
import { Material } from '@/types';

interface VisualSearchProps {
    onMaterialsExtracted: (materials: Material[]) => void;
}

interface ProcessingStep {
    id: number;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
}

const initialSteps: ProcessingStep[] = [
    { id: 1, label: 'Uploading file securely...', status: 'pending' },
    { id: 2, label: 'AI Visual Analysis (Gemini)...', status: 'pending' },
    { id: 3, label: 'Extracting Materials & Quantities...', status: 'pending' },
    { id: 4, label: 'Finding Best Suppliers...', status: 'pending' },
];

export default function VisualSearch({ onMaterialsExtracted }: VisualSearchProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps);
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setFile(file);
        setIsProcessing(true);
        setErrorMessage(null); // Clear previous errors
        setProgress(0);
        setSteps(initialSteps);

        // Create format data for API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);

        try {
            // Step 1: Uploading
            setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'active' } : s));
            setProgress(10);

            // Simulate upload time only slightly
            await new Promise(r => setTimeout(r, 800));

            setSteps(prev => prev.map((s, i) =>
                i === 0 ? { ...s, status: 'completed' } :
                    i === 1 ? { ...s, status: 'active' } : s
            ));
            setProgress(40);

            // Step 2: Analyzing (The Real API Call)
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Analysis failed on server');
            }

            setSteps(prev => prev.map((s, i) =>
                i === 1 ? { ...s, status: 'completed' } :
                    i === 2 ? { ...s, status: 'active' } : s
            ));
            setProgress(70);

            // Step 3: Extracting Data
            await new Promise(r => setTimeout(r, 600)); // Small UX pause

            setSteps(prev => prev.map((s, i) =>
                i === 2 ? { ...s, status: 'completed' } :
                    i === 3 ? { ...s, status: 'active' } : s
            ));
            setProgress(90);

            // Finalize
            await new Promise(r => setTimeout(r, 500));
            setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
            setProgress(100);

            if (data.materials) {
                onMaterialsExtracted(data.materials);
            }

        } catch (error: any) {
            console.error('Error analyzing file:', error);
            setErrorMessage(error.message || "An unknown error occurred");
            // Fallback
            setSteps(prev => prev.map(s => ({ ...s, status: 'error' })));
        } finally {
            setIsProcessing(false);
        }
    }, [onMaterialsExtracted]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
            'application/pdf': ['.pdf']
        },
        maxFiles: 1
    });

    const resetUpload = () => {
        setFile(null);
        setErrorMessage(null);
        setIsProcessing(false);
        setSteps(initialSteps);
        setProgress(0);
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {!file ? (
                <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 cursor-pointer ${isDragActive
                        ? 'border-yellow-400 bg-yellow-500/10 scale-102'
                        : 'border-slate-700 hover:border-yellow-500/50 hover:bg-slate-800/50'
                        }`}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg mb-4 group">
                            <Upload className={`w-10 h-10 text-yellow-400 transition-transform duration-500 ${isDragActive ? 'animate-bounce' : ''}`} />
                        </div>

                        <h3 className="text-2xl font-bold text-white">
                            {isDragActive ? 'Drop it here!' : 'Drag & drop your files'}
                        </h3>
                        <p className="text-slate-400 max-w-md">
                            Upload photos of materials or handwritten Bill of Quantities
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
                            <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Images</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                            <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> PDF</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full" />
                            <span className="flex items-center gap-1"><Upload className="w-4 h-4" /> Photos</span>
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
                <div className="glass-card p-8 animate-fade-in relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full">
                        <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <button
                        onClick={resetUpload}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 relative">
                            {file.type.includes('image') ? (
                                <ImageIcon className="w-8 h-8 text-yellow-400" />
                            ) : (
                                <FileText className="w-8 h-8 text-blue-400" />
                            )}
                            {isProcessing && (
                                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-800">
                                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <h3 className="text-xl font-semibold text-white">{file.name}</h3>
                        <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>

                    <div className="space-y-4 max-w-md mx-auto">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${step.status === 'active' ? 'bg-slate-800/50 scale-105 border border-yellow-500/30' :
                                    step.status === 'completed' ? 'opacity-50' : 'opacity-30'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                    step.status === 'active' ? 'bg-yellow-500/20 text-yellow-400' :
                                        step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                            'bg-slate-800 text-slate-600'
                                    }`}>
                                    {step.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                                        step.status === 'active' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                            step.status === 'error' ? <AlertCircle className="w-5 h-5" /> :
                                                <span className="text-xs font-bold">{step.id}</span>}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-medium ${step.status === 'active' ? 'text-white' :
                                        step.status === 'error' ? 'text-red-400' : 'text-slate-300'
                                        }`}>
                                        {step.label}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {errorMessage && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 animate-slide-up">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{errorMessage}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tips Section */}
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
                            <li>• Take clear photos of material labels or packaging</li>
                            <li>• For handwritten BoQs, ensure text is legible</li>
                            <li>• Include quantities in your documents for accurate pricing</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
