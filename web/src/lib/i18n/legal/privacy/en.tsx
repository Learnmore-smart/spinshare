import { LegalSection, codeClass } from "../shared";

export function PrivacyBodyEn() {
  return (
    <>
      <LegalSection title="Overview">
        <p>
          spinshare.dev (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the SpinShare VS
          Code extension, the <code className={codeClass}>spinshare</code> CLI wrapper, and the
          spinshare.dev website. SpinShare is a developer-first ad exchange that displays short text
          advertisements in place of the loading spinners and progress indicators that appear while
          AI coding agents are generating output. This policy describes what information we collect,
          how we use it, and the choices you have.
        </p>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">Account information.</strong> When you sign in with
            Google or GitHub, we receive your email address, display name (where available), and a
            stable provider-side identifier (such as the OAuth{" "}
            <code className={codeClass}>sub</code> claim) so we can identify your account, credit
            earnings, and prevent duplicate accounts.
          </li>
          <li>
            <strong className="text-slate-900">Device identifier.</strong> A per-installation client
            identifier is generated locally to associate impression events with your account. It is
            pseudonymous: it does not identify you on its own, but for signed-in users it is linked
            to your account so we can credit earnings.
          </li>
          <li>
            <strong className="text-slate-900">Ad interaction events.</strong> For each ad served we
            record event telemetry: the event type (impression rendered, viewable, view-duration
            ticks, clicks), the ad/campaign/creative identifiers, the surface it appeared on
            (spinner, status line, progress notification, or overlay), on-screen visibility metrics,
            a per-event ID used to deduplicate events, timestamps, and the client and host application
            versions (for example, the SpinShare extension version and the VS Code or Claude Code
            version). In signed-out preview (&ldquo;demo&rdquo;) mode, this telemetry is not
            attributed to any user account.
          </li>
          <li>
            <strong className="text-slate-900">IP address.</strong> We process your IP address on a
            transient basis for rate-limiting, abuse-detection, and fraud-prevention purposes.
          </li>
          <li>
            <strong className="text-slate-900">Payment information.</strong> If you purchase ad
            inventory, payment is processed by Stripe. We do not store your full card details.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Information We Do Not Collect">
        <ul className="list-disc space-y-2 pl-6">
          <li>Your source code, file contents, file names, or project structure.</li>
          <li>Your prompts, AI responses, chat history, or tool invocations.</li>
          <li>Your browsing activity outside of our extension, CLI wrapper, and website.</li>
          <li>
            The extension&rsquo;s and CLI wrapper&rsquo;s telemetry is structurally limited to the
            ad-event metrics described above &mdash; the data they transmit contains no field capable
            of carrying your code, prompts, or AI interactions.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Local Processing (Never Transmitted)">
        <p>
          To detect when an AI coding agent is actively running and which session is on screen, the
          SpinShare extension reads Claude Code&rsquo;s local session transcript files (
          <code className={codeClass}>~/.claude/projects/**/*.jsonl</code>) on your machine. From
          those files it parses only a small set of signals &mdash; for example, the session&rsquo;s
          entrypoint tag (which distinguishes a VS Code panel session from a terminal session), the
          name of the most recent tool invocation, and whether the current turn has finished. This
          is used solely to time ad display and to stop the billing clock when activity ends.
        </p>
        <p>
          This processing happens entirely on your device. No transcript content &mdash; no prompt,
          response, code, or tool name &mdash; is ever transmitted to our servers, and our telemetry
          schema contains no field capable of carrying it. The extension&rsquo;s source is open
          source and publicly mirrored so you can verify this yourself.
        </p>
      </LegalSection>

      <LegalSection title="Website Analytics &amp; Cookies">
        <p>
          The spinshare.dev website (not the extension or CLI wrapper) may use a usage-analytics
          service that records how visitors interact with our pages (clicks, scrolling, and page
          navigation) and sets cookies to distinguish visitors. We use this to understand and improve
          the website. See the third-party provider&rsquo;s privacy statement for details. Our pages
          may also load fonts from a third-party font service, which receives your IP address when
          the font files are fetched.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <ul className="list-disc space-y-2 pl-6">
          <li>Credit earnings to your account based on ad impressions and clicks.</li>
          <li>Serve relevant ads in the extension spinner slot.</li>
          <li>Improve our service and detect fraud or abuse.</li>
          <li>Communicate important account or service updates.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Google &amp; GitHub User Data">
        <p>
          Our use of information received from Google APIs adheres to the Google API Services User
          Data Policy, including the Limited Use requirements. Our use of information received from
          GitHub adheres to the GitHub Developer Terms and the GitHub Privacy Statement. Specifically,
          we:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Only use your provider email, display name, and stable identifier to identify your account
            and credit earnings.
          </li>
          <li>Do not use provider user data for advertising, retargeting, or profiling.</li>
          <li>Do not sell, rent, or share provider user data with data brokers.</li>
          <li>Do not use provider user data to train AI or machine learning models.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Data Sharing">
        <p>We do not sell your personal information. We may share data with:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-slate-900">Stripe.</strong> For payment processing and, when
            payouts open, payout processing and related tax-information collection.
          </li>
          <li>
            <strong className="text-slate-900">Google Cloud / Firebase.</strong> For infrastructure
            hosting, authentication, and data storage.
          </li>
          <li>
            <strong className="text-slate-900">Twilio SendGrid</strong> (or a comparable transactional
            email provider). For transactional email (sign-in links and account notices).
          </li>
          <li>
            <strong className="text-slate-900">Analytics provider.</strong> For website usage
            analytics, as described above.
          </li>
          <li>
            <strong className="text-slate-900">Advertisers.</strong> Only aggregate, anonymized
            impression and click counts.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Data Retention &amp; Deletion">
        <p>
          Account data is retained while your account is active, and may be retained for up to 7
          years after termination or last activity where needed for fraud prevention, financial
          reconciliation, and legal compliance. You may request deletion by contacting us at
          support@spinshare.dev; upon deletion, personal identifiers are removed or anonymized within
          30 days, while aggregated or anonymized data and financial records required by law may be
          retained.
        </p>
      </LegalSection>

      <LegalSection title="Your Privacy Rights">
        <p>
          Depending on where you live (including California, Virginia, Colorado, Connecticut, Utah,
          and other U.S. states with privacy laws, as well as the EU/UK under the GDPR and Canada
          under PIPEDA), you may have the right to request access to, correction of, or deletion of
          your personal information, and to opt out of any sale or sharing of personal information
          (which we do not do). To exercise any of these rights, email support@spinshare.dev.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use industry-standard measures including encrypted connections (TLS), secure
          authentication tokens, and access controls to protect your data. No method of transmission
          or electronic storage is completely secure, however, and we cannot and do not guarantee
          absolute security.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy from time to time. Material changes will be communicated via the
          extension or email.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy? Email{" "}
          <a
            href="mailto:support@spinshare.dev"
            className="font-bold text-emerald-700 underline-offset-2 hover:underline"
          >
            support@spinshare.dev
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}
