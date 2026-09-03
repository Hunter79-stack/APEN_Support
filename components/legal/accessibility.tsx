import React from 'react';
import LegalWrapper from './LegalWrapper';

const Accessibility: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Accessibility Statement" lastUpdated="30 April 2026">
      <p>
        The <strong>Army Persistent Experimentation Environment (APEN)</strong> is committed to making its electronic and information technologies accessible to individuals with disabilities in accordance with <strong>Section 508 of the Rehabilitation Act</strong>.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">Compliance Standard</h2>
      <p>
        We strive to ensure that Federal employees and members of the public with disabilities have access to and use of information and data that is comparable to that provided to those without disabilities.
      </p>
      <div className="bg-slate-50 p-4 rounded border-l-4 border-blue-900">
        <p className="text-sm">
          If you use assistive technology and the format of any material on this site interferes with your ability to access information, please contact the APEN Support Team via the <strong>Report Accessibility Issue</strong> link in the footer.
        </p>
      </div>
    </LegalWrapper>
  );
};

export default Accessibility;