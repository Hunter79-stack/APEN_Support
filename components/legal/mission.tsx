import React from 'react';
import LegalWrapper from './LegalWrapper';

const Mission: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Authority, Mission & Organization" lastUpdated="30 April 2026">
      <h2 className="text-xl font-bold border-b pb-2">Statutory Authority</h2>
      <p>
        The Department of the Army operates under the authority, direction, and control of the Secretary of the Army, pursuant to <strong>Title 10, United States Code</strong>.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">APEN Mission</h2>
      <p>
        The <strong>Army Persistent Experimentation Environment (APEN)</strong> provides a scalable, cloud-native infrastructure for the rapid testing, evaluation, and iteration of Army software and systems. Our mission is to accelerate the delivery of modernized capabilities to the Warfighter.
      </p>
      <h2 className="text-xl font-bold border-b pb-2">Organization</h2>
      <p>
        APEN is a constituent environment supporting the Army&apos;s modernization priorities, operating in coordination with <strong>Army Futures Command (AFC)</strong> and the <strong>Futures and Concepts Center (FCC)</strong>.
      </p>
    </LegalWrapper>
  );
};

export default Mission;