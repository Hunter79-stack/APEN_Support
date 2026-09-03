import React from 'react';
import LegalWrapper from './LegalWrapper';

const VeteransCrisisLine: React.FC = () => {
  return (
    <LegalWrapper pageTitle="Veteran's Crisis Line" lastUpdated="18 May 2026">
      {/* ── Immediate-help banner ── */}
      <div
        role="region"
        aria-label="Immediate help"
        className="not-prose rounded-lg border-2 border-red-700 bg-red-50 p-6 shadow-sm"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-800">
          If you or someone you know is in crisis
        </p>
        <p className="mt-2 text-2xl font-black text-red-900 tracking-tight">
          Dial <span className="font-mono">988</span>, then press <span className="font-mono">1</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-red-900">
          Text <span className="font-mono">838255</span> &nbsp;·&nbsp; TTY: dial <span className="font-mono">711</span> then <span className="font-mono">988</span>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-red-900">
          The Military Crisis Line is staffed 24 hours a day, 7 days a week, every day of the year. Support is free, and many responders are themselves veterans. If you are in immediate danger or need emergency medical assistance, dial <strong>911</strong>.
        </p>
      </div>

      {/* ── About the service ── */}
      <h2 className="text-xl font-bold border-b pb-2">About the Military &amp; Veteran's Crisis Line</h2>
      <p>
        The <strong>Military Crisis Line</strong> connects active-duty service members, National Guard and Reserve members, veterans, and their family members with qualified Department of Veterans Affairs responders. It is the same service as the <strong>Veteran's Crisis Line</strong> — the &ldquo;Military&rdquo; routing reaches responders trained for service-member and family situations, including deployment stress, transition issues, military sexual trauma, traumatic brain injury, and post-traumatic stress.
      </p>
      <p>
        You do not need to be enrolled in VA benefits or registered for VA health care to use the service.
      </p>

      {/* ── Reach the line ── */}
      <h2 className="text-xl font-bold border-b pb-2">How to reach the line</h2>
      <div className="not-prose overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-[11px] font-bold uppercase tracking-widest text-slate-700">
            <tr>
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            <tr>
              <td className="px-4 py-3 font-semibold">United States (any phone)</td>
              <td className="px-4 py-3 font-mono">988 &rarr; press 1</td>
              <td className="px-4 py-3">Free; routes to the Military Crisis Line.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">Text message</td>
              <td className="px-4 py-3 font-mono">838255</td>
              <td className="px-4 py-3">SMS to the same responders.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">TTY (hearing-impaired)</td>
              <td className="px-4 py-3 font-mono">711 &rarr; 988</td>
              <td className="px-4 py-3">Dial 711 then enter 988.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">Europe</td>
              <td className="px-4 py-3 font-mono">00800 1273 8255</td>
              <td className="px-4 py-3">Or DSN <span className="font-mono">118</span> from most installations.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">Korea</td>
              <td className="px-4 py-3 font-mono">0808 555 118</td>
              <td className="px-4 py-3">Or DSN <span className="font-mono">118</span>.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">Afghanistan</td>
              <td className="px-4 py-3 font-mono">00 1 800 273 8255</td>
              <td className="px-4 py-3">Or DSN <span className="font-mono">118</span>.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">All other overseas locations</td>
              <td className="px-4 py-3 font-mono">+1 800 273 8255</td>
              <td className="px-4 py-3">Then press <span className="font-mono">1</span>. Charges may apply from non-DSN lines.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600">
        The original public web service at <em>veteranscrisisline.net</em> is not reachable from this air-gapped environment. The phone, text, and DSN paths above operate independently of this network and remain available.
      </p>

      {/* ── What happens when you call ── */}
      <h2 className="text-xl font-bold border-b pb-2">What to expect when you contact the line</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>A responder will answer and ask what is happening for you right now.</li>
        <li>You can speak as briefly or as fully as you want. You do not have to provide your name or your unit.</li>
        <li>If the responder believes you may be in immediate physical danger, they may discuss involving local emergency services with you. This varies by circumstance.</li>
        <li>The responder can connect you with VA health care, the Vet Center program, or local resources for ongoing support if you ask.</li>
      </ul>

      {/* ── Other supporting resources ── */}
      <h2 className="text-xl font-bold border-b pb-2">Other DoD &amp; Army support resources</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Military OneSource</strong> &mdash; non-medical counseling and consultations for service members and families.
          <br />
          <span className="font-mono text-sm">1-800-342-9647</span> &nbsp;·&nbsp; 24/7
        </li>
        <li>
          <strong>Defense Suicide Prevention Office (DSPO)</strong> &mdash; DoD-wide policy and resources.
        </li>
        <li>
          <strong>Army Substance Abuse Program (ASAP)</strong> &mdash; counseling for substance use, available at every installation.
        </li>
        <li>
          <strong>Chaplain Corps</strong> &mdash; confidential pastoral care; reach your unit chaplain or installation chapel directly.
        </li>
        <li>
          <strong>SHARP (Sexual Harassment / Assault Response and Prevention)</strong> &mdash; <span className="font-mono text-sm">DoD Safe Helpline: 1-877-995-5247</span>.
        </li>
        <li>
          <strong>VA Caregiver Support Line</strong> &mdash; for family members caring for a veteran.
          <br />
          <span className="font-mono text-sm">1-855-260-3274</span> &nbsp;·&nbsp; M&ndash;F.
        </li>
      </ul>

      {/* ── Supporting a colleague ── */}
      <h2 className="text-xl font-bold border-b pb-2">Supporting a colleague or family member</h2>
      <p>
        If you are concerned about a Soldier, civilian, contractor, or family member, you can call the Military Crisis Line on their behalf using the same number. Responders can help you talk through what you are seeing and discuss next steps. You do not need to wait until a situation is clearly an emergency to make the call.
      </p>
      <p>
        Warning signs worth taking seriously include: talking about wanting to die or feeling like a burden, withdrawing from friends and family, sudden changes in mood, giving away possessions, increased substance use, and acquiring access to lethal means. Any of these, alone or together, warrant a conversation &mdash; even an awkward one.
      </p>

      {/* ── Internal contacts ── */}
      <h2 className="text-xl font-bold border-b pb-2">FCC / APEN points of contact</h2>
      <p>
        For non-crisis questions about workplace support resources, contact your chain of command, your Behavioral Health Officer, or the <strong>FCC CESC</strong> helpdesk at <a className="font-mono underline" href="mailto:cesc@army.mil">cesc@army.mil</a> or <span className="font-mono">DSN 706-791-5858</span>. The CESC team can help you locate the correct on-installation resource.
      </p>

      {/* ── Sourcing ── */}
      <h2 className="text-xl font-bold border-b pb-2">Source &amp; verification</h2>
      <p className="text-sm text-slate-700">
        Phone numbers and contact paths on this page reflect the published Military / Veteran's Crisis Line guidance from the U.S. Department of Veterans Affairs as of the effective date above. Numbers should be verified against the current published guidance on a non-air-gapped network before they are printed on cards, posters, or other distributed materials.
      </p>
    </LegalWrapper>
  );
};

export default VeteransCrisisLine;
