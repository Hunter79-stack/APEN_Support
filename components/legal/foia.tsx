import React from 'react';
import LegalWrapper from './LegalWrapper';

const FOIA: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Freedom of Information Act (FOIA)" lastUpdated="30 April 2026">
      <p>
        The <strong>Freedom of Information Act</strong> (5 U.S.C. § 552) provides the public the right to request access to records from any federal agency. It is often described as the law that keeps citizens in the know about their government.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">APEN Records</h2>
      <p>
        Requests for records maintained by APEN are processed through the <strong>U.S. Army Freedom of Information Act Office</strong>. Please note that certain experimentation data may be withheld if it falls under specific FOIA exemptions, such as those protecting internal personnel rules, statutory exemptions, or trade secrets.
      </p>
      <p className="text-sm font-semibold">
        For more information on how to file a request, visit the official Army FOIA portal.
      </p>
    </LegalWrapper>
  );
};

export default FOIA;