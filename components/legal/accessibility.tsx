import React from 'react';
import LegalWrapper from './LegalWrapper';

const Accessibility: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Accessibility Statement" lastUpdated="22 September 2026">
      <p>
        The <strong>Army Persistent Experimentation Environment (APEN)</strong> is committed to making its electronic and information technologies accessible to individuals with disabilities in accordance with <strong>Section 508 of the Rehabilitation Act</strong>.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">Compliance Standard</h2>
      <p>
        We strive to ensure that Federal employees and members of the public with disabilities have access to and use of information and data that is comparable to that provided to those without disabilities.
      </p>
      <p>
        This site is built to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong>, which includes the WCAG 2.0 Level AA
        success criteria that the Section 508 standards (36 CFR Part 1194, Appendix A) incorporate by reference. Conformance is <strong>partial</strong>:
        the site&apos;s own pages, navigation, forms and downloads are designed to meet Level AA; the exceptions below do not.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">Evaluation</h2>
      <p>
        Last evaluated <strong>17 September 2026</strong> by an internal review of the site source (automated checks for image alternatives, form labels,
        keyboard operability and colour contrast that run on every build, plus a manual review). Findings from that review are being corrected; this
        page is updated when the evaluation is repeated.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">Known Exceptions</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>The FacilitatePro training videos are hosted as published by their vendor and have no captions or transcripts.</li>
        <li>Vendor documentation mirrored for offline reference (VMware release notes and guides, Evaluate-STIG guides, Leader Guides) is reproduced as published and has not been remediated.</li>
        <li>The animated page backgrounds and card effects are switched off for visitors whose system requests reduced motion; on older browsers that do not report that preference they remain active.</li>
      </ul>
      <div className="bg-slate-50 p-4 rounded border-l-4 border-blue-900">
        <p className="text-sm">
          If you use assistive technology and the format of any material on this site interferes with your ability to access information, use the{' '}
          <strong>Report Accessibility Issue</strong> link in the footer, or e-mail the FCC CESC Helpdesk at{' '}
          <a className="underline" href="mailto:cesc@army.mil?subject=Accessibility%20Issue">cesc@army.mil</a> (DSN 706-791-5858). Please name the page
          and the assistive technology you were using, and the format you need; we will provide the information in an accessible format.
        </p>
      </div>
    </LegalWrapper>
  );
};

export default Accessibility;