import React from 'react';
import LegalWrapper from './LegalWrapper';

const LinksDisclaimer: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Links Disclaimer" lastUpdated="30 April 2026">
      <p>
        The appearance of hyperlinks to external sites does not constitute endorsement by the <strong>Department of the Army</strong> or the <strong>APEN Environment</strong> of the linked website or the information, products or services contained therein.
      </p>

      <div className="grid md:grid-cols-2 gap-6 py-4">
        <div className="p-4 bg-slate-50 rounded">
          <h3 className="font-bold mb-2">Editorial Control</h3>
          <p className="text-sm">
            Except for authorized activities such as military exchanges (PX/BX) and MWR sites, the Army does not exercise editorial control over external content.
          </p>
        </div>
        <div className="p-4 bg-slate-50 rounded">
          <h3 className="font-bold mb-2">User Responsibility</h3>
          <p className="text-sm">
            Links are provided consistent with the mission of this DoD website. Once you leave APEN, you are subject to the privacy and security policies of the external site.
          </p>
        </div>
      </div>
    </LegalWrapper>
  );
};

export default LinksDisclaimer;