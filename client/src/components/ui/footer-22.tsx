'use client'
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { motion, type Variants } from 'motion/react';

export interface LinkItem {
    label: string;
    href: string;
}

export interface OfferColumn {
    title: string;
    links: LinkItem[];
}

export interface Footer22Props {
    brandName?: string;
    offerColumns?: OfferColumn[];
    newsletterHeadline?: string;
    newsletterDescription?: string;
    contactHeading?: string;
    contactDescription?: string;
    emailContact?: string;
    bottomLinks?: LinkItem[];
    className?: string;
    theme?: 'black' | 'light';
}

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05,
        },
    },
};

const riseItem: Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { type: 'spring', duration: 0.6, bounce: 0 },
    },
};

const gridItem: Variants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.8, ease: 'easeOut' },
    },
};

export default function Footer22({
    brandName = "WATERMELON",
    offerColumns = [
        {
            title: "OFFER",
            links: [
                { label: "Calendars", href: "#" },
                { label: "Refills & accessories", href: "#" },
                { label: "Notebooks", href: "#" },
                { label: "Bundles", href: "#" },
            ]
        },
        {
            title: "OFFER",
            links: [
                { label: "Calendars", href: "#" },
                { label: "Refills & accessories", href: "#" },
                { label: "Notebooks", href: "#" },
                { label: "Bundles", href: "#" },
            ]
        },
        {
            title: "OFFER",
            links: [
                { label: "Calendars", href: "#" },
                { label: "Refills & accessories", href: "#" },
                { label: "Notebooks", href: "#" },
                { label: "Bundles", href: "#" },
            ]
        },
        {
            title: "OFFER",
            links: [
                { label: "Calendars", href: "#" },
                { label: "Refills & accessories", href: "#" },
                { label: "Notebooks", href: "#" },
                { label: "Bundles", href: "#" },
            ]
        }
    ],
    newsletterHeadline = "Get 20% off the first Order",
    newsletterDescription = "Sign up for our monthly newsletter. That's it!",
    contactHeading = "Contact Us",
    contactDescription = "Receive calm nature wrapped in moonlight silence.",
    emailContact = "Watermelon@business.com",
    bottomLinks = [
        { label: "About", href: "#" },
        { label: "Support", href: "#" },
        { label: "Features", href: "#" },
        { label: "Support", href: "#" },
    ],
    className = "",
    theme = "black",
}: Footer22Props) {
    const isDark = theme === "black";

    return (
        <motion.footer
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className={`w-full font-sans transition-colors duration-300 ${
                isDark
                    ? "bg-[#0A0A0A] text-neutral-100 border-t-2 border-[#111827]"
                    : "bg-white text-neutral-900 border-t border-neutral-200"
            } ${className}`}
        >

            {/* Top Section */}
            <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 pt-16 pb-16">
                {/* Brand Header with Procura Icon */}
                <motion.div variants={riseItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-10 mb-12 border-b border-neutral-800">
                    <a href="/#top" className="flex items-center gap-4 group cursor-pointer" title="Return to Top">
                        <div className="size-14 sm:size-16 rounded-2xl bg-white p-1 border-2 border-neutral-700 shadow-[4px_4px_0px_#2457E6] group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden shrink-0">
                            <img src="/procura-icon.png" alt="Procura AI Logo" className="size-full object-contain scale-125" />
                        </div>
                        <div>
                            <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white group-hover:text-[#2457E6] transition-colors">
                                Procura AI
                            </div>
                            <div className="text-xs sm:text-sm font-mono text-neutral-400">
                                Smarter Purchasing. Controlled Spending.
                            </div>
                        </div>
                    </a>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 font-mono text-xs text-neutral-300">
                            <span className="size-2 rounded-full bg-[#2457E6] animate-pulse" />
                            Autonomous Procurement Layer
                        </span>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">

                    {/* Left: Offer Columns */}
                    <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                        {offerColumns.map((col, idx) => (
                            <motion.div key={idx} variants={riseItem} className="flex flex-col gap-6">
                                <h4
                                    className={`font-semibold text-[13px] tracking-wide uppercase ${
                                        isDark ? "text-neutral-200" : "text-neutral-900"
                                    }`}
                                >
                                    {col.title}
                                </h4>
                                <ul className="flex flex-col gap-3.5">
                                    {col.links.map((link, lIdx) => (
                                        <li key={lIdx}>
                                            <a
                                                href={link.href}
                                                className={`text-[14px] transition-colors ${
                                                    isDark
                                                        ? "text-neutral-400 hover:text-white"
                                                        : "text-neutral-600 hover:text-neutral-900"
                                                }`}
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right: Newsletter & Contact */}
                    <motion.div variants={riseItem} className="lg:col-span-4 flex flex-col gap-10 lg:pl-10">
                        {/* Newsletter */}
                        <div className="flex flex-col gap-3">
                            <h3
                                className={`text-[22px] font-medium tracking-tight ${
                                    isDark ? "text-white" : "text-neutral-900"
                                }`}
                            >
                                {newsletterHeadline}
                            </h3>
                            <p
                                className={`text-[15px] ${
                                    isDark ? "text-neutral-400" : "text-neutral-600"
                                }`}
                            >
                                {newsletterDescription}
                            </p>
                        </div>

                        {/* Contact Form */}
                        <div className="flex flex-col gap-4">
                            <h3
                                className={`text-[22px] font-medium tracking-tight ${
                                    isDark ? "text-white" : "text-neutral-900"
                                }`}
                            >
                                {contactHeading}
                            </h3>
                            <form className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full" onSubmit={(e) => e.preventDefault()}>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className={`flex-1 min-w-0 rounded-sm px-4 py-2.5 text-[15px] focus:outline-none transition-colors ${
                                        isDark
                                            ? "bg-[#141414] border border-neutral-800 text-white placeholder:text-neutral-500 focus:border-[#2457E6] focus:ring-1 focus:ring-[#2457E6]"
                                            : "bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500"
                                    }`}
                                    required
                                />
                                <button
                                    type="submit"
                                    className={`rounded-sm px-6 py-2.5 flex items-center justify-center gap-2 font-medium transition-transform hover:opacity-90 active:scale-95 shrink-0 ${
                                        isDark
                                            ? "bg-white text-black hover:bg-neutral-200"
                                            : "bg-[#1a1a1a] text-white hover:bg-black"
                                    }`}
                                >
                                    Subscribe <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
                                </button>
                            </form>
                            <p
                                className={`text-[14px] leading-relaxed max-w-[280px] mt-1 ${
                                    isDark ? "text-neutral-400" : "text-neutral-600"
                                }`}
                            >
                                {contactDescription}
                            </p>
                        </div>
                    </motion.div>

                </div>

                {/* Middle Email/Reach Out Section */}
                <motion.div variants={riseItem} className="pt-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">

                    <div className="flex flex-col gap-4">
                        <span className={`text-lg md:text-xl font-normal ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
                            Reach out at:
                        </span>
                        <a
                            href={`mailto:${emailContact}`}
                            className={`text-2xl md:text-4xl lg:text-[40px] font-light flex items-center gap-3 group transition-colors ${
                                isDark
                                    ? "text-neutral-100 hover:text-white"
                                    : "text-neutral-800 hover:text-black"
                            }`}
                        >
                            {emailContact}
                            <HugeiconsIcon
                                icon={ArrowUpRight01Icon}
                                size={24}
                                className={`transition-colors ${
                                    isDark
                                        ? "text-neutral-400 group-hover:text-white"
                                        : "text-neutral-500 group-hover:text-black"
                                }`}
                            />
                        </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 md:gap-10 pb-1">
                        {bottomLinks.map((link, idx) => (
                            <a
                                key={idx}
                                href={link.href}
                                className={`text-[17px] transition-colors ${
                                    isDark
                                        ? "text-neutral-400 hover:text-white"
                                        : "text-neutral-600 hover:text-neutral-900"
                                }`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                </motion.div>
            </div>

            {/* Bottom Banner with Pixel-Perfect Mosaic Grid */}
            <motion.div
                variants={gridItem}
                className={`relative w-full overflow-hidden ${
                    isDark ? "bg-[#050505] border-t border-neutral-900" : "bg-white border-t border-neutral-200"
                }`}
            >

                {/* CSS Mosaic Grid Generation */}
                <div className="absolute inset-0 flex flex-col w-full h-full">
                    {Array.from({ length: 12 }).map((_, r) => (
                        <div key={r} className="flex-1 flex w-full">
                            {Array.from({ length: 48 }).map((_, c) => {
                                // Deterministic pseudo-randomness for the mosaic pattern
                                const hash = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
                                const rand = hash - Math.floor(hash);

                                // Gradient mapping: top rows are lighter/transparent, bottom rows are solid cyan/blue
                                const rowFactor = r / 11; // 0 to 1

                                // Base opacity combines the random noise with the vertical gradient
                                const opacity = (rand * 0.2) + (rowFactor * 0.85);

                                return (
                                    <div
                                        key={c}
                                        className="flex-1 border-r border-b border-transparent"
                                        style={{
                                            backgroundColor: `rgba(89, 195, 224, ${opacity})`
                                        }}
                                    />
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* Big Text Container with Procura Icon */}
                <div className="relative flex items-center justify-center gap-3 sm:gap-6 md:gap-8 w-full py-4 md:py-6 px-2 md:px-4 z-10 overflow-hidden">
                    <img
                        src="/procura-icon.png"
                        alt="Procura AI Logo"
                        className="size-16 sm:size-24 md:size-36 lg:size-44 object-contain rounded-2xl drop-shadow-[0_8px_32px_rgba(36,87,230,0.6)] select-none pointer-events-none scale-120"
                    />
                    <span className="text-[11vw] md:text-[12vw] font-black text-white/90 mix-blend-overlay tracking-tighter leading-none select-none text-center whitespace-nowrap">
                        {brandName.toUpperCase()}
                    </span>
                </div>

            </motion.div>

        </motion.footer>
    );
}

export function Footer22Demo() {
    const customOfferColumns = [
        {
            title: "Solutions",
            links: [
                { label: "Developer Platform", href: "#" },
                { label: "UI Registry", href: "#" },
                { label: "Vite Templates", href: "#" },
                { label: "Enterprise Support", href: "#" },
            ],
        },
        {
            title: "Resources",
            links: [
                { label: "Component Docs", href: "#" },
                { label: "Design Principles", href: "#" },
                { label: "API Reference", href: "#" },
                { label: "Changelog", href: "#" },
            ],
        },
        {
            title: "Company",
            links: [
                { label: "About Us", href: "#" },
                { label: "Careers", href: "#" },
                { label: "Security & Trust", href: "#" },
                { label: "Legal", href: "#" },
            ],
        },
    ];

    const customBottomLinks = [
        { label: "About Watermelon", href: "#" },
        { label: "Developer License", href: "#" },
        { label: "GitHub Repository", href: "https://github.com/watermelon" },
    ];

    return (
        <div className="flex w-full items-end bg-[#0A0A0A]">
            <Footer22
                brandName="Watermelon"
                theme="black"
                offerColumns={customOfferColumns}
                newsletterHeadline="Subscribe for Component Updates"
                newsletterDescription="Get the latest premium UI components and code snippets in your inbox."
                contactHeading="Need Custom Work?"
                contactDescription="Our expert designers and engineers can help you build bespoke interface systems."
                emailContact="hello@watermelon.sh"
                bottomLinks={customBottomLinks}
            />
        </div>
    );
}