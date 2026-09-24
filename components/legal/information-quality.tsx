import React from 'react';
import LegalWrapper from './LegalWrapper';

const InformationQuality: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Information Quality" lastUpdated="30 April 2026">
      <p>
        In accordance with the <strong>Information Quality Act</strong> (Section 515 of Public Law 106-554), the Department of the Army has developed guidelines to ensure and maximize the quality, objectivity, utility, and integrity of information disseminated to the public.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">Experimentation Data Disclaimer</h2>
      <p>
        Information hosted within APEN designated as &quot;Experimentation&quot; or &quot;Beta&quot; is intended for internal evaluation and may not represent finalized Army positions or official disseminated data. Users should verify the status of data before utilizing it for formal decision-making.
      </p>
    </LegalWrapper>
  );
};

export default InformationQuality;