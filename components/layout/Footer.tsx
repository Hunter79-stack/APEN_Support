import React from 'react';
import { contactInfo, quickLinks, footerLogos } from '@/lib/data/footer';
import { FeedbackLink } from '@/components/ui/FeedbackLink';

export function Footer() {
  return (
    <footer className="glass-footer relative z-10 mt-auto w-full border-t border-white/5 bg-[#040a16]/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-12">
        
        {/* Main Footer Row */}
        <div className="flex flex-col items-center justify-between gap-8 xl:flex-row xl:gap-12">
          
          {/* 1. Logos */}
          <div className="flex flex-shrink-0 items-center justify-center gap-5">
            {/* Footer is far below the fold — lazy-load and (via lazy) drop the
                React 19 auto image-preload that otherwise fired at page load. */}
            <img alt="FCC" src={footerLogos.fcc} loading="lazy" decoding="async" width={64} height={80} className="h-20 w-auto opacity-60 hover:opacity-100 transition-opacity" />
            <img alt="APEN" src={footerLogos.apen} loading="lazy" decoding="async" width={80} height={80} className="h-20 w-auto opacity-60 hover:opacity-100 transition-opacity" />
            <div className="hidden h-6 w-px bg-white/10 xl:block"></div>
            <span className="hidden font-mono text-[10px] tracking-widest text-slate-400 xl:block">
            </span>
          </div>

          {/* 2. Centered Compact Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 min-w-0 xl:flex-[2]">
            {quickLinks.map((link) => {
              const external = /^https?:\/\//.test(link.href)
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className="hover:text-cyan-400 transition-colors"
                >
                  {link.label}
                </a>
              )
            })}
          </nav>

          {/* 3. Support Group */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 min-w-0 xl:flex-1 xl:justify-end">
            <a href={contactInfo.email.href} className="hover:text-cyan-400 transition-colors">
              {contactInfo.email.label}
            </a>
            <span>{contactInfo.phone.label}</span>
            <FeedbackLink />
          </nav>

        </div>

        {/* Trademark / attribution line — every page renders vendor marks */}
        <p className="mt-6 text-center text-[10px] leading-relaxed text-gray-400">
          Product names, logos and brands are property of their respective owners and identify the products this site supports; use does not imply endorsement.{' '}
          <a href="/attribution" className="underline hover:text-cyan-400 transition-colors">Attribution &amp; third-party notices</a>
        </p>

        {/* Mobile Motto Bar */}
        <div className="mt-8 border-t border-white/5 pt-4 text-center lg:hidden">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-slate-400">
          </p>
        </div>
      </div>
    </footer>
  );
}
