import React, { ReactNode } from 'react';

interface LegalWrapperProps {
  children: ReactNode;
  pageTitle: string;
  lastUpdated?: string;
}

const LegalWrapper: React.FC<LegalWrapperProps> = ({ children, pageTitle, lastUpdated }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-[#003366] text-white px-8 py-3 flex justify-between items-center text-[10px] md:text-xs font-bold uppercase tracking-widest">
          <span>Official U.S. Army Website</span>
          <span className="hidden md:inline">Army Persistent Experimentation Environment (APEN)</span>
        </div>
        <div className="bg-amber-50 border-b border-amber-200 px-8 py-4">
          <p className="text-[11px] leading-tight text-amber-900 font-medium uppercase">
            <strong>NOTICE:</strong> You are accessing a U.S. Government Information System provided for USG-authorized use only. 
            By using this IS, you consent to monitoring and have <strong>NO EXPECTATION OF PRIVACY.</strong>
          </p>
        </div>
        <div className="p-8 md:p-12">
          <header className="mb-10 border-b-4 border-black pb-6">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
              {pageTitle}
            </h1>
            {lastUpdated && (
              <p className="text-xs text-slate-500 mt-4 font-mono uppercase tracking-tighter">
                Effective Date: {lastUpdated}
              </p>
            )}
          </header>
          <article className="space-y-6 text-slate-800 leading-relaxed">
            {children}
          </article>
        </div>
        <footer className="bg-slate-900 text-slate-400 p-8 text-[10px] uppercase tracking-widest">
          <div className="text-center space-y-2">
            <p className="text-white font-bold">Official U.S. Army Information System</p>
            <p>Auth: 10 U.S.C. 3013; AR 25-1; AR 25-2; AR 27-60</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LegalWrapper;