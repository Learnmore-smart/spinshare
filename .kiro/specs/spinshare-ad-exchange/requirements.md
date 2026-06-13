# Requirements Document

## Introduction

SpinShare is a developer-first ad exchange that monetizes the "wait states" (loading spinners and progress indicators) of AI coding agents and IDEs. While an AI agent generates output, SpinShare displays a short text advertisement in place of the spinner, pays the developer a share of the advertiser's spend, and keeps the remainder as platform revenue.

The product is a monorepo with three packages:
- **Web Application** (`/web`): Next.js App Router application providing the landing page, developer dashboard, advertiser dashboard, bidding API, tracking/ledger API, authentication, and Stripe-funded advertiser budgets. Persistence uses Firestore for durable records and Upstash Redis for high-frequency impression accounting.
- **CLI Wrapper** (`/cli-wrapper`): An NPM package that spawns a target CLI as a child process, intercepts standard output, suppresses spinner characters, and injects an advertisement on a single updating line.
- **VSCode Extension** (`/vscode-extension`): An extension (also compatible with Trae and Cursor) that uses the progress-notification API to display an advertisement in a bottom-right notification during AI generation.

This document defines the functional and quality requirements for these components. Implementation detail (frameworks, emulators, mocks for external credentials) is deferred to the design phase; requirements here focus on observable system behavior.

## Glossary

- **SpinShare**: The overall ad-exchange product and platform.
- **Web_Application**: The Next.js web service hosting the public site, dashboards, and HTTP APIs.
- **Bidding_Engine**: The component serving `GET /api/ad` that selects a winning advertisement.
- **Ledger_Engine**: The component serving `POST /api/track` that records impressions and computes payouts.
- **CLI_Wrapper**: The NPM package that wraps a third-party CLI and injects advertisements into its output stream.
- **VSCode_Extension**: The editor extension that displays advertisements during AI generation.
- **Auth_Service**: The component handling browser-based authentication for the Web_Application and client packages.
- **Developer**: An end user who runs the CLI_Wrapper or VSCode_Extension and earns revenue from displayed advertisements.
- **Advertiser**: A user who creates campaigns, funds budgets, and pays for impressions.
- **Campaign**: An advertiser-created record containing ad text, a maximum CPM bid, and a remaining budget.
- **CPM**: Cost Per Mille; the price an advertiser agrees to pay per 1,000 impressions, expressed in US dollars.
- **Impression**: A single display of an advertisement to a developer.
- **Ledger_Entry**: A durable record of an impression and its associated payout amounts.
- **User_Balance**: The accumulated earnings owed to a developer.
- **Redis_Store**: The Upstash Redis store used for instant impression accounting and rate-limiting counters.
- **Firestore_Store**: The Firestore database used for durable persistence of users, campaigns, and ledger entries.
- **Flush_Process**: The background process that reconciles Redis_Store counters into Firestore_Store.
- **Revenue_Split**: The division of impression revenue into 60% to the Developer and 40% to SpinShare.
- **Shadow_Ban**: A state in which a developer continues to receive advertisements but earns no credit.
- **Velocity_Limit**: The threshold of 30 impressions per minute per developer used for anti-fraud enforcement.
- **Device_Auth_Token**: The credential issued to a client package after successful browser-based authentication.
- **E2E_Test**: The automated end-to-end integration test invoked via `npm run test:e2e`.

## Requirements

### Requirement 1: Advertisement Bidding and Selection

**User Story:** As an advertiser, I want my highest-value active campaign to win the ad slot, so that my spend reaches developers competitively.

#### Acceptance Criteria

1. WHEN a request is received at `GET /api/ad`, THE Bidding_Engine SHALL build the candidate set consisting of every Campaign whose remaining budget is greater than zero US dollars and whose maximum CPM bid is greater than zero US dollars.
2. WHEN the candidate set contains at least one candidate Campaign, THE Bidding_Engine SHALL select the candidate Campaign with the highest maximum CPM bid as the winning Campaign.
3. WHEN a winning Campaign is selected, THE Bidding_Engine SHALL return in the response the winning Campaign ad text and a campaign identifier that uniquely identifies the winning Campaign.
4. IF the candidate set is empty, THEN THE Bidding_Engine SHALL return a response that contains no ad text and that explicitly indicates no advertisement is available.
5. WHEN two or more candidate Campaigns share the same highest maximum CPM bid, THE Bidding_Engine SHALL select exactly one winning Campaign by choosing the tied Campaign with the earliest creation time, and SHALL choose the tied Campaign with the lowest campaign identifier when creation times are identical.
6. WHEN a winning Campaign is returned, THE Bidding_Engine SHALL include in the response the winning Campaign CPM value, expressed in US dollars, used for payout calculation.
7. WHEN a request is received at `GET /api/ad`, THE Bidding_Engine SHALL return a response within 500 milliseconds.

### Requirement 2: Impression Tracking and Payout Calculation

**User Story:** As a developer, I want each displayed advertisement to credit my balance accurately, so that I earn my agreed share of advertiser spend.

#### Acceptance Criteria

1. WHEN a request is received at `POST /api/track` for a valid campaign and an authenticated developer, THE Ledger_Engine SHALL compute the per-impression revenue in US dollars as the campaign CPM divided by 1000.
2. WHEN the per-impression revenue is computed, THE Ledger_Engine SHALL compute the Developer credit as 60 percent of the per-impression revenue rounded to the nearest US cent (two decimal places) and SHALL increase the User_Balance by that credit.
3. WHEN the Developer credit is computed, THE Ledger_Engine SHALL compute the SpinShare retention as the per-impression revenue minus the Developer credit and SHALL record that amount as SpinShare revenue.
4. WHEN an impression is recorded, THE Ledger_Engine SHALL decrement the associated campaign remaining budget by the full per-impression revenue.
5. WHEN an impression is recorded, THE Ledger_Engine SHALL apply the User_Balance increment and the campaign budget decrement to the Redis_Store as a single atomic update before returning a response.
6. WHEN monetary amounts are computed, THE Ledger_Engine SHALL round each stored amount to a precision of one US cent and SHALL ensure the Developer credit plus the SpinShare retention equals the per-impression revenue.
7. WHEN an impression is successfully recorded, THE Ledger_Engine SHALL return a success response confirming the recorded impression and the Developer credit amount.
8. IF a `POST /api/track` request references a campaign that does not exist or has a remaining budget of zero or less, THEN THE Ledger_Engine SHALL reject the request with an error response indicating the campaign is invalid or has insufficient budget and SHALL NOT modify the User_Balance or any campaign budget.
9. IF a `POST /api/track` request is not associated with a valid Device_Auth_Token, THEN THE Ledger_Engine SHALL reject the request with an authentication error and SHALL NOT modify the User_Balance or any campaign budget.

### Requirement 3: Durable Ledger Reconciliation

**User Story:** As a platform operator, I want fast Redis counters reconciled to durable storage, so that balances survive restarts without incurring a Firestore write per impression.

#### Acceptance Criteria

1. WHEN an impression is recorded, THE Ledger_Engine SHALL record the impression count and payout amounts in the Redis_Store.
2. WHILE impression counters exist in the Redis_Store, THE Flush_Process SHALL periodically write the accumulated User_Balance and campaign budget values to the Firestore_Store.
3. WHEN the Flush_Process completes a reconciliation cycle, THE Flush_Process SHALL ensure the Firestore_Store totals equal the sum of impressions accounted for in that cycle.
4. IF the Flush_Process fails to write to the Firestore_Store, THEN THE Flush_Process SHALL retain the unflushed counters in the Redis_Store for a subsequent cycle.
5. WHEN reconciling, THE Flush_Process SHALL record a durable Ledger_Entry for each impression containing the campaign identifier, developer identifier, per-impression revenue, developer credit, and SpinShare retention.

### Requirement 4: Browser-Based Authentication for Clients

**User Story:** As a developer, I want to log in through my browser rather than manage API keys, so that authenticating the CLI and extension is simple and secure.

#### Acceptance Criteria

1. WHEN a developer runs `spinshare login` in the CLI_Wrapper, THE Auth_Service SHALL initiate a browser-based authentication flow and open the system browser to the SpinShare login page.
2. WHERE the developer authenticates successfully in the browser, THE Auth_Service SHALL issue a Device_Auth_Token and SHALL transfer the Device_Auth_Token back to the requesting local device.
3. THE Auth_Service SHALL support authentication via Google and GitHub identity providers.
4. THE Auth_Service SHALL NOT require the developer to manually create, copy, or paste an API key.
5. WHEN a Device_Auth_Token is issued, THE CLI_Wrapper SHALL store the Device_Auth_Token in local credential storage for reuse on subsequent runs.
6. IF the browser-based authentication flow does not complete within its configured timeout, THEN THE Auth_Service SHALL cancel the pending authentication request and SHALL report a failure to the requesting device.
7. WHEN a client presents a Device_Auth_Token to a protected endpoint, THE Auth_Service SHALL validate the Device_Auth_Token before the request is processed.

### Requirement 5: CLI Wrapper Output Interception

**User Story:** As a developer, I want the CLI wrapper to replace spinner output with an advertisement, so that I earn revenue without losing the underlying CLI functionality.

#### Acceptance Criteria

1. WHEN the CLI_Wrapper is invoked with a target command, THE CLI_Wrapper SHALL spawn the target command as a child process and forward developer input to the child process.
2. WHILE the child process is producing output, THE CLI_Wrapper SHALL intercept the child process standard output stream.
3. WHEN the intercepted output contains spinner characters from the set `|`, `/`, `-`, `\`, THE CLI_Wrapper SHALL suppress those spinner characters from the displayed output.
4. WHILE a spinner is active, THE CLI_Wrapper SHALL display the current advertisement text on a single updating line.
5. WHEN the child process emits non-spinner output, THE CLI_Wrapper SHALL forward that output to the developer without modification.
6. WHEN the child process exits, THE CLI_Wrapper SHALL terminate with the same exit code returned by the child process.
7. WHEN an advertisement is displayed during a wait state, THE CLI_Wrapper SHALL report a corresponding impression to `POST /api/track`.

### Requirement 6: VSCode Extension Advertisement Display

**User Story:** As a developer using a GUI IDE, I want advertisements shown in a native notification during AI generation, so that I earn revenue while my editor agent works.

#### Acceptance Criteria

1. WHILE an AI generation operation is in progress, THE VSCode_Extension SHALL display the current advertisement text in a bottom-right progress notification.
2. WHEN an AI generation operation completes, THE VSCode_Extension SHALL dismiss the advertisement notification.
3. WHEN an advertisement notification is displayed, THE VSCode_Extension SHALL request the advertisement from `GET /api/ad` and SHALL report the impression to `POST /api/track`.
4. WHERE the developer is not authenticated, THE VSCode_Extension SHALL prompt the developer to complete the browser-based authentication flow before displaying advertisements.
5. THE VSCode_Extension SHALL operate within VSCode and within VSCode-compatible editors including Trae and Cursor.

### Requirement 7: Landing Page

**User Story:** As a prospective user, I want a clear landing page, so that I understand the value proposition and can sign up.

#### Acceptance Criteria

1. WHEN a visitor requests the site root, THE Web_Application SHALL render a landing page presenting the SpinShare value proposition.
2. THE Web_Application SHALL display on the landing page a developer sign-in entry point and an advertiser sign-in entry point as two distinct, visible controls.
3. WHEN a visitor activates the developer sign-in entry point, THE Web_Application SHALL initiate the browser-based authentication flow.
4. WHEN a visitor activates the advertiser sign-in entry point, THE Web_Application SHALL initiate the browser-based authentication flow.

### Requirement 8: Developer Dashboard

**User Story:** As a developer, I want a dashboard of my earnings and activity, so that I can track how much I am making over time.

#### Acceptance Criteria

1. WHEN an authenticated developer opens the developer dashboard, THE Web_Application SHALL display KPI cards summarizing the developer total earnings.
2. WHEN an authenticated developer opens the developer dashboard, THE Web_Application SHALL display a chart of the developer earnings over time.
3. WHEN an authenticated developer opens the developer dashboard, THE Web_Application SHALL display an activity ledger table listing the developer recorded impressions and credited amounts.
4. IF an unauthenticated visitor requests the developer dashboard, THEN THE Web_Application SHALL redirect the visitor to the authentication flow.

### Requirement 9: Advertiser Dashboard and Campaign Management

**User Story:** As an advertiser, I want to create and fund campaigns, so that my advertisements are eligible to win ad slots.

#### Acceptance Criteria

1. WHEN an authenticated advertiser submits a campaign with ad text of 1 to 60 characters (inclusive) and a maximum CPM bid greater than or equal to $0.01 and less than or equal to $1,000.00, THE Web_Application SHALL create a Campaign with a remaining budget of zero.
2. IF an advertiser submits ad text exceeding 60 characters, THEN THE Web_Application SHALL reject the submission, SHALL NOT create a Campaign, and SHALL return an error indicating the character-limit violation.
3. IF an advertiser submits ad text that is empty or contains only whitespace, THEN THE Web_Application SHALL reject the submission, SHALL NOT create a Campaign, and SHALL return an error indicating that ad text is required.
4. IF an advertiser submits a maximum CPM bid that is zero, negative, non-numeric, or greater than $1,000.00, THEN THE Web_Application SHALL reject the submission, SHALL NOT create a Campaign, and SHALL return an error indicating the invalid bid.
5. WHEN an authenticated advertiser opens the advertiser dashboard, THE Web_Application SHALL display the advertiser campaigns with their remaining budgets and maximum CPM bids.
6. WHEN an advertiser initiates "Add Funds" with a requested amount greater than or equal to $1.00 and less than or equal to $100,000.00, THE Web_Application SHALL start a Stripe checkout session for the requested amount in US dollars.
7. IF an advertiser initiates "Add Funds" with a requested amount that is less than $1.00, greater than $100,000.00, non-numeric, or finer than one-cent precision, THEN THE Web_Application SHALL reject the request, SHALL NOT start a Stripe checkout session, and SHALL return an error indicating the invalid amount.
8. WHEN SpinShare receives a Stripe payment confirmation at `/api/webhooks/stripe` that passes signature verification, THE Web_Application SHALL increase the targeted advertiser campaign remaining budget by the confirmed payment amount in US dollars within 60 seconds of receipt.
9. IF a verified Stripe payment confirmation at `/api/webhooks/stripe` references a payment event that has already been applied, THEN THE Web_Application SHALL acknowledge the request and SHALL NOT increase any campaign budget more than once for that payment event.
10. IF a request to `/api/webhooks/stripe` fails signature verification, THEN THE Web_Application SHALL reject the request and SHALL NOT modify any campaign budget.

### Requirement 10: Velocity Rate-Limiting and Anti-Fraud

**User Story:** As a platform operator, I want to detect abnormally high impression rates, so that automated scripts cannot drain advertiser budgets for fraudulent earnings.

#### Acceptance Criteria

1. WHEN an impression is recorded for a developer, THE Ledger_Engine SHALL increment a per-developer impression counter in the Redis_Store associated with a fixed 60-second window that expires 60 seconds after the window begins.
2. IF a developer records more than 30 impressions within a single 60-second window, THEN THE Ledger_Engine SHALL place the developer in a Shadow_Ban state beginning with the 31st impression.
3. WHILE a developer is in a Shadow_Ban state, THE Bidding_Engine SHALL continue to serve advertisements to the developer.
4. WHILE a developer is in a Shadow_Ban state, THE Ledger_Engine SHALL return the same success response as a normally recorded impression while NOT crediting the User_Balance for impressions attributed to the developer.
5. WHILE a developer is in a Shadow_Ban state, THE Ledger_Engine SHALL NOT decrement any campaign budget for impressions attributed to the developer.
6. WHEN a developer has been in a Shadow_Ban state for 60 minutes, THE Ledger_Engine SHALL restore the developer and SHALL resume crediting the User_Balance and decrementing campaign budgets for subsequent impressions.

### Requirement 11: Automated End-to-End Settlement Test

**User Story:** As a developer of SpinShare, I want an automated end-to-end test of the money path, so that I can verify the 60/40 split settles correctly before release.

#### Acceptance Criteria

1. WHEN `npm run test:e2e` is invoked, THE E2E_Test SHALL start a local instance of the Web_Application and SHALL wait until the local Web_Application accepts requests, within a 60-second startup timeout.
2. WHEN the E2E_Test is running, THE E2E_Test SHALL simulate an advertiser depositing test funds into a campaign budget using a fixed maximum CPM bid and a test budget that exceeds the per-impression revenue of one impression.
3. WHEN the E2E_Test is running, THE E2E_Test SHALL simulate a client presenting a valid Device_Auth_Token and reporting exactly one impression to `POST /api/track`, below the Velocity_Limit.
4. WHEN the simulated impression is recorded, THE E2E_Test SHALL verify that the developer User_Balance increased by 60 percent of the per-impression revenue within a tolerance of one US cent.
5. WHEN the simulated impression is recorded, THE E2E_Test SHALL verify that the campaign budget decreased by the full per-impression revenue within a tolerance of one US cent.
6. WHEN the simulated impression is recorded, THE E2E_Test SHALL verify that the SpinShare retention equals 40 percent of the per-impression revenue and that the developer credit plus the SpinShare retention equals the per-impression revenue, each within a tolerance of one US cent.
7. IF the recorded balances do not match the expected Revenue_Split, THEN THE E2E_Test SHALL fail and SHALL report the expected value, the recorded value, and the difference.
8. IF the local Web_Application does not accept requests within the 60-second startup timeout, THEN THE E2E_Test SHALL fail and SHALL report the startup failure.
