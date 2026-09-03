import React from 'react';
import LegalWrapper from './LegalWrapper';

const PrivacySecurityNotice: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Privacy & Security Notice" lastUpdated="30 April 2026">
      <h2 className="text-xl font-bold border-b pb-2 uppercase">Privacy Act Statement</h2>
      <p>
        This system is governed by the <strong>Privacy Act of 1974</strong>. Information collected (such as CAC credentials or session logs) is used solely for authentication and security auditing within the APEN infrastructure.
      </p>

      <h2 className="text-xl font-bold border-b pb-2 uppercase">Security & Monitoring</h2>
      <div className="font-mono text-sm bg-slate-900 text-green-400 p-6 rounded-lg">
        <p className="mb-4 text-white font-bold underline">WARNING: OFFICIAL USG SYSTEM</p>
        <p>
          This Government computer system employs software programs to monitor network traffic to identify unauthorized attempts to upload or change information. 
        </p>
        <p className="mt-4">
          Unauthorized attempts to modify this service are strictly prohibited and punishable under the Computer Fraud and Abuse Act of 1986.
        </p>
      </div>

      <h2 className="text-xl font-bold border-b pb-2 uppercase text-sm">Tier 1 & Tier 2 Cookies</h2>
      <p>
        APEN utilizes cookies to maintain session persistence. These do not collect PII and are required for the functional operation of the experimentation environment.
      </p>
    </LegalWrapper>
  );
};

export default PrivacySecurityNotice;