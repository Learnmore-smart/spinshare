import type { Dictionary } from "@/lib/i18n/types";
import { LegalSection, LegalSubsection, codeClass } from "../shared";

export function TermsBodyEn({ titles }: { titles: Dictionary["terms"]["sectionTitles"] }) {
  return (
    <>
          <LegalSection id={1} title={titles[1] ?? ""}>
            <p>
              These Terms of Service (&ldquo;Agreement&rdquo;) constitute a legally binding
              agreement between you (&ldquo;you,&rdquo; &ldquo;your,&rdquo; or &ldquo;User&rdquo;) and
              spinshare-web-vert.vercel.app (&ldquo;SpinShare,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;), governing your access to and use of the SpinShare platform,
              Visual Studio Code (VS Code) extension, IDE plugin, command-line (CLI)
              wrapper, and related services (collectively, the &ldquo;Service&rdquo;).
            </p>
            <p>
              BY INSTALLING SPINSHARE, CREATING AN ACCOUNT, ACCESSING OUR WEBSITE, OR
              OTHERWISE USING THE SERVICE IN ANY MANNER, YOU ACKNOWLEDGE THAT YOU
              HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THIS AGREEMENT. IF YOU
              DO NOT AGREE TO ALL TERMS AND CONDITIONS, YOU MUST IMMEDIATELY
              DISCONTINUE USE OF THE SERVICE AND UNINSTALL THE EXTENSION AND CLI
              WRAPPER.
            </p>
            <p>
              This Agreement applies to all users of the Service, including: (i) end
              users who use SpinShare to earn compensation for displaying
              advertisements during AI wait-states (&ldquo;Earning Users&rdquo;); (ii)
              advertisers who purchase advertising inventory through our platform
              (&ldquo;Advertisers&rdquo;); and (iii) all other visitors to our website or
              users of our services.
            </p>
            <p>
              If you are using the Service on behalf of an organization, entity, or
              employer, you represent and warrant that you have authority to bind such
              organization to this Agreement, and references to &ldquo;you&rdquo; shall
              include both the individual and the organization.
            </p>
          </LegalSection>

          <LegalSection id={2} title={titles[2] ?? ""}>
            <p>The following terms shall have the meanings set forth below:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-slate-900">&ldquo;Ad Content&rdquo;</strong> or{" "}
                <strong className="text-slate-900">&ldquo;Advertising Materials&rdquo;</strong> means
                any text, images, graphics, links, code, or other materials submitted
                by an Advertiser for display through the Service.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;AI Wait-State&rdquo;</strong> or{" "}
                <strong className="text-slate-900">&ldquo;Wait-State&rdquo;</strong> means the
                period during which an AI coding assistant (such as Anthropic&rsquo;s
                Claude Code or similar products) is processing, reasoning, or
                generating a response, during which time the SpinShare client displays
                sponsored content in place of the loading spinner or progress
                indicator.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Auction&rdquo;</strong> means the
                real-time bidding system through which Advertisers compete for
                placement priority in the display queue.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Bid&rdquo;</strong> means the maximum
                cost-per-thousand-impressions (CPM) an Advertiser offers to pay for
                their campaign.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Campaign&rdquo;</strong> means an
                Advertiser-created record containing ad text, a maximum CPM bid, and a
                remaining budget.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;CPM&rdquo;</strong> means Cost Per
                Mille &mdash; the price an Advertiser agrees to pay per 1,000
                impressions, expressed in US dollars.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Click&rdquo;</strong> means a
                user&rsquo;s affirmative interaction with an advertisement that
                triggers a navigation event to the Advertiser&rsquo;s designated
                destination URL.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Claude Code&rdquo;</strong> means the
                AI coding assistant product developed and operated by Anthropic, PBC,
                whether accessed via Visual Studio Code extension, terminal CLI, or
                other interfaces.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Earnings&rdquo;</strong> or{" "}
                <strong className="text-slate-900">&ldquo;User Earnings&rdquo;</strong> means the
                compensation accrued by an Earning User based on qualifying
                impressions and clicks, calculated as the user&rsquo;s share of the
                revenue generated by advertisements displayed during such user&rsquo;s
                AI wait-states.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Extension&rdquo;</strong> means the
                SpinShare Visual Studio Code (VS Code) extension, IDE plugin, or
                other editor plugin installed by a user to enable the Service.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;CLI Wrapper&rdquo;</strong> means the{" "}
                <code className={codeClass}>spinshare</code>{" "}
                (or successor) NPM package that spawns a target CLI as a child
                process, intercepts spinner output, and injects advertisements on a
                single updating line.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Impression&rdquo;</strong> means a
                single instance of an advertisement being displayed within an AI
                wait-state.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Ledger&rdquo;</strong> means the
                internal accounting record maintained by SpinShare tracking
                impressions, clicks, earnings, and payouts attributable to each user
                or advertiser account.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Payment Threshold&rdquo;</strong> means
                the minimum balance required in a user&rsquo;s account before a
                payout is initiated, as determined by SpinShare in its sole
                discretion.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Platform&rdquo;</strong> means the
                underlying IDE, code editor, or terminal environment (such as Visual
                Studio Code) in which the Extension or CLI Wrapper operates.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Revenue Split&rdquo;</strong> means the
                percentage division of net advertising revenue between SpinShare and
                Earning Users, which is currently sixty percent (60%) to the Earning
                User and forty percent (40%) retained by SpinShare, but which may be
                modified as described in Section 6.4.
              </li>
              <li>
                <strong className="text-slate-900">&ldquo;Velocity Limit&rdquo;</strong> means
                the per-developer rate cap of thirty (30) impressions per minute used
                for anti-fraud enforcement.
              </li>
            </ul>
          </LegalSection>

          <LegalSection id={3} title={titles[3] ?? ""}>
            <LegalSubsection title="3.1 General Requirements">
              You must be at least eighteen (18) years of age and capable of forming
              a binding contract to use the Service. By using the Service, you
              represent and warrant that you meet these requirements and that all
              information you provide is accurate, complete, and current.
            </LegalSubsection>
            <LegalSubsection title="3.2 Employer Authorization">
              If you are installing or using the Service on a device owned or
              controlled by an employer, organization, or other third party, you
              represent and warrant that: (i) you have obtained all necessary
              authorizations from such entity to install software that modifies IDE
              or terminal behavior and displays third-party advertisements; and
              (ii) your use of the Service does not violate any employment
              agreement, company policy, code of conduct, or applicable law.
            </LegalSubsection>
            <LegalSubsection title="3.3 Geographic Restrictions">
              The Service is available only to users located in jurisdictions where
              the Service and its operation are lawful. We reserve the right to
              restrict access to the Service from any jurisdiction at any time. You
              are solely responsible for compliance with all applicable local laws,
              rules, and regulations.
            </LegalSubsection>
            <LegalSubsection title="3.4 Account Limitations">
              Each natural person may maintain only one (1) Earning User account.
              Creation of multiple accounts by a single individual, use of automated
              systems to create accounts, or coordination with others to circumvent
              account limitations constitutes a material breach of this Agreement.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={4} title={titles[4] ?? ""}>
            <LegalSubsection title="4.1 Overview">
              SpinShare operates an advertising marketplace that displays sponsored
              content in place of the loading spinners, status-line text, and
              progress indicators that appear during AI wait-states in supported
              development environments. The Service substitutes, patches, or
              overlays the default progress UI of supported AI coding agents and
              CLIs with sponsored messaging during processing intervals.
            </LegalSubsection>
            <LegalSubsection title="4.2 For Earning Users">
              Upon installing the Extension or CLI Wrapper and completing account
              registration, Earning Users will see sponsored content replace or
              supplement the default spinner or progress text during Claude Code,
              Codex, and other supported AI assistant wait-states. Earning Users
              accumulate credit based on qualifying impressions and clicks, with an
              estimated sixty percent (60%) of attributable net advertising revenue
              credited to their account by default, subject to the Velocity Limit,
              the Revenue Split, and the other conditions set forth herein.
              Earnings are paid out monthly, subject to the Payment Threshold and
              other conditions set forth herein.
            </LegalSubsection>
            <LegalSubsection title="4.3 For Advertisers">
              Advertisers create Campaigns that bid against each other in real time
              for placement priority. The Campaign with the highest active maximum
              CPM bid wins the slot, with ties broken by earliest creation time,
              then lowest campaign identifier. All amounts are non-refundable and
              are considered spent once the corresponding impression or click is
              served. Current rates and parameters are shown in the advertiser
              dashboard at the time of bidding, and SpinShare may adjust this
              methodology from time to time.
            </LegalSubsection>
            <LegalSubsection title="4.4 No Guarantee of Availability">
              We do not guarantee that the Service will be available at all times,
              that impressions will be served continuously, or that any minimum
              level of earnings will be achieved. The Service depends on the usage
              and uptime of third-party platforms (including Visual Studio Code,
              Claude Code, and Anthropic&rsquo;s services) that are outside our
              control.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={5} title={titles[5] ?? ""}>
            <LegalSubsection title="5.1 Account Creation">
              To participate in the Earnings Program or Advertising Program, you
              must create an account by signing in with a supported identity
              provider (currently Google or GitHub). You agree to maintain the
              accuracy of any profile information you provide and to update it
              promptly upon any change. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities
              that occur under your account.
            </LegalSubsection>
            <LegalSubsection title="5.2 Account Security">
              You agree to: (i) keep your identity-provider account secure and
              protected by a strong, unique password and, where available,
              multi-factor authentication; (ii) not share your account credentials
              with any third party; and (iii) immediately notify us of any
              unauthorized use of your account or any other breach of security. We
              will not be liable for any loss or damage arising from your failure
              to comply with these obligations.
            </LegalSubsection>
            <LegalSubsection title="5.3 Account Ownership">
              Accounts are personal to the registered user and may not be
              transferred, sold, or assigned to any third party without our prior
              written consent. Any attempt to transfer an account without
              authorization will result in immediate termination and forfeiture of
              all unpaid earnings.
            </LegalSubsection>
            <LegalSubsection title="5.4 Know Your Business (Advertisers)">
              Advertisers may be required to provide additional verification
              information, including but not limited to: business registration
              documents (where applicable), tax identification numbers, payment
              method verification, and representative identification. Failure to
              provide requested documentation may result in account suspension or
              rejection of advertising campaigns.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={6} title={titles[6] ?? ""}>
            <LegalSubsection title="6.1 Earnings Accrual">
              Earning Users accrue credit based on: (i) qualifying impressions of
              advertisements displayed during AI wait-states on their authenticated
              devices; and (ii) qualifying clicks on such advertisements. The
              current Revenue Split is sixty percent (60%) of per-impression revenue
              (i.e., the Campaign CPM divided by 1,000) attributable to a
              user&rsquo;s impressions and clicks, subject to the Velocity Limit, the
              Revenue Split, and the other terms herein.
            </LegalSubsection>
            <LegalSubsection title="6.2 Qualifying Impressions">
              An impression qualifies for earnings only if: (i) the advertisement
              is displayed during an active AI wait-state on an authenticated
              device; (ii) the Extension or CLI Wrapper is properly installed,
              authenticated, and connected to our servers; (iii) the impression is
              generated by a bona fide, human-initiated AI coding request (not
              automated, scripted, or artificially generated); (iv) the user has
              not exceeded the Velocity Limit or any other applicable cap; and (v)
              the impression is not excluded by our fraud detection systems. A
              denial of a qualifying claim may be appealed or disputed in line with
              the requirements of Section 17 of this Agreement.
            </LegalSubsection>
            <LegalSubsection title="6.3 Usage Caps">
              SpinShare reserves the right, in its sole discretion and without prior
              notice, to establish, modify, or enforce daily, weekly, monthly,
              per-minute, or other periodic caps on: (a) the number of qualifying
              impressions per user; (b) the number of qualifying clicks per user;
              (c) the amount of earnings that may be accrued in a given period;
              and (d) the number of AI wait-states that generate billable
              impressions. The current per-minute cap is the Velocity Limit defined
              in Section 2. Activity exceeding any applicable cap is non-billable
              and does not generate earnings. We may apply caps globally, per
              region, per account tier, or on an individual basis.
            </LegalSubsection>
            <LegalSubsection title="6.4 Revenue Split Adjustments">
              SpinShare reserves the right to adjust the Revenue Split,
              per-impression rates, per-click rates, auction floor prices, and
              payment schedules at any time upon reasonable notice (which may
              include notice posted on our website or via the Extension). Changes
              to revenue terms will apply prospectively and will not affect
              earnings already accrued at the time of change.
            </LegalSubsection>
            <LegalSubsection title="6.5 Payout Mechanics">
              Accrued earnings remain credited to your account balance until
              disbursed. Once payouts are enabled for your account, earnings are
              disbursed monthly (on or about the first of each month), subject to
              the account balance exceeding the then-current Payment Threshold
              (currently US $10.00, subject to change). Payouts are made via
              Stripe Connect, or other payment methods elected by SpinShare. Users
              are responsible for providing accurate payment information and for
              all taxes, fees, and regulatory obligations associated with
              receiving payments. To receive payouts, Earning Users must complete
              Stripe Connect onboarding and provide any tax documentation (such as
              IRS Form W-9 or W-8) requested by the processor.
            </LegalSubsection>
            <LegalSubsection title="6.6 Payout Holds and Corrections">
              All earnings balances are estimates subject to correction,
              reconciliation, and audit. SpinShare reserves the right to: (i)
              withhold payouts pending fraud review or investigation; (ii) deduct
              amounts associated with fraudulent, invalid, or reversed
              transactions; (iii) recover overpaid amounts from future earnings or,
              if necessary, via direct payment demand; and (iv) refuse payout if
              the account is under investigation for suspected violations of this
              Agreement, if payouts to the account would cause sanctions,
              regulatory, or other compliance risks, or if payout to that account
              would otherwise be unlawful.
            </LegalSubsection>
            <LegalSubsection title="6.7 Forfeiture">
              Upon termination of an account for any reason (whether by the user or
              by SpinShare), any unpaid earnings below the Payment Threshold are
              forfeited. If termination results from a breach of this Agreement,
              all unpaid earnings are forfeited regardless of balance. Earning
              Users have no property interest in pending or accrued earnings until
              actually disbursed.
            </LegalSubsection>
            <LegalSubsection title="6.8 Tax Classification & Reporting Obligations">
              <LegalSubsection title="6.8.1 Nature of Payments">
                Payments made to Earning Users represent revenue-sharing
                distributions attributable to the display of third-party
                advertisements through the user&rsquo;s licensed use of the
                SpinShare Extension or CLI Wrapper. SpinShare does not
                characterize these payments as wages, salaries, or compensation
                for services rendered. Users acknowledge that they are not
                employees, independent contractors, or agents of SpinShare. The
                tax classification of these payments (e.g., as royalty income,
                other income, or self-employment income) depends on the
                user&rsquo;s individual circumstances and applicable law.
              </LegalSubsection>
              <LegalSubsection title="6.8.2 U.S. Tax Reporting — Form 1099-MISC">
                For Earning Users who are U.S. persons (as defined by the IRS) and
                who receive payments totaling six hundred dollars ($600) or more
                in a calendar year, our third-party payment processor, Stripe
                Connect, will file IRS Form 1099-MISC (or such other information
                return as may apply) reporting such amounts in Box 3 (Other
                Income). The payment processor will furnish the applicable form
                to each affected Earning User by the deadline required by law
                (generally January 31 of the following calendar year). Tax
                documents may be delivered electronically through the payment
                processor, subject to the user&rsquo;s consent to electronic
                delivery provided during payout-account setup. The payment
                processor may adjust the applicable reporting category or form if
                required by applicable law or IRS guidance.
              </LegalSubsection>
              <LegalSubsection title="6.8.3 No 1099-NEC or Withholding">
                SpinShare does not issue Form 1099-NEC (Nonemployee Compensation)
                and will not treat payments as subject to backup withholding
                except as provided in Section 6.8.6. Users acknowledge that
                SpinShare&rsquo;s classification for reporting purposes does not
                determine the ultimate tax treatment of payments, and users
                bear sole responsibility for proper characterization on their
                tax returns.
              </LegalSubsection>
              <LegalSubsection title="6.8.4 Tax Information Collection — Form W-9">
                As part of Stripe Connect onboarding, and before any payout can
                be processed, U.S. person Earning Users must complete and submit
                IRS Form W-9 (Request for Taxpayer Identification Number and
                Certification) to the payment processor. Failure to provide a
                valid W-9 within thirty (30) days of the processor&rsquo;s
                request will result in a temporary suspension of payouts until
                the form is received.
              </LegalSubsection>
              <LegalSubsection title="6.8.5 International Users — Form W-8BEN / W-8ECI">
                As part of Stripe Connect onboarding, Earning Users who are not
                U.S. persons must complete IRS Form W-8BEN (Certificate of
                Foreign Status of Beneficial Owner) or Form W-8ECI (Certificate
                of Foreign Person&rsquo;s Claim for Exemption from Withholding
                on Income Effectively Connected with the Conduct of a Trade or
                Business in the United States), as applicable. Foreign persons
                receiving payments from U.S. sources may be subject to
                withholding at a rate of up to thirty percent (30%) on gross
                payments, unless a reduced rate applies under an applicable
                income tax treaty between the United States and the
                recipient&rsquo;s country of residence. The payment processor
                will withhold at the applicable statutory rate unless a valid
                W-8BEN claiming treaty benefits is on file with the processor.
                Users are responsible for providing accurate treaty claim
                information and understanding their home country&rsquo;s tax
                obligations.
              </LegalSubsection>
              <LegalSubsection title="6.8.6 Backup Withholding">
                In accordance with IRC Section 3406, our third-party payment
                processor is required to impose backup withholding at the rate
                of twenty-four percent (24%) on reportable payments to any payee
                who: (i) fails to furnish a valid Taxpayer Identification Number
                (TIN); (ii) has been notified by the IRS of a failure to report
                all interest or dividends; or (iii) has provided an incorrect
                TIN. If the payment processor receives a notice from the IRS
                requiring backup withholding on a user&rsquo;s account, all
                subsequent payouts to that user will be subject to backup
                withholding until the IRS issues a notice of cessation or the
                user provides a corrected W-9.
              </LegalSubsection>
              <LegalSubsection title="6.8.7 User Tax Obligations">
                Regardless of whether SpinShare issues an information return,
                all distributions received through the Service constitute gross
                income to the recipient under the Internal Revenue Code (and
                foreign equivalents), and users are solely responsible for: (i)
                reporting all payments on their applicable tax returns; (ii)
                paying all applicable federal, state, local, and foreign income
                taxes; (iii) remitting self-employment tax if the
                user&rsquo;s activities constitute a trade or business; (iv)
                making estimated tax payments if required; and (v) maintaining
                records sufficient to substantiate income and any claimed
                deductions.
              </LegalSubsection>
              <LegalSubsection title="6.8.8 No Tax Advice">
                Nothing in this Agreement or on the SpinShare website constitutes
                tax, legal, or accounting advice. Users are strongly encouraged
                to consult with their own tax advisors regarding the
                characterization and reporting of payments received through the
                Service. SpinShare disclaims all liability for any tax positions
                taken (or not taken) by users.
              </LegalSubsection>
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={7} title={titles[7] ?? ""}>
            <LegalSubsection title="7.1 Campaign Creation & Bidding">
              Advertisers may create Campaigns by submitting Ad Content and a
              maximum CPM bid through our platform. The Campaign with the highest
              active maximum CPM bid wins each ad slot; ties are broken by
              earliest creation time, then lowest campaign identifier.
              Advertisers may increase their bid at any time to improve
              placement priority.
            </LegalSubsection>
            <LegalSubsection title="7.2 Non-Refundable Bids">
              ALL BIDS ARE FINAL AND NON-REFUNDABLE ONCE AN IMPRESSION HAS BEEN
              SERVED. Advertisers acknowledge that bids represent a binding
              commitment to pay for impressions delivered. Notwithstanding the
              foregoing, SpinShare may, in its sole discretion, issue credits for
              impressions that our systems determine were not delivered in
              accordance with campaign parameters.
            </LegalSubsection>
            <LegalSubsection title="7.3 Ad Content Requirements">
              Advertisers warrant and represent that all Ad Content: (i) complies
              with all applicable laws, regulations, and industry standards;
              (ii) does not infringe upon any intellectual property rights; (iii)
              is not false, misleading, deceptive, or defamatory; (iv) does not
              promote illegal products, services, or activities; (v) does not
              contain malware, phishing links, or other harmful code; and (vi)
              complies with the content requirements of this Agreement, including
              Section 7.4.
            </LegalSubsection>
            <LegalSubsection title="7.4 Content Prohibitions">
              Without limitation, Ad Content may not: promote gambling (where
              prohibited); promote alcohol, tobacco, or controlled substances in
              violation of law; contain adult content, hate speech, or
              discriminatory material; make unsubstantiated health or financial
              claims; impersonate SpinShare or any third party; or violate the
              intellectual property, privacy, or publicity rights of any person
              or entity.
            </LegalSubsection>
            <LegalSubsection title="7.5 Right to Reject or Remove">
              SpinShare reserves the right, in its sole discretion and without
              liability, to reject, remove, or suspend any Ad Content or campaign
              for any reason or no reason, including but not limited to
              violations of this Agreement, complaints from users, or concerns
              about brand safety. No refund or credit will be provided for
              removed campaigns unless SpinShare determines, in its sole
              discretion, that removal was erroneous. Advertisers may appeal a
              removal or suspension within thirty (30) days by contacting
              support@learnx.pro. SpinShare will review the appeal and, if it
              determines the action was erroneous, reinstate the campaign and/or
              issue a credit. All appeal decisions are final.
            </LegalSubsection>
            <LegalSubsection title="7.6 Advertiser Indemnification for Content">
              Advertisers expressly indemnify and hold harmless SpinShare from any
              and all claims, damages, losses, and expenses (including reasonable
              attorneys&rsquo; fees) arising out of or relating to: (i) the
              content, accuracy, or legality of Ad Content; (ii) the products or
              services promoted; (iii) the destination websites or landing pages
              linked from advertisements; and (iv) any misrepresentation or
              breach of warranty by the Advertiser.
            </LegalSubsection>
            <LegalSubsection title="7.7 Click Billing">
              Where clicks are separately billed for a campaign, the per-click
              price is a multiple of the campaign&rsquo;s effective
              per-impression price. This multiple is not fixed and may be
              adjusted by SpinShare from time to time; current rates are shown
              in the advertiser dashboard. A &ldquo;click&rdquo; is recorded when
              a user affirmatively interacts with an advertisement in a manner
              that initiates navigation to the Advertiser&rsquo;s designated
              URL. SpinShare makes no representation or warranty regarding
              conversion rates, return on investment, or business outcomes
              from advertising campaigns.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={8} title={titles[8] ?? ""}>
            <LegalSubsection title="8.1 Advertiser Payment Obligations">
              Advertisers agree to pay all charges incurred in connection with
              their account, including all impressions served and clicks
              recorded. Payment is due in accordance with the billing terms
              selected during campaign setup (typically prepayment of a Campaign
              budget via Stripe Checkout, with impressions deducted as they are
              served). Failure to pay outstanding balances may result in account
              suspension, campaign termination, and referral to collections.
            </LegalSubsection>
            <LegalSubsection title="8.2 Payment Methods">
              SpinShare accepts payment via Stripe Checkout, operated by our
              third-party payment processor, Stripe, Inc. By providing payment
              information, you represent and warrant that you are authorized to
              use the designated payment method. You authorize us to charge your
              payment method for all charges incurred.
            </LegalSubsection>
            <LegalSubsection title="8.3 Late Payments">
              Payments not received by the due date are subject to a late fee of
              2.5% per month (or the maximum amount permitted by law, if lower)
              on the outstanding balance. SpinShare reserves the right to
              suspend all campaigns and terminate accounts for persistent
              non-payment.
            </LegalSubsection>
            <LegalSubsection title="8.4 Chargebacks and Disputes">
              Advertisers must notify SpinShare of any billing disputes in
              writing, within thirty (30) days of the charge date. Undisputed
              portions will be paid promptly. Initiating a chargeback or payment
              dispute without first attempting to resolve the issue with
              SpinShare constitutes a material breach of this Agreement and may
              result in immediate account holds or termination.
            </LegalSubsection>
            <LegalSubsection title="8.5 User Payout Terms">
              Earning Users may request account deletion and payout of accrued
              earnings (subject to the Payment Threshold) by contacting
              support@learnx.pro, or through the account settings interface
              where available. Payout requests are processed within thirty (30)
              business days. We reserve the right to delay payouts pending
              completion of fraud review or verification of payment information.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={9} title={titles[9] ?? ""}>
            <LegalSubsection title="9.1 Strict Prohibition on Fraud">
              <p>
                SpinShare maintains a zero-tolerance policy for fraud, abuse, and
                manipulation. The following activities are strictly prohibited
                and constitute material breaches of this Agreement:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <strong className="text-slate-900">Click Fraud.</strong> Any
                  attempt to generate artificial clicks, including but not
                  limited to: automated clicking scripts, click farms,
                  paid-to-click schemes, coordinated clicking networks, or any
                  mechanism designed to inflate click counts artificially.
                </li>
                <li>
                  <strong className="text-slate-900">Impression Manipulation.</strong>{" "}
                  Any attempt to generate artificial impressions, including:
                  using automated tools to trigger AI wait-states, running
                  meaningless or repetitive prompts solely to generate ad views,
                  botting or scripting IDE or terminal interactions, or
                  colluding with others to inflate impression counts.
                </li>
                <li>
                  <strong className="text-slate-900">Velocity Circumvention.</strong>{" "}
                  Any attempt to bypass the Velocity Limit or other rate caps,
                  including through credential sharing, multiple-account usage,
                  or coordinated activity.
                </li>
                <li>
                  <strong className="text-slate-900">Multi-Account Abuse.</strong>{" "}
                  Creation or use of multiple accounts by a single individual,
                  coordination with others to operate account networks, or use
                  of shared credentials across multiple users to aggregate
                  earnings.
                </li>
                <li>
                  <strong className="text-slate-900">Metric Manipulation.</strong>{" "}
                  Any attempt to interfere with, alter, or falsify telemetry
                  data, impression counts, click events, or any other metric
                  used to calculate earnings or advertising charges.
                </li>
                <li>
                  <strong className="text-slate-900">Reverse Engineering.</strong>{" "}
                  Any attempt to decompile, disassemble, reverse engineer, or
                  otherwise derive source code from the Extension or CLI
                  Wrapper; or to intercept, modify, or spoof communications
                  between the client and SpinShare servers, except as permitted
                  by applicable open-source licenses.
                </li>
                <li>
                  <strong className="text-slate-900">Circumvention.</strong> Any
                  attempt to circumvent usage caps, geographic restrictions,
                  account limitations, or other technical or policy controls
                  implemented by SpinShare.
                </li>
              </ul>
            </LegalSubsection>
            <LegalSubsection title="9.2 Detection and Investigation">
              SpinShare may employ automated systems and manual review
              processes to detect fraudulent or abusive activity. These systems
              analyze patterns including but not limited to: prompt frequency,
              session duration, click timing, account relationships, and
              behavioral anomalies. Users acknowledge and agree that their use
              of the Service will be monitored for fraud prevention purposes.
            </LegalSubsection>
            <LegalSubsection title="9.3 Enforcement Actions">
              Upon detection or reasonable suspicion of fraud or abuse, SpinShare
              may, in its sole discretion and without prior notice: (i) suspend
              or terminate the affected account(s); (ii) void all or a portion
              of ledger entries associated with fraudulent activity; (iii)
              withhold or reverse pending payouts; (iv) recover funds previously
              paid out for fraudulent activity, including by offsetting against
              future earnings or initiating direct collection proceedings; (v)
              permanently ban the user from the Service; and (vi) refer the
              matter to law enforcement or regulatory authorities.
            </LegalSubsection>
            <LegalSubsection title="9.4 Burden of Proof">
              In any dispute regarding the legitimacy of impressions, clicks, or
              earnings, SpinShare&rsquo;s determination based on its internal
              records and detection systems shall be presumptively valid. The
              user bears the burden of proving, by clear and convincing evidence,
              that disputed activity was legitimate.
            </LegalSubsection>
            <LegalSubsection title="9.5 Clawback Rights">
              If fraudulent activity is detected after payout has occurred,
              SpinShare reserves the right to recover paid funds. Recovery
              methods include: deduction from future earnings; chargeback to
              the user&rsquo;s registered payment method (if on file); direct
              payment demand; and referral to collections. Users consent to such
              recovery methods upon accepting this Agreement.
            </LegalSubsection>
            <LegalSubsection title="9.6 Good Faith Overpayment">
              If SpinShare determines that earnings were overstated due to
              technical error, system malfunction, or miscalculation
              (independent of user misconduct), we reserve the right to correct
              the Ledger and recover overpaid amounts, provided such correction
              is made within ninety (90) days of the overpayment.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={10} title={titles[10] ?? ""}>
            <LegalSubsection title="10.1 Scope of Data Collection">
              SpinShare collects and processes only the data necessary to credit
              earnings, bill advertisers, prevent fraud, and operate and improve
              the Service. For each advertisement served, we record event
              telemetry consisting of: the event type (for example, impression
              rendered, impression viewable, view-duration ticks, and clicks);
              the associated advertisement, campaign, and creative identifiers;
              the surface on which the advertisement was displayed (for example,
              spinner, status line, progress notification, or overlay);
              on-screen visibility metrics (such as viewable percentage and
              visible duration); a per-installation client identifier; a
              per-event identifier (UUID) used to deduplicate and reconcile
              events; timestamps; the client version and the host application
              version (for example, the SpinShare, Claude Code, or Visual Studio
              Code version); and, for signed-in Earning Users, an account
              identifier used to attribute credit. We also process your
              internet protocol (IP) address on a transient basis for
              rate-limiting, abuse-detection, and fraud-prevention purposes.
            </LegalSubsection>
            <LegalSubsection title="10.2 What We Do NOT Collect">
              SpinShare does not and will not collect, access, process, or
              store: (i) the content of your code, prompts, or queries
              submitted to AI coding assistants; (ii) AI responses, generated
              code, or model outputs; (iii) your context windows, conversation
              history, files, or project contents; (iv) personal information
              beyond what is necessary for account creation, payment
              processing, tax compliance, and fraud prevention; or (v) any data
              that could reveal your trade secrets, proprietary source code, or
              confidential business information.
            </LegalSubsection>
            <LegalSubsection title="10.3 Billable Telemetry">
              Participation in the Earnings Program requires consent to billable
              telemetry collection. This telemetry is strictly limited to the
              pseudonymous metrics described in Section 10.1 and is necessary
              for crediting earnings and detecting fraud. Withdrawal of
              telemetry consent will result in immediate cessation of earnings
              accrual, though previously accrued earnings (if eligible for
              payout) will be disbursed.
            </LegalSubsection>
            <LegalSubsection title="10.4 Data Retention">
              Individual account data is retained for 7 years following account
              termination or 7 years from the last account activity, whichever
              is longer, for fraud prevention, financial reconciliation, and
              legal compliance purposes. Aggregated data may be retained
              indefinitely for analytics and service improvement, and anonymized
              to the extent practicable or required.
            </LegalSubsection>
            <LegalSubsection title="10.5 Data Deletion Requests">
              Users may request deletion of their account and associated
              personal data by contacting support@learnx.pro. Upon deletion:
              (i) personal identifiers will be removed or anonymized within 30
              days; (ii) aggregated, anonymized data derived from the account
              may be retained; (iii) financial records required by law will be
              retained as mandated; and (iv) anonymized impression and click
              data necessary for advertiser billing reconciliation will be
              retained in non-identifiable form.
            </LegalSubsection>
            <LegalSubsection title="10.6 Third-Party Processors">
              SpinShare utilizes third-party service providers for payment
              processing, analytics, hosting, and customer support. These
              currently include Stripe (payment processing and payouts), Google
              Cloud / Firebase (hosting, authentication, and data storage),
              Twilio SendGrid (transactional email), and a website usage
              analytics provider, though providers are subject to change. By
              using the Service, you consent to the engagement of these
              subprocessors subject to appropriate data protection agreements.
            </LegalSubsection>
            <LegalSubsection title="10.7 Security Measures">
              SpinShare maintains technical and organizational measures
              designed to protect collected data against unauthorized access,
              disclosure, alteration, and destruction &mdash; including
              encryption of data in transit (TLS) and at rest, role-based
              access controls on a least-privilege basis, dedicated secrets
              management (rather than plaintext configuration), logging,
              monitoring, and rate-limiting to detect fraud and abuse, and
              periodic security assessments. SpinShare further limits its
              exposure by design: as described in Section 10.2, it does not
              collect the content of your code, prompts, or AI interactions.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={11} title={titles[11] ?? ""}>
            <LegalSubsection title="11.1 Extension and CLI Wrapper Modification Acknowledgment">
              USERS EXPRESSLY ACKNOWLEDGE AND UNDERSTAND THAT THE SPINSHARE
              EXTENSION AND CLI WRAPPER OPERATE BY MODIFYING, PATCHING, OR
              INTEGRATING WITH THE INTERNAL RENDERING MECHANISMS OF
              THIRD-PARTY SOFTWARE, INCLUDING BUT NOT LIMITED TO ANTHROPIC&rsquo;S
              CLAUDE CODE EXTENSION, VISUAL STUDIO CODE, AND TARGET CLI TOOLS.
              THIS MODIFICATION MAY INVOLVE: (i) intercepting or overriding UI
              rendering calls; (ii) substituting status-line or spinner content
              during wait-states; and (iii) injecting remotely served content
              into the editor or terminal interface.
            </LegalSubsection>
            <LegalSubsection title="11.2 Third-Party Terms of Service">
              Installation and use of the SpinShare Extension and CLI Wrapper by
              users should not violate the terms of service, end-user license
              agreements, or acceptable use policies of Anthropic, Microsoft
              (Visual Studio Code), OpenAI, GitHub, or other third-party
              platforms. USERS BEAR SOLE RESPONSIBILITY FOR ENSURING THAT THEIR
              USE OF SPINSHARE COMPLIES WITH ALL APPLICABLE THIRD-PARTY TERMS.
              SpinShare does not represent or warrant that any use of the
              Extension or CLI Wrapper is permitted by any third-party platform.
            </LegalSubsection>
            <LegalSubsection title="11.3 Platform Changes & Service Disruption">
              Third-party platforms (including Anthropic and Microsoft) may, at
              any time: (i) modify their software, APIs, or extension
              architecture; (ii) implement technical measures that block,
              disable, or interfere with the SpinShare Extension or CLI Wrapper;
              (iii) update their terms of service to prohibit SpinShare&rsquo;s
              mode of operation; or (iv) take enforcement action against users
              who have installed the Extension or CLI Wrapper, including
              suspension or termination of their accounts with the third-party
              platform.
            </LegalSubsection>
            <LegalSubsection title="11.4 No Affiliation">
              SpinShare is not affiliated with, endorsed by, sponsored by, or
              otherwise associated with Anthropic, Microsoft, OpenAI, GitHub, or
              any other third-party platform provider. References to Claude
              Code, Visual Studio Code, or other products are for descriptive
              purposes only and do not imply any relationship with the
              respective trademark owners.
            </LegalSubsection>
            <LegalSubsection title="11.5 User Assumption of Risk">
              BY INSTALLING AND USING THE EXTENSION OR CLI WRAPPER, YOU
              EXPRESSLY ASSUME ALL RISKS ASSOCIATED WITH THIRD-PLATFORM
              INTERACTIONS, INCLUDING: (i) the risk that your Anthropic,
              Microsoft, or other platform account may be suspended or
              terminated; (ii) the risk of data loss or service interruption;
              (iii) the risk that the Extension or CLI Wrapper may conflict
              with other extensions, plugins, or IDE functionality; and (iv)
              the risk of security vulnerabilities arising from the
              client&rsquo;s interaction with third-party software.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={12} title={titles[12] ?? ""}>
            <LegalSubsection title="12.1 Termination by User">
              You may terminate your account at any time by contacting
              support@learnx.pro and requesting deletion. Termination does
              not relieve you of obligations incurred prior to termination and
              does not affect provisions that by their nature survive
              termination.
            </LegalSubsection>
            <LegalSubsection title="12.2 Termination by SpinShare">
              SpinShare reserves the right, in its sole discretion and without
              prior notice, to suspend or terminate any account, restrict
              access to the Service, or discontinue service to any user or
              advertiser for any reason or no reason, including but not
              limited to: violation of this Agreement; suspected fraud or
              abuse; request by law enforcement or regulatory authority;
              extended period of inactivity; or business discontinuation.
            </LegalSubsection>
            <LegalSubsection title="12.3 Termination for Cause">
              Without limiting Section 12.2, SpinShare may immediately
              terminate any account upon: (i) material breach of this
              Agreement; (ii) detection of fraud, abuse, or manipulation;
              (iii) use of the Service for unlawful purposes; (iv) actions
              that expose SpinShare to legal liability; or (v) repeated
              violations of acceptable use policies. Termination for cause
              results in immediate forfeiture of all unpaid earnings and
              potential liability for damages.
            </LegalSubsection>
            <LegalSubsection title="12.4 Effect of Termination">
              Upon termination: (i) all licenses granted herein immediately
              terminate; (ii) you must cease all use of the Service and
              uninstall the Extension and CLI Wrapper; (iii) accrued earnings
              below the Payment Threshold are forfeited; (iv) we may delete
              your account data in accordance with Section 10.5; and (v) any
              provisions intended by their nature to survive termination
              shall survive.
            </LegalSubsection>
            <LegalSubsection title="12.5 No Right to Reinstatement">
              Terminated users have no right to reinstatement. SpinShare may,
              in its sole discretion, permit creation of a new account by a
              previously terminated user, provided all outstanding
              obligations have been satisfied.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={13} title={titles[13] ?? ""}>
            <LegalSubsection title="13.1 SpinShare Ownership">
              All right, title, and interest in and to the Service, including
              the Extension, CLI Wrapper, website, software, algorithms, auction
              systems, analytics, trademarks, trade dress, and all associated
              intellectual property, are and shall remain the exclusive property
              of SpinShare and its licensors. This Agreement does not convey
              any ownership interest in the Service or its components.
            </LegalSubsection>
            <LegalSubsection title="13.2 Limited License to Users">
              Subject to your compliance with this Agreement, SpinShare grants
              you a limited, non-exclusive, non-transferable, revocable
              license to: (i) install and use the Extension and CLI Wrapper
              solely for their intended purpose; and (ii) access and use the
              website and platform features. This license does not permit:
              modification, distribution, derivative works, reverse
              engineering, decompilation, or removal of proprietary notices,
              except as permitted by applicable open-source licenses covering
              the Extension or CLI Wrapper.
            </LegalSubsection>
            <LegalSubsection title="13.3 Advertiser Content License">
              By submitting Ad Content, Advertisers grant SpinShare a
              worldwide, non-exclusive, royalty-free license to: (i)
              reproduce, display, and transmit Ad Content through the Service;
              (ii) modify Ad Content solely as necessary for technical
              formatting; and (iii) use Advertiser&rsquo;s name and trademarks
              solely in connection with the display of advertisements. This
              license terminates when the associated Campaign ends or the
              account is terminated.
            </LegalSubsection>
            <LegalSubsection title="13.4 Feedback">
              Any feedback, suggestions, or ideas you provide regarding the
              Service may be used by SpinShare without restriction,
              compensation, or attribution. You hereby assign to SpinShare all
              right, title, and interest in such feedback.
            </LegalSubsection>
            <LegalSubsection title="13.5 Open Source">
              Portions of the Extension and CLI Wrapper may be released under
              open-source licenses. Nothing in this Agreement restricts your
              rights granted by such licenses. In the event of a conflict
              between this Agreement and an applicable open-source license,
              the open-source license controls with respect to the covered
              code.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={14} title={titles[14] ?? ""}>
            <LegalSubsection title="14.1 Service Provided &ldquo;As Is&rdquo;">
              THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND
              &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY
              LAW, SPINSHARE DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT
              LIMITED TO: IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE, NON-INFRINGEMENT, TITLE, AND ANY
              WARRANTIES ARISING FROM COURSE OF DEALING, COURSE OF
              PERFORMANCE, OR TRADE USAGE.
            </LegalSubsection>
            <LegalSubsection title="14.2 No Guarantee of Results">
              SPINSHARE DOES NOT WARRANT THAT: (i) the Service will meet your
              requirements or expectations; (ii) earnings will reach any
              particular level; (iii) advertising campaigns will achieve any
              business results; (iv) the Service will be uninterrupted, timely,
              secure, or error-free; (v) defects will be corrected; or (vi)
              the Service is free of viruses or other harmful components.
            </LegalSubsection>
            <LegalSubsection title="14.3 Third-Party Content">
              SpinShare does not endorse, verify, or assume responsibility for
              any Ad Content, destination websites, or third-party products
              or services advertised through the Service. All transactions
              between users and advertisers are solely between those parties.
            </LegalSubsection>
            <LegalSubsection title="14.4 Extension and CLI Wrapper Risks">
              SPINSHARE MAKES NO WARRANTY THAT THE EXTENSION OR CLI WRAPPER
              WILL NOT CONFLICT WITH, INTERFERE WITH, OR DAMAGE OTHER
              SOFTWARE, EXTENSIONS, PLUGINS, FILES, OR SYSTEMS. YOU ASSUME
              ALL RISK OF DATA LOSS OR SYSTEM HARM ARISING FROM INSTALLATION
              OR USE OF THE EXTENSION OR CLI WRAPPER.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={15} title={titles[15] ?? ""}>
            <LegalSubsection title="15.1 Exclusion of Consequential Damages">
              TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL
              SPINSHARE, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES,
              AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY
              DAMAGES, INCLUDING BUT NOT LIMITED TO: LOST PROFITS, LOST
              REVENUE, LOST DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION,
              COMPUTER DAMAGE, SYSTEM FAILURE, OR COST OF SUBSTITUTE SERVICES,
              ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT OR THE USE
              OF THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY.
            </LegalSubsection>
            <LegalSubsection title="15.2 Liability Cap">
              SPINSHARE&rsquo;S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR
              RELATING TO THIS AGREEMENT SHALL NOT EXCEED THE GREATER OF:
              (i) THE AMOUNT PAID BY YOU TO SPINSHARE IN THE TWELVE (12)
              MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY; OR (ii)
              ONE HUNDRED UNITED STATES DOLLARS ($100.00).
            </LegalSubsection>
            <LegalSubsection title="15.3 Essential Purpose">
              THE LIMITATIONS OF LIABILITY SET FORTH IN THIS SECTION 15
              SHALL APPLY REGARDLESS OF WHETHER SPINSHARE HAS BEEN ADVISED
              OF THE POSSIBILITY OF SUCH DAMAGES AND REGARDLESS OF WHETHER
              THE LIMITED REMEDIES FAIL OF THEIR ESSENTIAL PURPOSE.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={16} title={titles[16] ?? ""}>
            <LegalSubsection title="16.1 User Indemnification">
              You agree to defend, indemnify, and hold harmless SpinShare and
              its affiliates, officers, directors, employees, and agents from
              and against any and all claims, damages, losses, liabilities,
              costs, and expenses (including reasonable attorneys&rsquo;
              fees) arising out of or relating to: (i) your use of the
              Service; (ii) your violation of this Agreement or any
              third-party terms; (iii) any dispute between you and your
              employer or any third party regarding your installation or use
              of the Extension or CLI Wrapper; (iv) any claim by Anthropic,
              Microsoft, or other platform provider arising from your use of
              the Service; and (v) your violation of any applicable law or
              regulation.
            </LegalSubsection>
            <LegalSubsection title="16.2 Advertiser Indemnification">
              Advertisers agree to defend, indemnify, and hold harmless
              SpinShare from and against any and all claims, damages, losses,
              and expenses arising out of or relating to: (i) Ad Content and
              the products or services promoted; (ii) destination websites and
              landing pages; (iii) infringement of intellectual property or
              other rights; (iv) false, misleading, or deceptive advertising
              claims; and (v) breach of any representation or warranty herein.
            </LegalSubsection>
            <LegalSubsection title="16.3 Indemnification Procedure">
              SpinShare will provide prompt notice of any claim subject to
              indemnification. The indemnifying party will have the right to
              control the defense and settlement of such claim, provided that
              SpinShare may participate with counsel of its own choosing at
              its own expense. The indemnifying party will not settle any
              claim in a manner that adversely affects SpinShare&rsquo;s
              rights without prior written consent.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={17} title={titles[17] ?? ""}>
            <LegalSubsection title="17.1 Informal Resolution">
              Before initiating any formal dispute resolution proceeding, you
              agree to first contact SpinShare informally to attempt to
              resolve the dispute. Both parties agree to negotiate in good
              faith for a period of at least thirty (30) days following
              written notice of the dispute.
            </LegalSubsection>
            <LegalSubsection title="17.2 Binding Arbitration">
              EXCEPT FOR DISPUTES RELATING TO INTELLECTUAL PROPERTY RIGHTS
              OR CLAIMS FOR INJUNCTIVE RELIEF, ANY DISPUTE ARISING OUT OF
              OR RELATING TO THIS AGREEMENT SHALL BE RESOLVED THROUGH
              BINDING ARBITRATION ADMINISTERED BY THE AMERICAN ARBITRATION
              ASSOCIATION (&ldquo;AAA&rdquo;) IN ACCORDANCE WITH ITS COMMERCIAL
              ARBITRATION RULES. THE ARBITRATION SHALL BE CONDUCTED BY VIDEO
              CONFERENCE OR, IF A HEARING IS REQUIRED, IN A MUTUALLY AGREED
              LOCATION. JUDGMENT ON THE AWARD MAY BE ENTERED IN ANY COURT
              OF COMPETENT JURISDICTION.
            </LegalSubsection>
            <LegalSubsection title="17.3 Class Action Waiver">
              YOU AGREE THAT ANY PROCEEDINGS, WHETHER IN ARBITRATION OR
              COURT, WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT
              IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. YOU WAIVE
              ANY RIGHT TO PARTICIPATE IN CLASS ACTIONS, PRIVATE ATTORNEY
              GENERAL ACTIONS, OR CLASS-WIDE ARBITRATION.
            </LegalSubsection>
            <LegalSubsection title="17.4 Jury Trial Waiver">
              TO THE EXTENT PERMITTED BY LAW, BOTH PARTIES WAIVE ANY RIGHT
              TO A JURY TRIAL IN ANY LEGAL PROCEEDING ARISING OUT OF OR
              RELATING TO THIS AGREEMENT.
            </LegalSubsection>
            <LegalSubsection title="17.5 Governing Law">
              This Agreement shall be governed by and construed in accordance
              with the laws of the State of California, without regard to
              its conflict of law principles.
            </LegalSubsection>
            <LegalSubsection title="17.6 Injunctive Relief">
              Notwithstanding the arbitration provisions above, either party
              may seek injunctive or other equitable relief in any court of
              competent jurisdiction to prevent irreparable harm pending
              arbitration.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={18} title={titles[18] ?? ""}>
            <LegalSubsection title="18.1 Scope">
              This Section supplements the privacy disclosures in the Privacy
              Policy and describes rights that may apply to you depending on
              where you live. The applicable rights depend on your
              jurisdiction and our obligations under the relevant law.
            </LegalSubsection>
            <LegalSubsection title="18.2 California (CCPA / CPRA)">
              If you are a California resident, you have the right to: (i)
              request disclosure of the categories and specific pieces of
              personal information we have collected; (ii) request deletion
              of personal information; (iii) request correction of inaccurate
              personal information; (iv) opt out of the sale or sharing of
              personal information; and (v) not receive discriminatory
              treatment for exercising these rights. SpinShare does not sell
              or share personal information as those terms are defined under
              the CCPA. To exercise these rights, contact us at the address
              in Section 22.
            </LegalSubsection>
            <LegalSubsection title="18.3 European Union & United Kingdom (GDPR / UK GDPR)">
              If you are in the EU or UK, our legal bases for processing are:
              performance of a contract (providing the Service and crediting
              earnings), our legitimate interests (operating, securing, and
              improving the Service, preventing fraud), and legal obligation
              (tax, accounting, and compliance). You have the right to
              access, rectify, erase, restrict, or object to processing of
              your personal data, and the right to data portability. You also
              have the right to lodge a complaint with a supervisory
              authority in your jurisdiction.
            </LegalSubsection>
            <LegalSubsection title="18.4 Canada (PIPEDA)">
              If you are in Canada, you may request access to, and correction
              of, your personal information under the Personal Information
              Protection and Electronic Documents Act (&ldquo;PIPEDA&rdquo;)
              and applicable provincial privacy laws. To exercise these
              rights, contact us at support@learnx.pro. If you are not
              satisfied with our response, you may contact the Office of the
              Privacy Commissioner of Canada.
            </LegalSubsection>
            <LegalSubsection title="18.5 Other U.S. State Privacy Laws">
              Residents of Virginia (VCDPA), Colorado (CPA), Connecticut
              (CTDPA), Utah (UCPA), and other U.S. states with comparable
              privacy laws may have additional rights, including the right
              to confirm whether we are processing your personal information,
              to access and correct that information, to obtain a portable
              copy, and to opt out of targeted advertising or the sale of
              personal information (neither of which we do). To exercise
              rights under these laws, contact us at support@learnx.pro.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={19} title={titles[19] ?? ""}>
            <LegalSubsection title="19.1 Designated Agent">
              SpinShare respects intellectual property rights and complies
              with the DMCA. If you believe that material available through
              the Service infringes your copyright, you may submit a
              notification to our Designated Copyright Agent:{" "}
              <a
                href="mailto:support@learnx.pro"
                className="font-bold text-emerald-700 underline-offset-2 hover:underline"
              >
                support@learnx.pro
              </a>
              .
            </LegalSubsection>
            <LegalSubsection title="19.2 DMCA Notice Requirements">
              All DMCA notices must include: (i) a physical or electronic
              signature of the copyright owner or authorized agent;
              (ii) identification of the copyrighted work claimed to have
              been infringed; (iii) identification of the infringing
              material and its location; (iv) contact information; (v) a
              statement of good faith belief; and (vi) a statement under
              penalty of perjury.
            </LegalSubsection>
            <LegalSubsection title="19.3 Counter-Notice">
              If you believe your content was removed in error, you may
              submit a counter-notice containing: (i) your signature;
              (ii) identification of the removed material; (iii) a
              statement under penalty of perjury; (iv) your contact
              information; and (v) consent to jurisdiction.
            </LegalSubsection>
            <LegalSubsection title="19.4 Repeat Infringers">
              SpinShare will terminate the accounts of repeat copyright
              infringers in appropriate circumstances.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={20} title={titles[20] ?? ""}>
            <LegalSubsection title="20.1 Right to Modify">
              SpinShare reserves the right to modify this Agreement at any
              time. Except as provided in Section 20.2 for material changes,
              changes become effective upon posting of the revised Agreement
              on our website or through the Extension. The &ldquo;Last
              Updated&rdquo; date at the top of this Agreement indicates
              when changes were last made.
            </LegalSubsection>
            <LegalSubsection title="20.2 Notice of Material Changes">
              For material changes to: (i) the Revenue Split or earnings
              calculation methodology; (ii) data collection practices;
              (iii) dispute resolution procedures; or (iv) liability
              limitations, we will provide at least thirty (30) days&rsquo;
              notice before the changes take effect. Notice may be provided
              via email, Extension notification, or website posting.
            </LegalSubsection>
            <LegalSubsection title="20.3 Continued Use as Acceptance">
              Your continued use of the Service after any modification
              constitutes acceptance of the modified terms. If you do not
              agree to modified terms, you must discontinue use and
              uninstall the Extension and CLI Wrapper.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={21} title={titles[21] ?? ""}>
            <LegalSubsection title="21.1 Entire Agreement">
              This Agreement constitutes the entire agreement between you
              and SpinShare regarding the Service and supersedes all prior
              agreements, understandings, and representations.
            </LegalSubsection>
            <LegalSubsection title="21.2 Severability">
              If any provision of this Agreement is held invalid or
              unenforceable, the remaining provisions shall continue in
              full force and effect, and the invalid provision shall be
              modified to the minimum extent necessary to make it
              enforceable.
            </LegalSubsection>
            <LegalSubsection title="21.3 Waiver">
              No waiver of any provision shall be effective unless in
              writing signed by the waiving party. Failure to enforce any
              right shall not constitute a waiver of future enforcement.
            </LegalSubsection>
            <LegalSubsection title="21.4 Assignment">
              You may not assign this Agreement without prior written
              consent. SpinShare may assign this Agreement in connection
              with a merger, acquisition, or sale of assets.
            </LegalSubsection>
            <LegalSubsection title="21.5 Force Majeure">
              SpinShare shall not be liable for failure or delay in
              performance due to causes beyond its reasonable control,
              including acts of God, war, terrorism, riots, embargoes, acts
              of civil or military authorities, fire, floods, accidents,
              strikes, or shortages of transportation, facilities, fuel,
              energy, labor, or materials.
            </LegalSubsection>
            <LegalSubsection title="21.6 Headings">
              Section headings are for convenience only and have no legal
              effect.
            </LegalSubsection>
            <LegalSubsection title="21.7 Notices">
              Notices to SpinShare must be sent to the email in Section 22.
              Notices to users may be sent to the email address associated
              with the account or posted on the website.
            </LegalSubsection>
            <LegalSubsection title="21.8 Export Compliance">
              You represent that you are not located in a country subject
              to U.S. or other applicable embargo or designated as a
              &ldquo;terrorist supporting&rdquo; country, and are not
              listed on any U.S. or other applicable government prohibited
              or restricted party list.
            </LegalSubsection>
            <LegalSubsection title="21.9 Electronic Communications">
              By using the Service, you consent to receive electronic
              communications from SpinShare. You agree that all agreements,
              notices, disclosures, and other communications provided
              electronically satisfy any legal requirement for written
              communication.
            </LegalSubsection>
            <LegalSubsection title="21.10 No Agency">
              No agency, partnership, joint venture, or employment
              relationship is created by this Agreement.
            </LegalSubsection>
          </LegalSection>

          <LegalSection id={22} title={titles[22] ?? ""}>
            <p>
              If you have any questions, concerns, or requests regarding
              this Agreement or the Service, please contact us:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong className="text-slate-900">Email:</strong>{" "}
                <a
                  href="mailto:support@learnx.pro"
                  className="font-bold text-emerald-700 underline-offset-2 hover:underline"
                >
                  support@learnx.pro
                </a>
              </li>
              <li>
                <strong className="text-slate-900">Website:</strong>{" "}
                spinshare-web-vert.vercel.app
              </li>
            </ul>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              © 2026 spinshare-web-vert.vercel.app. All rights reserved.
            </p>
          </LegalSection>
    </>
  );
}
