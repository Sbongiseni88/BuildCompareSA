"use client";

import React from 'react';
import {
    Building2,
    Award,
    FileText,
    Shield,
    Users,
    Target,
    Sparkles,
    Download,
    MapPin,
    Calendar,
    BadgeCheck,
    ExternalLink
} from 'lucide-react';

export default function About() {
    const companyDetails = {
        name: "K2026008511 (South Africa) (Pty) Ltd",
        tradingAs: "BuildCompare",
        registrationNumber: "2026 / 008511 / 07",
        incorporationDate: "6th January 2026",
        location: "Springs, Gauteng",
        director: "Sibongiseni Dubazane",
        directorTitle: "Sole Director"
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8 md:p-12">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0xMHY2aDZ2LTZoLTZ6bTEwIDEwdjZoNnYtNmgtNnptMC0xMHY2aDZ2LTZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
                            <Building2 className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">About Us</h1>
                            <p className="text-slate-400 text-sm">Learn more about BuildCompare</p>
                        </div>
                    </div>

                    <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
                        <span className="text-yellow-400 font-semibold">BuildCompare</span> is South Africa's premier construction material comparison platform,
                        empowering builders, contractors, and homeowners to make informed purchasing decisions.
                        We leverage cutting-edge technology to bring transparency and efficiency to the construction industry.
                    </p>
                </div>
            </div>

            {/* Mission & Vision */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-yellow-400/10 to-transparent border border-yellow-400/20 rounded-2xl p-6 hover:border-yellow-400/40 transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-400/30 transition-colors">
                            <Target className="w-5 h-5 text-yellow-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Our Mission</h2>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                        To revolutionize the construction supply chain in South Africa by providing real-time
                        price comparisons, empowering our users to save time and money on every project.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-blue-400/10 to-transparent border border-blue-400/20 rounded-2xl p-6 hover:border-blue-400/40 transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-400/20 rounded-lg flex items-center justify-center group-hover:bg-blue-400/30 transition-colors">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Our Vision</h2>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                        To become the go-to digital marketplace for construction materials, connecting
                        suppliers and buyers across South Africa with innovative AI-powered solutions.
                    </p>
                </div>
            </div>

            {/* Company Registration Details */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Company Registration</h2>
                        <p className="text-slate-500 text-sm">Official registration details</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Company Name</span>
                        <p className="text-white font-semibold">{companyDetails.name}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Trading As</span>
                        <p className="text-yellow-400 font-bold">{companyDetails.tradingAs}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registration No.</span>
                        <p className="text-white font-semibold font-mono">{companyDetails.registrationNumber}</p>
                    </div>
                    <div className="space-y-1 flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Incorporated</span>
                            <p className="text-white">{companyDetails.incorporationDate}</p>
                        </div>
                    </div>
                    <div className="space-y-1 flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Location</span>
                            <p className="text-white">{companyDetails.location}</p>
                        </div>
                    </div>
                    <div className="space-y-1 flex items-start gap-2">
                        <Users className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Director</span>
                            <p className="text-white">{companyDetails.director}</p>
                            <p className="text-slate-400 text-sm">{companyDetails.directorTitle}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BEE Certificate */}
            <div className="bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Award className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">B-BBEE Certificate</h2>
                            <p className="text-slate-500 text-sm">Broad-Based Black Economic Empowerment</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                        <span className="text-purple-400 text-sm font-medium flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Certified
                        </span>
                    </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
                    <p className="text-slate-300 mb-6 leading-relaxed">
                        BuildCompare is committed to transformation and economic empowerment in South Africa.
                        Our B-BBEE certificate demonstrates our dedication to contributing to the country's
                        economic transformation objectives and supporting broad-based economic participation.
                    </p>

                    <a
                        href="/documents/BEE.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 rounded-xl transition-all duration-300 font-medium group"
                    >
                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        View B-BBEE Certificate
                        <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                </div>
            </div>

            {/* Why Choose Us */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Why Choose BuildCompare?</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: "🔍", title: "Real-time Prices", desc: "Compare prices from multiple suppliers instantly" },
                        { icon: "🤖", title: "AI-Powered", desc: "Smart recommendations and cost estimations" },
                        { icon: "📊", title: "Cost Analysis", desc: "Detailed breakdowns and project budgeting" },
                        { icon: "🇿🇦", title: "SA Focused", desc: "Built for the South African construction industry" }
                    ].map((item, index) => (
                        <div
                            key={index}
                            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-yellow-400/30 transition-all duration-300 group"
                        >
                            <div className="text-3xl mb-3">{item.icon}</div>
                            <h3 className="text-white font-semibold mb-1 group-hover:text-yellow-400 transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-slate-400 text-sm">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent border border-yellow-400/20 rounded-2xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Get in Touch</h2>
                        <p className="text-slate-400">
                            Have questions or need assistance? Our team is here to help.
                        </p>
                        <p className="text-yellow-400 font-medium mt-2">
                            📧 info@buildcompare.co.za
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <div className="px-6 py-3 bg-slate-800/50 rounded-xl border border-slate-700">
                            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Location</p>
                            <p className="text-white font-medium">Springs, Gauteng</p>
                            <p className="text-slate-400 text-sm">South Africa</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
