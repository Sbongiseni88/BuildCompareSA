"use client";

import React from 'react';
import { X, ShieldCheck, HardHat, ChevronRight } from 'lucide-react';
import { BCCEI_PROMULGATION_NOTICE } from '@/lib/bccei/labour';

/**
 * Static regulatory guide overlays for the Dashboard "Simple Guide" cards.
 *
 * Replaces the old "coming soon" toast stubs. Rendered as a full-screen
 * overlay (this app is a single-page tab router, not a file-route app, so
 * an overlay is the routing-faithful equivalent of a /dashboard/guides/* page).
 *
 * Typography is tuned for the 40+ contractor persona: large base text,
 * bold high-contrast headings, generous spacing, explicit subheadings.
 */

export type ComplianceGuideId = 'sans-10400' | 'bccei-labour';

interface GuideSection {
    heading: string;
    body: string;
    bullets?: string[];
}

interface GuideContent {
    id: ComplianceGuideId;
    eyebrow: string;
    title: string;
    intro: string;
    accent: string; // tailwind text colour for headings/icon
    icon: React.ElementType;
    sections: GuideSection[];
    footnote?: string;
}

const GUIDES: Record<ComplianceGuideId, GuideContent> = {
    'sans-10400': {
        id: 'sans-10400',
        eyebrow: 'National Building Regulations',
        title: 'Understanding SANS 10400',
        accent: 'text-yellow-400',
        icon: ShieldCheck,
        intro:
            'SANS 10400 is the South African National Standard that gives practical effect to the National Building Regulations (NBR) under the National Building Regulations and Building Standards Act, 1977 (Act 103 of 1977). It is the "deemed-to-satisfy" rulebook your local building control officer measures your work against.',
        sections: [
            {
                heading: 'What it actually governs',
                body: 'SANS 10400 is split into parts (A to XA), each covering one functional area of a building. You do not need to memorise all of them — you need to know which parts touch the work on your current site.',
                bullets: [
                    'Part A — General principles and administration (plans, approvals, occupancy classes).',
                    'Part B — Structural design; Part C — Dimensions; Part D — Public safety.',
                    'Part K — Walls; Part L — Roofs; Part M — Stairways.',
                    'Part P — Drainage; Part Q — Non-water-borne sanitation; Part R — Stormwater.',
                    'Part T — Fire protection; Part XA — Energy usage in buildings.',
                ],
            },
            {
                heading: 'Why it matters for your tender',
                body: 'A government tender assumes full NBR compliance. Pricing a Bill of Quantities that ignores the relevant SANS 10400 parts is the fastest way to have work rejected at inspection or to carry uncosted rework. Build the standard into your rates, not into your variations.',
            },
            {
                heading: 'Practical site checklist',
                body: 'Before you submit, confirm the basics that inspectors check first:',
                bullets: [
                    'Approved building plans on site before any work starts (Part A).',
                    'Foundations and structural members sized to an engineer’s design (Part B).',
                    'Minimum room sizes, ceiling heights and ventilation met (Part C / Part O).',
                    'Fire escape routes, ratings and equipment for the occupancy class (Part T).',
                    'Energy-efficiency measures (insulation, hot-water) priced in (Part XA).',
                ],
            },
            {
                heading: 'Where to get the authoritative text',
                body: 'SANS 10400 is published by the South African Bureau of Standards (SABS). Always price against the current published edition — editions are revised, and your local authority enforces the version in force at submission. Treat this summary as orientation, not as the legal text.',
            },
        ],
        footnote:
            'This guide is a plain-language orientation, not legal advice. Confirm the current SANS 10400 edition and any municipal by-laws with your building control officer before submission.',
    },
    'bccei-labour': {
        id: 'bccei-labour',
        eyebrow: 'Bargaining Council Compliance',
        title: 'Managing Your Labour Budget',
        accent: 'text-green-400',
        icon: HardHat,
        intro:
            'On civil engineering work, labour is not priced from gut feel — it is governed by the Bargaining Council for the Civil Engineering Industry (BCCEI). The gazetted Wage & Task Grade Collective Agreement sets the minimum hourly rate for each task grade, and a government procurement inspector can audit your rates against it.',
        sections: [
            {
                heading: 'Task grades, not job titles',
                body: 'The BCCEI prices work by Task Grade (1 to 9), each with a gazetted minimum hourly rate. Higher grades carry more skill and a higher rate. BuildCompare maps each BoQ category to a default task grade so every labour line is defensible:',
                bullets: [
                    'Preliminaries → Grade 3 · Concrete → Grade 4.',
                    'Masonry & Finishes → Grade 5.',
                    'Plumbing & Openings → Grade 6.',
                    'Electrical & Structural Steel → Grade 7.',
                ],
            },
            {
                heading: 'The wage-year escalation',
                body: 'The current agreement steps the rates up each year on 1 September. BuildCompare resolves the correct year automatically from the project date, so your estimate never silently uses last year’s minimums:',
                bullets: [
                    'Y1 (to 31 Aug 2026): base + 6.0%.',
                    'Y2 (1 Sep 2026 – 31 Aug 2027): + 5.5%.',
                    'Y3 (1 Sep 2027 – 31 Aug 2028): + 5.5%.',
                ],
            },
            {
                heading: 'Allowances are part of the cost',
                body: 'The gazette also fixes allowances that many estimators forget — and that an inspector will add back. Where they apply to your site, price them in:',
                bullets: [
                    'Living-out / food allowance (per assignment day).',
                    'Sleep-out allowance (per night away).',
                    'Cross-border work — +7% on the basic rate.',
                    'Acting in a higher grade — +5% on the basic rate.',
                ],
            },
            {
                heading: 'How to keep your quote audit-proof',
                body: 'Every labour figure in your sourcing file traces back to a published BCCEI task grade, the active wage year, and an hours-per-unit assumption. Keep that trace intact: if you override an hours-per-unit value, document why. A defensible number beats a low number that collapses under scrutiny.',
            },
        ],
        footnote: BCCEI_PROMULGATION_NOTICE,
    },
};

interface ComplianceGuideOverlayProps {
    guideId: ComplianceGuideId | null;
    onClose: () => void;
}

export default function ComplianceGuideOverlay({ guideId, onClose }: ComplianceGuideOverlayProps) {
    // Close on Escape for keyboard users.
    React.useEffect(() => {
        if (!guideId) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [guideId, onClose]);

    if (!guideId) return null;
    const guide = GUIDES[guideId];
    const Icon = guide.icon;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            onClick={onClose}
        >
            <div
                className="relative w-full sm:max-w-3xl bg-slate-900 border border-slate-700 sm:rounded-2xl shadow-2xl my-0 sm:my-8 min-h-screen sm:min-h-0"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sticky header */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-800 rounded-xl">
                            <Icon className={`w-7 h-7 ${guide.accent}`} />
                        </div>
                        <div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${guide.accent} block`}>
                                {guide.eyebrow}
                            </span>
                            <h2 id="guide-title" className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                                {guide.title}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close guide"
                        className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-8 space-y-8">
                    <p className="text-lg leading-relaxed text-slate-200 font-medium">
                        {guide.intro}
                    </p>

                    {guide.sections.map((section, i) => (
                        <section key={i} className="space-y-3">
                            <h3 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white">
                                <ChevronRight className={`w-5 h-5 ${guide.accent}`} />
                                {section.heading}
                            </h3>
                            <p className="text-base leading-relaxed text-slate-300 pl-7">
                                {section.body}
                            </p>
                            {section.bullets && (
                                <ul className="pl-7 space-y-2">
                                    {section.bullets.map((b, j) => (
                                        <li key={j} className="flex items-start gap-3 text-base leading-relaxed text-slate-200">
                                            <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${guide.accent.replace('text-', 'bg-')}`} />
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}

                    {guide.footnote && (
                        <p className="text-sm leading-relaxed text-slate-400 border-t border-slate-800 pt-5 italic">
                            {guide.footnote}
                        </p>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto flex items-center justify-center h-12 px-8 bg-yellow-400 hover:bg-yellow-300 text-black text-base font-bold rounded-xl transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
