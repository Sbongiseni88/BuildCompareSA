"use client";

import React, { useState } from 'react';
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
    TrendingUp,
    X,
    Check
} from 'lucide-react';
import { Project } from '@/types';
import { mockProjects } from '@/data/mockData';
import { exportProjectToPDF } from '@/lib/pdfExport';

export default function ProjectsManager() {
    const [projects, setProjects] = useState<Project[]>(mockProjects);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'on-hold'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [showMenu, setShowMenu] = useState<string | null>(null);

    // New project form state
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectLocation, setNewProjectLocation] = useState('');
    const [newProjectBudget, setNewProjectBudget] = useState('');

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'badge-success';
            case 'completed': return 'badge-info';
            case 'on-hold': return 'badge-warning';
            default: return 'badge-info';
        }
    };

    const handleCreateProject = () => {
        if (!newProjectName || !newProjectLocation || !newProjectBudget) return;

        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: newProjectName,
            location: newProjectLocation,
            createdAt: new Date(),
            totalBudget: parseFloat(newProjectBudget),
            spent: 0,
            status: 'active',
            materials: [],
        };

        setProjects([newProject, ...projects]);
        setShowCreateModal(false);
        setNewProjectName('');
        setNewProjectLocation('');
        setNewProjectBudget('');
    };

    const handleDeleteProject = (id: string) => {
        setProjects(projects.filter(p => p.id !== id));
        setShowMenu(null);
    };

    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        totalBudget: projects.reduce((acc, p) => acc + p.totalBudget, 0),
        totalSpent: projects.reduce((acc, p) => acc + p.spent, 0),
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Project Folders</h1>
                    <p className="text-slate-400">Manage your construction projects and track material costs</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Project
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Total Projects</p>
                    <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Active</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">{stats.active}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Total Budget</p>
                    <p className="text-2xl font-bold text-yellow-400 mt-1">{formatCurrency(stats.totalBudget)}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Total Spent</p>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(stats.totalSpent)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search projects..."
                            className="input-field pl-12"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2">
                        {(['all', 'active', 'completed', 'on-hold'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === status
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

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project, index) => {
                    const progressPercent = (project.spent / project.totalBudget) * 100;
                    const isOverBudget = progressPercent > 100;

                    return (
                        <div
                            key={project.id}
                            className={`glass-card p-5 group hover:border-yellow-500/30 transition-all cursor-pointer relative ${isOverBudget ? 'animate-shake border-red-500/50 shadow-red-900/20' : ''
                                }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => setSelectedProject(project)}
                        >
                            {/* Menu Button */}
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(showMenu === project.id ? null : project.id);
                                    }}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>

                                {/* Dropdown Menu */}
                                {showMenu === project.id && (
                                    <div className="absolute right-0 top-full mt-1 w-48 glass-card rounded-xl shadow-2xl overflow-hidden z-10 animate-slide-up">
                                        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-sm text-left">
                                            <Edit2 className="w-4 h-4" />
                                            Edit Project
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-sm text-left">
                                            <Archive className="w-4 h-4" />
                                            Archive
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                exportProjectToPDF(project);
                                                setShowMenu(null);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-sm text-left"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export PDF
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteProject(project.id);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm text-left border-t border-slate-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Project Icon */}
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                                <FolderOpen className="w-6 h-6 text-yellow-400" />
                            </div>

                            {/* Project Info */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 pr-8">
                                    <h3 className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                                        {project.name}
                                    </h3>
                                    <span className={`badge ${getStatusColor(project.status)} mt-2`}>
                                        {project.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {project.location}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                                <Clock className="w-3 h-3" />
                                Created {new Date(project.createdAt).toLocaleDateString('en-ZA', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </div>

                            {/* Budget Progress */}
                            <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-slate-400">Budget</span>
                                    <span className={`font-medium ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
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

                            {/* Materials Count */}
                            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Package className="w-4 h-4" />
                                    {project.materials.length} materials
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-yellow-400 transition-colors" />
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

            {/* Empty State */}
            {filteredProjects.length === 0 && (
                <div className="glass-card p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-2xl mb-4">
                        <FolderOpen className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Projects Found</h3>
                    <p className="text-slate-400 mb-6">
                        {searchQuery
                            ? 'Try adjusting your search or filters'
                            : 'Create your first project to start tracking materials and costs'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Project
                        </button>
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
                                <label className="block text-sm text-slate-400 mb-2">Location *</label>
                                <input
                                    type="text"
                                    value={newProjectLocation}
                                    onChange={(e) => setNewProjectLocation(e.target.value)}
                                    placeholder="e.g., Sandton, Gauteng"
                                    className="input-field"
                                />
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
                                disabled={!newProjectName || !newProjectLocation || !newProjectBudget}
                                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Detail Modal */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-2xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
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
                        <div className="grid grid-cols-3 gap-4 mb-6">
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
                                    <button className="btn-secondary mt-4">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Materials
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700">
                            <button className="btn-secondary flex-1 flex items-center justify-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                View Analytics
                            </button>
                            <button className="btn-primary flex-1 flex items-center justify-center gap-2">
                                <Package className="w-4 h-4" />
                                Compare Prices
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
