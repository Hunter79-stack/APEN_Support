import React from 'react';
import LegalWrapper from './LegalWrapper';

const OpenGov: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Open Government & Transparency" lastUpdated="30 April 2026">
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold border-b pb-2">Open Government</h2>
          <p>
            APEN supports the <strong>Open Government Directive</strong>, fostering an environment of transparency, public participation, and collaboration. We aim to provide information that is accessible and usable by the public.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold border-b pb-2">Plain Writing Act</h2>
          <p>
            We are committed to the <strong>Plain Writing Act of 2010</strong>. Our goal is to communicate clearly so that users can find what they need, understand what they find, and use that information effectively.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold border-b pb-2">Strategic & Performance Plans</h2>
          <p>
            In alignment with the <strong>GPRA Modernization Act of 2010</strong>, the Army’s strategic goals and performance results are regularly published to ensure accountability. APEN activities are benchmarked against these broader modernization objectives.
          </p>
        </div>

        <div className="p-4 bg-slate-100 rounded text-center font-bold">
          Looking for general government information? Visit <a href="https://www.usa.gov/" className="text-blue-800 underline">USA.gov</a>.
        </div>
      </section>
    </LegalWrapper>
  );
};

export default OpenGov;