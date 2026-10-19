'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ArrowRight, Mail, Phone, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeparatorPro } from '@/components/ui/seperatorpro';
import GlobeWireframe from '@/components/ui/globe-wireframe';

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

const CONTACT_LINKS = [
  {
    icon: Mail,
    tag: 'Inquiries',
    label: 'm.dinesh.it27@gmail.com',
    href: 'mailto:m.dinesh.it27@gmail.com',
    subtext: 'Replies within 24h',
  },
  {
    icon: Phone,
    tag: 'Phone',
    label: '+91 8122129450',
    href: 'tel:+91 8122129450',
    subtext: 'Mon-Fri 9am-6pm EST',
  },
];

interface ContactWithGlobeProps {
  title?: string;
  subtitle?: string;
  description?: string;
  className?: string;
}

export default function ContactWithGlobe({
  title = 'Contact us',
  subtitle = 'Contact & Support',
  description = 'Have questions about procurement automation, SpendGuard policies, or PayPal Sandbox checkout? Reach out to our engineering and procurement team.',
  className,
}: ContactWithGlobeProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.message.trim()) return;
    setSubmitted(true);
  };

  return (
    <section
      id="contact"
      className={cn(
        'relative w-full bg-[#FBF9F5] overflow-hidden py-10 sm:py-14 border-b-2 border-[#111827]/10 font-sans',
        className,
      )}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center gap-3 sm:gap-4 mb-8 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E6EEFE] border-2 border-[#111827] shadow-[2px_2px_0px_#111827]"
          >
            <span className="size-2 rounded-full bg-[#2457E6] animate-pulse" />
            <span className="text-xs sm:text-sm text-[#2457E6] font-mono font-bold tracking-wider uppercase">
              {subtitle}
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: smoothEase }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-[#111827] tracking-[-0.025em]"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.3, ease: smoothEase }}
            className="text-base sm:text-lg text-[#46536B] max-w-xl leading-relaxed font-sans"
          >
            {description}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto items-start">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.2, ease: smoothEase }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#2457E6]">
                Direct Channels
              </span>
              <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#111827] tracking-tight">
                Get in touch
              </h3>
              <p className="text-sm sm:text-base text-[#46536B] leading-relaxed max-w-sm font-sans">
                Reach out via any channel below. We typically reply within one
                business day.
              </p>
            </div>

            <div className="flex flex-col gap-3 font-sans">
              {CONTACT_LINKS.map(({ icon: Icon, tag, label, href, subtext }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: 0.3 + i * 0.1,
                    ease: smoothEase,
                  }}
                  className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl border-2 border-[#111827]/15 bg-white hover:border-[#111827] hover:shadow-[3px_3px_0px_#111827] hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#E6EEFE] border-2 border-[#111827] shadow-[2px_2px_0px_#111827] group-hover:bg-[#2457E6] flex items-center justify-center shrink-0 transition-all duration-200">
                      <Icon className="w-4 h-4 text-[#2457E6] group-hover:text-white transition-colors duration-200" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#46536B]/80">
                        {tag}
                      </span>
                      <span className="font-mono text-sm sm:text-base font-bold text-[#111827] group-hover:text-[#2457E6] transition-colors truncate">
                        {label}
                      </span>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#46536B] px-2.5 py-1 rounded-md bg-[#F4F1EA] border border-[#111827]/10 shrink-0">
                    <Clock className="size-3 text-[#2457E6]" />
                    {subtext}
                  </span>
                </motion.a>
              ))}
            </div>

            {/* Free-Floating Animated Globe (Uncompressed, Tightened Vertical Spacing) */}
            <div className="relative w-full flex items-center justify-center pt-0 pb-1 sm:pb-2 -mt-1 sm:-mt-2">
              <div className="relative w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[360px] aspect-square flex items-center justify-center">
                {/* Atmospheric Royal Blue Ambient Glow */}
                <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(36,87,230,0.18)_0%,transparent_70%)] blur-2xl pointer-events-none" />

                <GlobeWireframe
                  className="w-full h-full aspect-square drop-shadow-[0_16px_36px_rgba(36,87,230,0.25)]"
                  variant="solid"
                  autoRotate
                  autoRotateSpeed={0.5}
                  backgroundColor="#2457E6"
                  countryFillColor="#FFFFFF"
                  strokeColor="#FFFFFF"
                  strokeWidth={0.8}
                  showGraticule={true}
                  graticuleColor="rgba(255, 255, 255, 0.4)"
                  graticuleOpacity={0.4}
                  sphereOutlineColor="#173BB8"
                  sphereOutlineWidth={2}
                  scale={0.95}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.35, ease: smoothEase }}
            className="rounded-2xl border-2 border-[#111827] bg-white p-6 sm:p-8 flex flex-col gap-5 shadow-[4px_4px_0px_#111827]"
          >
            <div>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#2457E6]">
                Fast Response
              </span>
              <h3 className="text-2xl font-display font-bold text-[#111827] tracking-tight mb-1">
                Send a message
              </h3>
              <p className="text-sm text-[#46536B] font-sans">
                Fill out the form and our procurement specialists will get back to you promptly.
              </p>
            </div>

            <SeparatorPro variant="dots" />

            {submitted ? (
              <div className="py-8 text-center flex flex-col items-center gap-3 font-sans">
                <div className="size-14 rounded-full bg-emerald-100 border-2 border-emerald-600 text-emerald-700 flex items-center justify-center shadow-[2px_2px_0px_#111827]">
                  <CheckCircle2 className="size-7" />
                </div>
                <h4 className="font-display font-bold text-xl text-[#111827] tracking-tight">
                  Message Received!
                </h4>
                <p className="text-sm text-[#46536B] max-w-xs font-sans leading-relaxed">
                  Thanks for reaching out! A Procura procurement specialist will review your note and respond within one business day.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', company: '', email: '', phone: '', address: '', message: '' });
                  }}
                  className="mt-3 text-xs font-mono font-bold uppercase tracking-wider text-[#2457E6] hover:underline cursor-pointer"
                >
                  ← Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-bold tracking-wider uppercase text-[#111827]">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Alex Morgan"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-[#FBF9F5] border-2 border-[#111827]/20 rounded-xl px-4 py-2.5 text-sm text-[#111827] font-sans placeholder:text-[#46536B]/50 placeholder:font-sans outline-none focus:border-[#2457E6] focus:bg-white focus:ring-2 focus:ring-[#2457E6]/10 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-bold tracking-wider uppercase text-[#111827]">
                      Company
                    </label>
                    <input
                      type="text"
                      placeholder="Acme Corp"
                      value={formData.company}
                      onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                      className="w-full bg-[#FBF9F5] border-2 border-[#111827]/20 rounded-xl px-4 py-2.5 text-sm text-[#111827] font-sans placeholder:text-[#46536B]/50 placeholder:font-sans outline-none focus:border-[#2457E6] focus:bg-white focus:ring-2 focus:ring-[#2457E6]/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-bold tracking-wider uppercase text-[#111827]">
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex@acme.com"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#FBF9F5] border-2 border-[#111827]/20 rounded-xl px-4 py-2.5 text-sm text-[#111827] font-sans placeholder:text-[#46536B]/50 placeholder:font-sans outline-none focus:border-[#2457E6] focus:bg-white focus:ring-2 focus:ring-[#2457E6]/10 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono font-bold tracking-wider uppercase text-[#111827]">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-[#FBF9F5] border-2 border-[#111827]/20 rounded-xl px-4 py-2.5 text-sm text-[#111827] font-sans placeholder:text-[#46536B]/50 placeholder:font-sans outline-none focus:border-[#2457E6] focus:bg-white focus:ring-2 focus:ring-[#2457E6]/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-bold tracking-wider uppercase text-[#111827]">
                    Office / Business Address
                  </label>
                  <input
                    type="text"
                    placeholder="100 Montgomery St, Suite 500, San Francisco, CA"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-[#FBF9F5] border-2 border-[#111827]/20 rounded-xl px-4 py-2.5 text-sm text-[#111827] font-sans placeholder:text-[#46536B]/50 placeholder:font-sans outline-none focus:border-[#2457E6] focus:bg-white focus:ring-2 focus:ring-[#2457E6]/10 transition-all duration-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-bold tracking-wider uppercase text-[#111827]">
                    Inquiry Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us about your team size, procurement workflow, or questions..."
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-[#FBF9F5] border-2 border-[#111827]/20 rounded-xl px-4 py-3 text-sm text-[#111827] font-sans placeholder:text-[#46536B]/50 placeholder:font-sans outline-none focus:border-[#2457E6] focus:bg-white focus:ring-2 focus:ring-[#2457E6]/10 resize-none transition-all duration-200"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between gap-4">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto h-11 px-8 rounded-xl font-display font-bold text-sm tracking-wide bg-[#2457E6] hover:bg-[#1d4ed8] text-white border-2 border-[#111827] shadow-[3px_3px_0px_#111827] hover:shadow-[4px_4px_0px_#111827] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer group flex items-center justify-center gap-2"
                  >
                    <span>Submit Inquiry</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-[#46536B]">
                    <ShieldCheck className="size-3.5 text-[#2457E6]" />
                    Enterprise data safety
                  </span>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
