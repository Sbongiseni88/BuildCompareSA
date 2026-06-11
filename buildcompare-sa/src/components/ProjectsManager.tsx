"use client";

import React, { useState, useCallback, useMemo } from 'react';
import {
    FolderOpen,
    Plus,
    Search,
    MapPin,
    Clock,
    MoreHorizontal,
    Edit2,
    Trash2,
    Archive,
    Download,
    ChevronRight,
    Package,

    X,
    Check,
    Loader2,
    Calculator,
    Zap,
} from 'lucide-react';
import { Project } from '@/types';
import { exportProjectToPDF } from '@/lib/pdfExport';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ConfirmDialog from '@/components/ConfirmDialog';


interface ProjectsManagerProps {
    onNavigateToCompare?: () => void;
    onNavigateToEstimator?: () => void;
}

export default function ProjectsManager({
    onNavigateToCompare,
    onNavigateToEstimator,
}: ProjectsManagerProps) {
    const { user, loading: authLoading } = useAuthContext();
    const { showSuccess, showError, showWarning } = useToast();
    const supabaseRef = React.useRef(createClient());
    const supabase = supabaseRef.current;

    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    const [searchQuery, setSearchQuery] = useState(() => {
        try { return sessionStorage.getItem('bc_projects_search') || ''; } catch { return ''; }
    });
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'on-hold'>(() => {
        try { return (sessionStorage.getItem('bc_projects_filter') as any) || 'all'; } catch { return 'all'; }
    });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showMenu, setShowMenu] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // New project form state
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectLocation, setNewProjectLocation] = useState('');
    const [newProjectBudget, setNewProjectBudget] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Add Material State
    const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
    const [newMaterialName, setNewMaterialName] = useState('');
    const [newMaterialQuantity, setNewMaterialQuantity] = useState('');
    const [newMaterialUnit, setNewMaterialUnit] = useState('units');
    const [newMaterialCategory, setNewMaterialCategory] = useState('other');
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);

    // Swipe-to-dismiss state for modals
    const [swipeOffset, setSwipeOffset] = useState(0);
    const swipeStartY = React.useRef(0);
    const isSwiping = React.useRef(false);

    // Persist search/filter
    React.useEffect(() => {
        try { sessionStorage.setItem('bc_projects_search', searchQuery); } catch { }
    }, [searchQuery]);
    React.useEffect(() => {
        try { sessionStorage.setItem('bc_projects_filter', filterStatus); } catch { }
    }, [filterStatus]);

    // Fetch Projects from Supabase
    const fetchProjects = async () => {
        if (!user?.id) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoading(true);
        setFetchError(null);

        const timer = setTimeout(() => {
            abortController.abort(new Error("Connection timed out. Please check your internet."));
        }, 6000);

        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    project_materials (*)
                `)
                .order('created_at', { ascending: false })
                .abortSignal(abortController.signal);

            clearTimeout(timer);
            if (error) throw error;

            // Map DB response to Frontend Types
            const mappedProjects: Project[] = (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                location: p.location || '',
                createdAt: new Date(p.created_at),
                totalBudget: Number(p.total_budget),
                spent: Number(p.spent),
                status: p.status as any,
                materials: (p.project_materials || []).map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    brand: m.brand,
                    category: m.category,
                    quantity: Number(m.quantity),
                    unit: m.unit
                }))
            }));

            setProjects(mappedProjects);
        } catch (error: any) {
            clearTimeout(timer);
            if (error.name !== 'AbortError') {
                console.error('Error fetching projects:', error);
            }
            if (projects.length === 0) {
                setFetchError(error.message || 'Failed to load projects');
            }
        } finally {
            clearTimeout(timer);
            setIsLoading(false);
        }
    };

    // Initial Fetch
    React.useEffect(() => {
        if (authLoading) return;

        if (user?.id) {
            fetchProjects();
        } else {
            // If no user (e.g. during auth load), empty list
            setProjects([]);
            setIsLoading(false);
        }

        // Hard failsafe — release the spinner no matter what after 9 s so the
        // Projects Hub can never appear permanently stalled.
        const hardFailsafe = setTimeout(() => {
            setIsLoading(false);
        }, 9000);

        return () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            clearTimeout(hardFailsafe);
        };
    }, [user?.id, authLoading]);

    const filteredProjects = useMemo(() => projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
        return matchesSearch && matchesFilter;
    }), [projects, searchQuery, filterStatus]);

    const formatCurrency = useCallback((value: number) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    }, []);

    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'active': return 'badge-success';
            case 'completed': return 'badge-info';
            case 'on-hold': return 'badge-warning';
            default: return 'badge-info';
        }
    }, []);

    const handleCreateProject = async () => {
        if (!newProjectName || !newProjectLocation || !newProjectBudget) return;
        if (!user) {
            showWarning("You must be logged in to create a project.");
            return;
        }

        // Optimistic: add placeholder immediately
        const tempId = `_pending_${Date.now()}`;
        const placeholderProject: Project & { _pending?: boolean } = {
            id: tempId,
            name: newProjectName,
            location: newProjectLocation,
            createdAt: new Date(),
            totalBudget: parseFloat(newProjectBudget),
            spent: 0,
            status: 'active',
            materials: [],
            _pending: true,
        };

        // Save form values for rollback
        const savedName = newProjectName;
        const savedLocation = newProjectLocation;
        const savedBudget = newProjectBudget;

        setProjects(prev => [placeholderProject, ...prev]);
        setShowCreateModal(false);
        setNewProjectName('');
        setNewProjectLocation('');
        setNewProjectBudget('');

        try {
            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    user_id: user.id,
                    name: savedName,
                    location: savedLocation,
                    total_budget: parseFloat(savedBudget),
                    status: 'active',
                    spent: 0
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Replace placeholder with real data
                setProjects(prev => prev.map(p =>
                    p.id === tempId ? {
                        id: data.id,
                        name: data.name,
                        location: data.location,
                        createdAt: new Date(data.created_at),
                        totalBudget: Number(data.total_budget),
                        spent: Number(data.spent),
                        status: data.status,
                        materials: []
                    } : p
                ));
                showSuccess('Project created!');
            }
        } catch (error: any) {
            // Rollback: remove placeholder, re-open modal with saved values
            setProjects(prev => prev.filter(p => p.id !== tempId));
            setNewProjectName(savedName);
            setNewProjectLocation(savedLocation);
            setNewProjectBudget(savedBudget);
            setShowCreateModal(true);
            showError(`Failed to create project: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDeleteProject = async (id: string) => {
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProjects(projects.filter(p => p.id !== id));
            setShowMenu(null);
            setDeleteConfirmId(null);
            if (selectedProject?.id === id) setSelectedProject(null);
        } catch (error) {
            console.error('Error deleting project:', error);
            showError('Failed to delete project.');
        }
    };

    const handleAddMaterial = async () => {
        if (!selectedProject || !newMaterialName || !newMaterialQuantity || !user) return;

        setIsAddingMaterial(true);
        try {
            const payload = {
                project_id: selectedProject.id,
                name: newMaterialName,
                quantity: parseFloat(newMaterialQuantity),
                unit: newMaterialUnit,
                category: newMaterialCategory,
                estimated_price: 0 // Default
            };

            const { data, error } = await supabase
                .from('project_materials')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Update local state
                const updatedMaterials = [...selectedProject.materials, {
                    id: data.id,
                    name: data.name,
                    quantity: Number(data.quantity),
                    unit: data.unit,
                    category: data.category,
                    brand: data.brand
                }];

                const updatedProject = { ...selectedProject, materials: updatedMaterials };
                setSelectedProject(updatedProject);
                setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));

                // Reset form
                setShowAddMaterialModal(false);
                setNewMaterialName('');
                setNewMaterialQuantity('');
            }
        } catch (error: any) {
            console.error('Error adding material:', error);
            showError(`Failed to add material: ${error.message}`);
        } finally {
            setIsAddingMaterial(false);
        }
    };

    const stats = useMemo(() => ({
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        totalBudget: projects.reduce((acc, p) => acc + p.totalBudget, 0),
        totalSpent: projects.reduce((acc, p) => acc + p.spent, 0),
    }), [projects]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Project Folders</h1>
                    <p className="text-slate-300 text-lg mt-1">Manage your construction projects and track material costs</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2 min-h-[48px] text-lg font-bold"
                >
                    <Plus className="w-5 h-5" />
                    New Project
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">Total Projects</p>
                    <p className="text-3xl font-extrabold text-white mt-1">{stats.total}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">Active</p>
                    <p className="text-3xl font-extrabold text-green-400 mt-1">{stats.active}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Budget</p>
                    <p className="text-2xl font-extrabold text-yellow-400 mt-1">{formatCurrency(stats.totalBudget)}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Spent</p>
                    <p className="text-2xl font-extrabold text-white mt-1">{formatCurrency(stats.totalSpent)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search projects..."
                            className="input-field pl-12 h-12"
                        />
                    </div>

                    {/* Status Filter — full-width grid on mobile so each pill is an
                        easy ≥44px tap target, inline row from sm: up. */}
                    <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-2">
                        {(['all', 'active', 'completed', 'on-hold'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`flex items-center justify-center h-11 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filterStatus === status
                                    ? 'bg-yellow-500 text-slate-900'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading State – Accessible message instead of silent skeleton */}
    {(authLoading || (isLoading && projects.length === 0 && !fetchError)) && (
        <div className="glass-card p-12 text-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-2xl font-bold text-white">Loading Your Projects...</h2>
                <p className="text-lg text-slate-300">Fetching your job folders from the cloud.</p>
            </div>
        </div>
    )}

    {/* Error State */}
    {!isLoading && fetchError && (
        <div className="p-10 bg-slate-900/50 border border-red-500/30 rounded-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connection Issue</h3>
            <p className="text-slate-400 mb-6 text-sm max-w-sm mx-auto">
                {fetchError}
            </p>
            <button onClick={fetchProjects} className="btn-primary">
                Try Again
            </button>
        </div>
    )}

            {/* Projects Grid */}
            {!authLoading && (projects.length > 0 || !isLoading) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project, index) => {
                        const progressPercent = (project.spent / project.totalBudget) * 100;
                        const isOverBudget = progressPercent > 100;

                        return (
                            <div
                                key={project.id}
                                className={`glass-card group hover:border-yellow-500/30 transition-all cursor-pointer relative overflow-hidden ${isOverBudget ? 'animate-shake border-red-500/50 shadow-red-900/20' : ''} ${(project as any)._pending ? 'animate-pulse border-yellow-500/30' : ''
                                    }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => setSelectedProject(project)}
                            >
                                {/* Folder Tab */}
                                <div className="flex items-center">
                                    <div className="bg-yellow-500/20 px-5 py-2 rounded-b-none rounded-t-xl border-b-0 border border-yellow-500/20">
                                        <FolderOpen className="w-5 h-5 text-yellow-400 inline-block mr-2" />
                                        <span className={`text-sm font-bold px-3 py-1.5 rounded-full min-h-[36px] inline-flex items-center ${
                                            project.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            project.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                            'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                        }`}>
                                            {(project as any)._pending ? 'Saving...' : project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('-', ' ')}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 pt-4">
                                    {/* Menu Button */}
                                    <div className="absolute top-4 right-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(showMenu === project.id ? null : project.id);
                                            }}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showMenu === project.id && (
                                            <div className="absolute right-0 top-full mt-1 w-48 glass-card rounded-xl shadow-2xl overflow-hidden z-10 animate-slide-up">
                                                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-sm text-left min-h-[48px]">
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit Project
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-sm text-left min-h-[48px]">
                                                    <Archive className="w-4 h-4" />
                                                    Archive
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        exportProjectToPDF(project);
                                                        setShowMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-sm text-left min-h-[48px]"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Save Report
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirmId(project.id);
                                                        setShowMenu(null);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm text-left border-t border-slate-700 min-h-[48px]"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Project Info */}
                                    <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors mb-2 pr-10">
                                        {project.name}
                                    </h3>

                                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {project.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(project.createdAt).toLocaleDateString('en-ZA', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>

                                    {/* Budget Progress */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-slate-400 font-semibold">Budget</span>
                                            <span className={`font-bold text-lg ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                                                {formatCurrency(project.spent)} / {formatCurrency(project.totalBudget)}
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${Math.min(progressPercent, 100)}%`,
                                                    background: isOverBudget
                                                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                                        : progressPercent > 80
                                                            ? 'linear-gradient(90deg, #f97316, #ea580c)'
                                                            : 'linear-gradient(90deg, #facc15, #eab308)'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Quick View: Last 3 Materials */}
                                    <div className="pt-4 border-t border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-400 font-semibold">
                                                <Package className="w-4 h-4" />
                                                {project.materials.length} materials
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-yellow-400 transition-colors" />
                                        </div>
                                        {project.materials.length > 0 && (
                                            <div className="space-y-1">
                                                {project.materials.slice(-3).map((m) => (
                                                    <div key={m.id} className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-400 truncate max-w-[70%]">{m.name}</span>
                                                        <span className="text-yellow-400 font-mono font-semibold">{m.quantity} {m.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Project Card */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="glass-card p-5 border-2 border-dashed border-slate-600 hover:border-yellow-500/50 flex flex-col items-center justify-center gap-4 min-h-[280px] group transition-all"
                    >
                        <div className="w-16 h-16 bg-slate-800 group-hover:bg-yellow-500/20 rounded-2xl flex items-center justify-center transition-colors">
                            <Plus className="w-8 h-8 text-slate-500 group-hover:text-yellow-400 transition-colors" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-slate-400 group-hover:text-white transition-colors">Create New Project</p>
                            <p className="text-sm text-slate-500">Start tracking a new construction site</p>
                        </div>
                    </button>
                </div>
            )}

            {/* Empty State – Quick Start for 40+ */}
            {!isLoading && !fetchError && filteredProjects.length === 0 && (
                <div className="glass-card p-16 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-float">
                        <FolderOpen className="w-12 h-12 text-yellow-500" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white mb-3">
                        {searchQuery ? 'No Matching Job Folders' : 'No Job Folders Yet'}
                    </h3>
                    <p className="text-slate-300 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                        {searchQuery
                            ? 'Try adjusting your search or filters to find what you\'re looking for.'
                            : 'Get started by creating your first project folder, or generate a Bill of Quantities with the Smart Estimator.'}
                    </p>
                    {!searchQuery && (
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn-primary flex items-center gap-2 min-h-[56px] text-lg font-bold px-8"
                            >
                                <Plus className="w-5 h-5" />
                                Create Your First Folder
                            </button>
                            {onNavigateToEstimator && (
                                <button
                                    onClick={onNavigateToEstimator}
                                    className="btn-secondary flex items-center gap-2 min-h-[56px] text-lg font-bold px-8"
                                >
                                    <Zap className="w-5 h-5" />
                                    Quick Start: Estimate a BoQ
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-md p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">Create New Project</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Project Name *</label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="e.g., Sandton Mall Renovation"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Site Delivery Destination *</label>
                                <input
                                    type="text"
                                    value={newProjectLocation}
                                    onChange={(e) => setNewProjectLocation(e.target.value)}
                                    placeholder="e.g., Springs, Welkom, Sandton"
                                    className="input-field"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    The town/suburb materials must be delivered to — used to prioritise
                                    nearby stores and estimate the landed site cost.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Total Budget (ZAR) *</label>
                                <input
                                    type="number"
                                    value={newProjectBudget}
                                    onChange={(e) => setNewProjectBudget(e.target.value)}
                                    placeholder="e.g., 2500000"
                                    className="input-field"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newProjectName || !newProjectLocation || !newProjectBudget || isCreating}
                                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Detail — full-screen on mobile, centered modal on desktop */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-4 bg-black/60 md:backdrop-blur-sm animate-fade-in">
                    <div
                        className="bg-slate-900 md:glass-card w-full h-full md:h-auto md:max-w-2xl p-6 animate-slide-up md:max-h-[80vh] overflow-y-auto md:rounded-2xl transition-transform"
                        style={{ transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined, opacity: swipeOffset > 0 ? Math.max(0.4, 1 - swipeOffset / 300) : 1 }}
                        onTouchStart={(e) => {
                            swipeStartY.current = e.touches[0].clientY;
                            isSwiping.current = true;
                        }}
                        onTouchMove={(e) => {
                            if (!isSwiping.current) return;
                            const target = e.currentTarget;
                            if (target.scrollTop > 0) { setSwipeOffset(0); return; }
                            const diff = e.touches[0].clientY - swipeStartY.current;
                            if (diff > 0) setSwipeOffset(diff * 0.6);
                        }}
                        onTouchEnd={() => {
                            isSwiping.current = false;
                            if (swipeOffset > 120) {
                                setSelectedProject(null);
                            }
                            setSwipeOffset(0);
                        }}
                    >
                        {/* Swipe indicator (mobile only) */}
                        <div className="md:hidden flex justify-center mb-4">
                            <div className="w-10 h-1 rounded-full bg-slate-600" />
                        </div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
                                    <FolderOpen className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">{selectedProject.name}</h2>
                                    <p className="text-sm text-slate-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {selectedProject.location}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Project Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">Budget</p>
                                <p className="text-xl font-bold text-yellow-400 mt-1">
                                    {formatCurrency(selectedProject.totalBudget)}
                                </p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">Spent</p>
                                <p className="text-xl font-bold text-white mt-1">
                                    {formatCurrency(selectedProject.spent)}
                                </p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                <p className="text-xs text-slate-400 uppercase">Remaining</p>
                                <p className={`text-xl font-bold mt-1 ${selectedProject.totalBudget - selectedProject.spent < 0 ? 'text-red-400' : 'text-green-400'
                                    }`}>
                                    {formatCurrency(selectedProject.totalBudget - selectedProject.spent)}
                                </p>
                            </div>
                        </div>

                        {/* Materials List */}
                        <div>
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-yellow-400" />
                                Materials ({selectedProject.materials.length})
                            </h3>

                            {selectedProject.materials.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedProject.materials.map((material) => (
                                        <div
                                            key={material.id}
                                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                                                <span className="text-white">{material.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-slate-400">
                                                    {material.quantity} {material.unit}
                                                </span>
                                                <span className="badge badge-info">{material.category}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-800/30 rounded-xl">
                                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No materials added yet</p>
                                    <button
                                        onClick={() => setShowAddMaterialModal(true)}
                                        className="btn-secondary mt-4"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Materials
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700">
                            <button
                                onClick={() => {
                                    if (onNavigateToCompare) onNavigateToCompare();
                                }}
                                className="btn-primary flex-1 flex items-center justify-center gap-2 min-h-[48px]"
                            >
                                <Package className="w-4 h-4" />
                                Compare Prices
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Material Modal */}
            {showAddMaterialModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-sm p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white">Add Material</h3>
                            <button onClick={() => setShowAddMaterialModal(false)} className="p-1 hover:bg-slate-700 rounded">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Material Name (e.g. Cement)"
                                className="input-field"
                                value={newMaterialName}
                                onChange={e => setNewMaterialName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    className="input-field w-1/2"
                                    value={newMaterialQuantity}
                                    onChange={e => setNewMaterialQuantity(e.target.value)}
                                />
                                <select
                                    className="input-field w-1/2 bg-slate-900"
                                    value={newMaterialUnit}
                                    onChange={e => setNewMaterialUnit(e.target.value)}
                                >
                                    <option value="units">units</option>
                                    <option value="bags">bags</option>
                                    <option value="m">meters</option>
                                    <option value="m2">m²</option>
                                    <option value="m3">m³</option>
                                    <option value="liters">liters</option>
                                </select>
                            </div>
                            <select
                                className="input-field bg-slate-900"
                                value={newMaterialCategory}
                                onChange={e => setNewMaterialCategory(e.target.value)}
                            >
                                <option value="other">Other</option>
                                <option value="cement">Cement</option>
                                <option value="bricks">Bricks</option>
                                <option value="steel">Steel</option>
                                <option value="timber">Timber</option>
                                <option value="paint">Paint</option>
                            </select>

                            <button
                                onClick={handleAddMaterial}
                                disabled={!newMaterialName || !newMaterialQuantity || isAddingMaterial}
                                className="btn-primary w-full mt-2 flex justify-center items-center gap-2"
                            >
                                {isAddingMaterial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={() => {
                    if (deleteConfirmId) handleDeleteProject(deleteConfirmId);
                }}
                title="Delete Project"
                message="Are you sure you want to delete this project and all its materials? This action cannot be undone."
                confirmLabel="Delete Project"
                cancelLabel="Keep It"
                variant="danger"
            />
        </div>
    );
}
