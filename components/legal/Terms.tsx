import React from 'react';
import LegalWrapper from './LegalWrapper';

const TermsOfUse: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Terms of Use" lastUpdated="30 April 2026">
      <p>
        Please read this Terms of Use agreement carefully. By using this website owned by the U.S. Army, you signify that you have read, understand and agree to be bound by all of the terms and conditions as set forth in this (1) Terms of Use Agreement, (2) U.S. Army&apos;s Privacy Policy.
      </p>
      
      <h2 className="text-xl font-bold border-b pb-2">External Links Disclaimer</h2>
      <p>
        The appearance of hyperlinks to external sites does not constitute endorsement by the Department of the Army of the linked website or the information, products or services contained therein. For other than authorized activities such as military exchanges and Morale, Welfare and Recreation sites, the Department of the Army does not exercise any editorial control over the information you may find at these locations.
      </p>

      <h2 className="text-xl font-bold border-b pb-2">Third Party Integration</h2>
      <p>
        We integrate with third party services. By viewing YouTube videos or interacting with the API client on our site you agree to be bound to the <strong>YouTube Terms of Service</strong>. If a user is found violating these terms, access can be revoked via Google security settings.
      </p>

      <h2 className="text-xl font-bold border-b pb-2">Copyright Policy (AR 25-1 & 27-60)</h2>
      <p>
        The use of copyrighted material within the Army is subject to U.S. copyright law. It is Army policy to recognize and respect the rights of copyright owners. Copyrighted works will not be reproduced or distributed outside of the Army without written permission.
      </p>
      <div className="bg-slate-50 p-4 rounded border-l-4 border-slate-400 text-sm italic">
        &quot;Army Regulation 25-1 prohibits the posting of documents or information protected by a copyright on Army websites without the permission of the copyright holder.&quot;
      </div>
      
      <p className="text-sm">
        Questions? Forward them to us via our <strong>Contact Us</strong> page.
      </p>
    </LegalWrapper>
  );
};

export default TermsOfUse;