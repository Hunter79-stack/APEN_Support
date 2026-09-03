import React from 'react';
import LegalWrapper from './LegalWrapper';

const NoFearAct: React.FC = () => {
  return (
    <LegalWrapper pageTitle="No FEAR Act Data" lastUpdated="30 April 2026">
      <p>
        The <strong>No FEAR Act</strong> (Public Law 107-174) requires Federal agencies to be accountable for violations of antidiscrimination and whistleblower protection laws.
      </p>

      <h2 className="text-xl font-bold border-b pb-2">Equal Employment Opportunity</h2>
      <p>
        The Department of the Army posts summary statistical data relating to equal employment opportunity complaints filed against the Department. This data is updated quarterly to inform the public and Army personnel on the effectiveness of EEO programs.
      </p>

      <h2 className="text-xl font-bold border-b pb-2">Whistleblower Protection</h2>
      <p>
        Federal agencies are prohibited from taking personnel actions against employees or applicants because they exercised their rights under Federal antidiscrimination or whistleblower protection laws.
      </p>
    </LegalWrapper>
  );
};

export default NoFearAct;