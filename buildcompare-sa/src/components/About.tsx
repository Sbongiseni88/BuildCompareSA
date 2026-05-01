"use client";

import React from 'react';
import {
    Building2,
    FileText,
    Users,
    Target,
    Sparkles,
    MapPin,
    Calendar,
    BadgeCheck
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
        <div className="space-y-16 animate-fade-in pb-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-600 p-8 md:p-16 shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0xMHY2aDZ2LTZoLTZ6bTEwIDEwdjZoNnYtNmgtNnptMC0xMHY2aDZ2LTZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                            <Building2 className="w-8 h-8 text-black" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white">About Us</h1>
                            <p className="text-slate-300 text-lg mt-1">Learn more about BuildCompare</p>
                        </div>
                    </div>

                    <p className="text-slate-200 text-xl max-w-4xl leading-relaxed">
                        <span className="text-yellow-400 font-bold">BuildCompare</span> is South Africa's premier construction material comparison platform,
                        empowering builders, contractors, and homeowners to make informed purchasing decisions.
                        We leverage cutting-edge technology to bring transparency and efficiency to the construction industry.
                    </p>
                </div>
            </div>

            {/* Mission & Vision */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl p-8 shadow-lg hover:border-yellow-400 transition-all duration-300 group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                            <Target className="w-8 h-8 text-yellow-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Our Mission</h2>
                    </div>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        To revolutionize the construction supply chain in South Africa by providing real-time
                        price comparisons, empowering our users to save time and money on every project.
                    </p>
                </div>

                <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl p-8 shadow-lg hover:border-blue-400 transition-all duration-300 group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                            <Sparkles className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Our Vision</h2>
                    </div>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        To become the go-to digital marketplace for construction materials, connecting
                        suppliers and buyers across South Africa with innovative AI-powered solutions.
                    </p>
                </div>
            </div>

            {/* Certificate of Incorporation Style Box */}
            <div className="bg-slate-900 border-2 border-slate-600 rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
                {/* Decorative inner border */}
                <div className="absolute inset-2 border border-slate-700/50 rounded-xl pointer-events-none"></div>
                
                <div className="text-center mb-12">
                    <FileText className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-widest">Company Registration</h2>
                    <p className="text-slate-400 mt-2 text-lg">Official Certificate of Incorporation Details</p>
                </div>

                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 relative z-10">
                    <div className="bg-slate-800 p-8 rounded-xl border-2 border-slate-600 shadow-inner">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Trading Name</h3>
                        <p className="text-3xl font-extrabold text-yellow-400 mb-8">{companyDetails.tradingAs}</p>
                        
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Registered Entity</h3>
                        <p className="text-xl font-bold text-white">{companyDetails.name}</p>
                    </div>
                    
                    <div className="space-y-8 flex flex-col justify-center">
                        <div className="flex items-center gap-5">
                            <BadgeCheck className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Registration Number</h3>
                                <p className="text-2xl font-mono font-bold text-white tracking-wider">{companyDetails.registrationNumber}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-5">
                            <Calendar className="w-10 h-10 text-slate-400 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Date of Incorporation</h3>
                                <p className="text-xl font-semibold text-white">{companyDetails.incorporationDate}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-5">
                            <MapPin className="w-10 h-10 text-slate-400 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Registered Location</h3>
                                <p className="text-xl font-semibold text-white">{companyDetails.location}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Meet the Director */}
            <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl p-8 md:p-12 shadow-xl">
                <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                    <div className="w-40 h-40 md:w-48 md:h-48 bg-slate-900 rounded-full flex-shrink-0 border-4 border-yellow-500 flex items-center justify-center shadow-2xl overflow-hidden">
                        <Users className="w-20 h-20 md:w-24 md:h-24 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Meet the Director</h2>
                        <h3 className="text-2xl text-yellow-400 font-bold mb-6">{companyDetails.director}</h3>
                        <p className="text-lg text-slate-300 leading-relaxed mb-6">
                            As the sole director of BuildCompare, Sibongiseni Dubazane is deeply committed to revolutionizing the South African construction sector. With strong roots in Springs, Gauteng, Sibongiseni understands the local market dynamics and the unique challenges faced by contractors and builders in the region.
                        </p>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            Under Sibongiseni's leadership, BuildCompare strives to bring transparency, efficiency, and cutting-edge technology to everyday construction procurement, ensuring that local businesses can thrive in a competitive landscape.
                        </p>
                    </div>
                </div>
            </div>

            {/* Why Choose Us */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-8 md:p-12">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-600">
                        <Sparkles className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Why Choose BuildCompare?</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { icon: "🔍", title: "Real-time Prices", desc: "Compare prices from multiple suppliers instantly without the hassle." },
                        { icon: "🤖", title: "AI-Powered", desc: "Smart recommendations and highly accurate cost estimations." },
                        { icon: "📊", title: "Cost Analysis", desc: "Detailed breakdowns and robust project budgeting tools." },
                        { icon: "🇿🇦", title: "SA Focused", desc: "Built locally for the unique South African construction industry." }
                    ].map((item, index) => (
                        <div
                            key={index}
                            className="bg-slate-800 rounded-xl p-6 border-2 border-slate-600 hover:border-yellow-400 hover:bg-slate-800/80 transition-all duration-300 shadow-lg group"
                        >
                            <div className="text-4xl mb-4">{item.icon}</div>
                            <h3 className="text-xl text-white font-bold mb-3 group-hover:text-yellow-400 transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-slate-300 text-lg">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl p-8 md:p-12 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-3">Get in Touch</h2>
                        <p className="text-slate-300 text-lg">
                            Have questions or need assistance? Our team is here to help.
                        </p>
                        <p className="text-yellow-400 font-bold text-xl mt-4 tracking-wide">
                            📧 info@buildcompare.co.za
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <div className="px-8 py-5 bg-slate-900 rounded-xl border-2 border-slate-700 shadow-inner">
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Location</p>
                            <p className="text-white font-bold text-xl">{companyDetails.location}</p>
                            <p className="text-slate-400 text-lg">South Africa</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
