export type GuidePath = "/dashboard" | "/tests" | "/verify" | "/registry" | "/group2" | "/review" | "/revisions" | "/audit" | "/settings" | "/auth" | "/reset-password";

export interface GuideStep {
  title: string;
  description: string;
  instructions: string[];
  caution?: string;
  destination?: GuidePath;
  destinationLabel?: string;
  control?: { label: string; selector: string; text?: string; adminOnly?: boolean };
}

export interface PageGuideContent {
  title: string;
  steps: GuideStep[];
  questions: { question: string; answer: string }[];
}

export const PAGE_GUIDES: Record<GuidePath, PageGuideContent> = {
  "/dashboard": {
    title: "Dashboard",
    steps: [
      { title: "Start with synthetic cases", description: "Prepare the test materials before interpreting any measurements.", instructions: ["Open Test Case Laboratory to inspect existing cases.", "An administrator can load the supplied Group 2 package or import its original CSV.", "New imported cases begin as Not Run and Provisional — Clinical Review Required."], destination: "/tests", destinationLabel: "Open Test Case Laboratory" },
      { title: "Read the measurements", description: "Imported expectations and executed results are different records.", instructions: ["Group 2 imported cases counts the fixtures, not successful tests.", "Deterministic executions are actual rule checks; simulated candidate executions test the guardrail using constructed findings.", "The provisional expected-match rate compares independently calculated results with expectations. Unavailable runs do not count as passes."], caution: "An expected match is not clinical approval. The external model is unavailable." },
      { title: "Narrow your view", description: "Use the filters to examine stored evaluations.", instructions: ["Choose a date range, decision, rule category, source profile or test status.", "Check the selected filters when a measurement appears empty.", "The Group 2 execution summary above the filters is an overall count, not a filtered measurement."], control: { label: "From date", selector: 'input[aria-label="From date"]' } },
      { title: "Review and download", description: "Follow the evidence before sharing a result.", instructions: ["Inspect the actual decision and check details in Evidence Verification.", "Use Human Review Queue for uncertain findings.", "Download test results from Test Case Laboratory, or a filtered event history from Audit Trail."], destination: "/audit", destinationLabel: "Open Audit Trail" },
    ],
    questions: [{ question: "Why does a metric say Not yet measured?", answer: "There are no qualifying stored evaluations for that measurement or filter selection. Importing an expected decision does not create an execution." }, { question: "Is this a clinical compliance dashboard?", answer: "No. These are synthetic research measurements, not clinical validation, payer approval or certification." }],
  },
  "/tests": {
    title: "Test Case Laboratory",
    steps: [
      { title: "Choose the right materials", description: "Use the original Group 2 synthetic fixture package.", instructions: ["For the supplied 32 cases and four reference sheets, use Load Group 2 package. No file selection is needed.", "For a CSV import, select Group2_Guardrail_Test_Cases.csv through Import CSV.", "Read the handoff and workflow PDFs outside the app. PDF and spreadsheet uploads are not supported here."], caution: "Never upload patient records, patient identifiers or real clinical notes.", control: { label: "Load Group 2 package", selector: "main button", text: "Load Group 2 package", adminOnly: true } },
      { title: "Validate before importing", description: "Preview the CSV and resolve errors without replacing the originals.", instructions: ["Select Import CSV, choose the file, and inspect the preview before confirming Import cases.", "Retain the original headers, case IDs, rule IDs and text. Imported execution_status must be Not run and actual_decision must be blank.", "Identical repeated imports are unchanged. Conflicting original content is rejected, and existing executions are preserved."], caution: "Only administrators see import controls. Loading expectations never records a pass.", control: { label: "Import CSV", selector: "main button", text: "Import CSV", adminOnly: true } },
      { title: "Run an independent check", description: "Choose what is actually being executed.", instructions: ["Automatic fixture runner chooses a supported deterministic check or a simulated candidate guardrail test.", "Deterministic rules only executes the supported rule predicates; Simulated candidate guardrail checks a constructed, untrusted finding.", "Select Run on one row first, then inspect its actual result. Reviewers can also use Run all tests."], caution: "External model — unavailable does not call a live model and cannot record a pass.", control: { label: "Execution mode", selector: '[aria-label="Execution mode"]' } },
      { title: "Inspect the original and actual result", description: "Open a case ID to read its full record.", instructions: ["Read synthetic_input as the scenario, target_rule_ids as the rules under test, and failure_mode as the risk being tested.", "Read evidence_check, expected_safe_feedback and forbidden_output as provisional specifications, not generated findings.", "Compare expected with actual and follow Verify evidence or Open in Evidence Verification to inspect execution provenance."], destination: "/verify", destinationLabel: "Open Evidence Verification" },
      { title: "Download the results", description: "Export the stored case results as a CSV report.", instructions: ["Select Export results to download guardrail-test-results.csv.", "This export contains all loaded cases, not just the rows currently matching your search or failure filter.", "Check execution and review status in the file. Not Run and unavailable rows are not passed tests. Keep the provisional context when sharing."], caution: "This is a research CSV export, not a certified clinical report or a PDF report.", control: { label: "Export results", selector: "main button", text: "Export results" } },
    ],
    questions: [{ question: "Where does the workbook go?", answer: "Load Group 2 package imports the bundled Rule_Map, Group1_Interface, Decision_Map and Acceptance_Tests into four separate reference models. View them on Group 2 Reference Models; there is no arbitrary workbook upload." }, { question: "Why was my CSV rejected?", answer: "Use the original column names and synthetic content. Check the displayed error for duplicate case IDs, unknown rules, imported actual results or a conflict with a stored original. Correct the file; do not change expectations to make a test pass." }],
  },
  "/verify": {
    title: "Evidence Verification",
    steps: [
      { title: "Open the case or evaluation", description: "Start with a specific stored result rather than an expected label.", instructions: ["In Test Case Laboratory, open a case and choose Verify evidence or Open in Evidence Verification.", "For legacy cases, use the evaluation selector on this page.", "A Group 2 case can be opened before a run, but it has no actual verification result yet."], destination: "/tests", destinationLabel: "Choose a test case" },
      { title: "Read the scenario and evidence", description: "Separate original test text from the candidate finding.", instructions: ["Group 2 shows the original synthetic scenario, provisional expectations and original rule mapping.", "For note-based evaluations, compare the quoted evidence with the highlighted text in the exact immutable note version.", "Treat the candidate finding as untrusted. A quote, valid formatting or a familiar keyword is not proof of support."], caution: "Expected safe feedback is a specification, not verified generated advice." },
      { title: "Inspect what actually ran", description: "Check provenance, individual checks and reason codes together.", instructions: ["Distinguish executed deterministic rules from simulated candidate checks and unavailable external-model execution.", "Read passed, failed, skipped or unavailable checks before interpreting the final decision.", "RELEASE_FLAG is a permitted synthetic finding; SUPPRESS withholds it. ABSTAIN and REVIEW_REQUIRED signal uncertainty; PARTIAL_UNAVAILABLE means verification could not be completed."], caution: "NO_FLAG does not certify the document. An unavailable or skipped check is not a pass." },
      { title: "Follow up and preserve the record", description: "Use review and exports rather than editing historical outcomes.", instructions: ["Use Human Review Queue to inspect uncertain evaluations and record a rationale.", "Historical note-based evidence uses the registry captured with the evaluation, not later registry edits.", "Download case results in Test Case Laboratory and related events in Audit Trail. There is no separate evidence PDF download."], destination: "/review", destinationLabel: "Open Human Review Queue" },
    ],
    questions: [{ question: "Why is there no source passage for a Group 2 case?", answer: "The workbook supplies rule mappings and test expectations, not approved payer sources or a clinical note. Do not treat an imported mapping as an approved citation." }, { question: "Can I upload a document on this page?", answer: "No. Import the original synthetic CSV in Test Case Laboratory. Administrators can enter synthetic note revisions in Revision Comparison and source metadata in the registry." }],
  },
  "/registry": {
    title: "Rule & Source Registry",
    steps: [
      { title: "Read rules and their sources", description: "Inspect the two tabs before creating or changing a record.", instructions: ["Rules lists the rule ID, check type, severity, applicability, effective dates, source ID and status.", "Sources lists issuer, source type, version, dates, passage digest and approval state.", "Where available, select a linked source title to read its public reference in a new tab."], control: { label: "Sources tab", selector: '[role="tab"]', text: "Sources" } },
      { title: "Enter a source reference", description: "Administrators enter metadata and an exact passage, not a file upload.", instructions: ["Choose Sources, then New source or the edit icon.", "Use fictional or publicly verifiable references. Enter the identifier, issuer, version, dates, verified URL and exact approved passage as appropriate.", "Check the source type and approval state before saving. Pending or rejected sources must not be treated as approved support."], caution: "There is no PDF or workbook upload in this registry. The Group 2 workbook is a separate reference model." },
      { title: "Manage a rule carefully", description: "Connect the rule to a registered source and explicit applicability.", instructions: ["Administrators choose New rule or the edit icon and enter the rule ID, check type and source.", "Review applicable payers, service types, effective dates and status. Unknown applicability is not an automatic compliance failure.", "Save increments the record version. Earlier evaluations retain their captured registry evidence."], control: { label: "New rule", selector: "main button", text: "New rule", adminOnly: true } },
    ],
    questions: [{ question: "Does Approved mean clinically validated?", answer: "No. It is the source record’s status within this synthetic prototype, not clinical validation, legal review or a compliance certification." }, { question: "Why can’t I edit a record?", answer: "Registry editing is an administrator task. Reviewers can inspect records and run tests; check Your access in Settings for the roles shown for your account." }],
  },
  "/group2": {
    title: "Group 2 Reference Models",
    steps: [
      { title: "Load the supplied workbook models", description: "Four sheets are kept separate so their meanings stay clear.", instructions: ["An administrator uses Load Group 2 package in Test Case Laboratory.", "The package contains the supplied cases and bundled workbook sheets. There is no spreadsheet upload on this page.", "Use the tabs here to inspect each imported model without changing the source text."], destination: "/tests", destinationLabel: "Open package import" },
      { title: "Read the rule and interface maps", description: "Use the maps to understand the handoff, not to infer results.", instructions: ["Rule map links original Group 1 rule IDs to the Group 2 safeguards.", "Group 1 interface lists the fields and contracts expected at the handoff.", "Read the engineering handoff and workflow PDFs alongside these tables in your document viewer."], caution: "Mappings are not independently executed checks or approved payer references." },
      { title: "Read decisions and acceptance criteria", description: "Specifications describe what should happen, not what did happen.", instructions: ["Decision map describes the provisional decision vocabulary.", "Acceptance tests lists the workbook’s acceptance scenarios and expected behavior.", "To verify a case, run it in Test Case Laboratory and inspect the actual result in Evidence Verification."], destination: "/verify", destinationLabel: "Open Evidence Verification" },
    ],
    questions: [{ question: "Are the workbook acceptance tests execution results?", answer: "No. They are imported specifications. A fixture passes only when an independently calculated, assessable result matches its provisional expectation." }, { question: "Can I download the original workbook here?", answer: "There is no original-workbook download on this page. Use your supplied workbook for the original document, Export results for case results, or Export CSV in Audit Trail for events." }],
  },
  "/review": {
    title: "Human Review Queue",
    steps: [
      { title: "Select an uncertain evaluation", description: "The queue is populated by actual test executions.", instructions: ["Pending shows the latest uncertain evaluations awaiting a completed review.", "REVIEW_REQUIRED, ABSTAIN and PARTIAL_UNAVAILABLE evaluations can appear here.", "Reviewed shows items with completed reviewer actions. An escalation remains pending."], control: { label: "Pending tab", selector: '[role="tab"]', text: "Pending" } },
      { title: "Inspect evidence before acting", description: "Read why the finding was held back.", instructions: ["Use Open evidence on the item to inspect the scenario, note version, source and executed checks.", "Read uncertainty reasons and any proposed feedback without assuming they are clinically correct.", "If evidence is missing or verification is unavailable, preserve that uncertainty rather than treating it as approval."], destination: "/verify", destinationLabel: "Open Evidence Verification" },
      { title: "Record a reasoned review", description: "Reviewer actions are separate from the machine decision.", instructions: ["Reviewers enter a rationale of at least 10 characters before selecting an available action.", "Use Confirm suppress, Mark no flag or Escalate as appropriate to the evidence. Approve release is disabled when the safeguards do not permit it.", "Review history and audit events are appended; the original evaluation is not overwritten."], caution: "A reviewer action in this research prototype is not clinical authorization." },
      { title: "Download the review history", description: "Use the audit export to preserve recorded actions.", instructions: ["Open Audit Trail and filter by case or evaluation ID.", "Select Export CSV to download the matching event rows.", "Check reviewer_action, timestamps and identifiers when connecting the export to a test result."], destination: "/audit", destinationLabel: "Open Audit Trail" },
    ],
    questions: [{ question: "Why is the queue empty?", answer: "There may be no latest uncertain evaluations, or all eligible items have completed reviews. Run a synthetic case in Test Case Laboratory and inspect its decision first." }],
  },
  "/revisions": {
    title: "Revision Comparison",
    steps: [
      { title: "Choose a note and two versions", description: "Compare stored synthetic note versions, not uploaded patient files.", instructions: ["Choose the synthetic note, then an earlier and a later version using the selectors.", "Read both note texts side by side. Highlighted lines differ between versions.", "Run cases targeting both versions before expecting a meaningful finding comparison."], control: { label: "Note selector", selector: "main select" } },
      { title: "Interpret the finding status", description: "The comparison is limited to the specific rules evaluated.", instructions: ["Resolved means the tested rule no longer flags; Remaining and New identify continued or newly flagged findings.", "Not assessable means the evaluations do not support a reliable comparison.", "Missing comparable evaluations are not evidence that a revision is safe."], caution: "Resolved is not an overall clinical compliance determination." },
      { title: "Save a synthetic revision", description: "Administrators can append a new version without replacing history.", instructions: ["Select Start from latest or enter fictional text in Save new immutable version.", "Keep the SYNTHETIC label and do not enter patient information.", "Select Save version, then run tests that target the new version. Saving text alone does not evaluate it."], control: { label: "Start from latest", selector: "main button", text: "Start from latest", adminOnly: true } },
    ],
    questions: [{ question: "Can I upload a clinical document for comparison?", answer: "No. This page uses stored synthetic notes and administrator-entered synthetic revisions. It does not support patient-document uploads or production clinical use." }],
  },
  "/audit": {
    title: "Audit Trail",
    steps: [
      { title: "Read the event record", description: "Use identifiers to connect actions with their stored evaluations.", instructions: ["Read timestamp and event type first, then case ID, evaluation ID, note version and rule ID.", "Decision and failure reason describe the recorded safeguard outcome.", "Reviewer action records a later human action without replacing the original result. Operational audit events do not contain raw note text."], caution: "An audit entry proves that an action was recorded, not that it was clinically correct." },
      { title: "Find the relevant events", description: "Filter before downloading a focused history.", instructions: ["Enter a case ID such as G2-001, an evaluation ID, event type or other value into Filter events.", "Inspect the remaining rows and clear the filter to return to the full event list.", "An empty list means no matching events; it is not a missing-evidence approval."], control: { label: "Filter events", selector: 'input[placeholder="Filter events…"]' } },
      { title: "Download an audit report", description: "Export exactly the rows matching the current filter.", instructions: ["Select Export CSV to download audit-trail.csv.", "Open the file in a spreadsheet and inspect timestamp, test_case_id, evaluation_id, decision and reviewer_action.", "Pair it with guardrail-test-results.csv from Test Case Laboratory when sharing case outcomes and provenance."], caution: "The export is a research event report, not a certified compliance report. No PDF report is generated.", control: { label: "Export CSV", selector: "main button", text: "Export CSV" } },
    ],
    questions: [{ question: "Does Export CSV download every event?", answer: "It downloads the loaded events that match your current filter. Clear Filter events before exporting the full loaded history." }],
  },
  "/settings": {
    title: "Settings",
    steps: [
      { title: "Check your access", description: "Your access shows the roles assigned to your account.", instructions: ["Administrators manage imports, registry records and configuration.", "Reviewers run synthetic tests and record reviewer actions.", "If a control is missing, check the roles shown here rather than assuming an upload or test failed."], caution: "These guides do not assign roles or expand access." },
      { title: "Understand service availability", description: "Verifier availability is separate from external-model availability.", instructions: ["Administrators can turn Verifier available off to simulate an outage.", "During an outage, evaluations fail closed as PARTIAL_UNAVAILABLE rather than releasing unsupported findings.", "The model and source bundle labels identify configuration. They do not prove a real external-model execution."], caution: "The external evaluator remains disabled; turning the verifier on does not enable a live model." },
      { title: "Validate a synthetic request", description: "The adapter is a dry-run input check, not a model connection.", instructions: ["Use Reset sample to restore the supplied request or enter a synthetic JSON request in the text area.", "Its note version and profile must match registered stored records.", "Choose Validate request and inspect the returned decisions or validation error. Never paste patient text, passwords or secret keys."], control: { label: "Reset sample", selector: "main button", text: "Reset sample" } },
    ],
    questions: [{ question: "Can I activate real-patient handling here?", answer: "No. No production clinical integration or real-patient data handling is available. The app remains a synthetic-only, not clinically validated research prototype." }],
  },
  "/auth": {
    title: "Account access",
    steps: [
      { title: "Sign in to the studio", description: "Use your account to open the synthetic verification workspace.", instructions: ["Choose Continue with Google, Continue with Lovable, or enter your email and password.", "If you create an email account, follow the confirmation instructions shown.", "Account access and application roles are separate; check Your access in Settings after signing in."], control: { label: "Email", selector: "#email" } },
      { title: "Recover account access", description: "Use the email recovery flow if you cannot sign in.", instructions: ["Select Forgot password?, enter your account email and send the reset link.", "Open the recovery link from that email to set a new password.", "Never include a password or patient information in uploaded test materials."], control: { label: "Forgot password?", selector: "button", text: "Forgot password?" } },
    ],
    questions: [{ question: "What should I upload after signing in?", answer: "Only the supplied synthetic Group 2 CSV in Test Case Laboratory, or use Load Group 2 package. No patient documents, PDF uploads or arbitrary workbook uploads are supported." }],
  },
  "/reset-password": {
    title: "Password recovery",
    steps: [
      { title: "Use your recovery link", description: "This form requires the recovery session from your email.", instructions: ["Open the password recovery link sent to your account email.", "Enter a new password of at least 8 characters and choose Update password.", "If the form is disabled, return to sign-in and request another recovery email."], control: { label: "New password", selector: "#pw" } },
    ],
    questions: [{ question: "Why is Update password disabled?", answer: "A password recovery session has not been detected. Open the link in your recovery email rather than visiting this page directly." }],
  },
};

export function guideForPath(path: string): PageGuideContent | undefined {
  return PAGE_GUIDES[path === "/" ? "/auth" : path as GuidePath];
}