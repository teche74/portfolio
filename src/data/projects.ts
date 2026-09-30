/**
 * Project copy.
 *
 * REPO_PITCHES: hand-written title / one-line pitch / tags for GitHub repos, keyed by repo
 * name (case-insensitive). Used for the featured cards (see FEATURED_REPOS in config.ts);
 * repos without a pitch fall back to their GitHub description. `related` adds extra repo
 * links to the same card (e.g. phase 2 of a project).
 *
 * BUILDING: small "currently building / learning" strip for local projects that have no
 * public repo yet. Add `repo` once one is public.
 */
export interface RepoPitch {
  title?: string;
  pitch: string;
  tags?: string[];
  related?: { name: string; label: string }[];
  /** Short context label, e.g. "Hackathon" or "Team of 4". */
  kind?: string;
}

export const REPO_PITCHES: Record<string, RepoPitch> = {
  Project_Batch4: {
    title: 'nopCommerce Promotions: UI + API automation',
    pitch:
      "A team of four automating nopCommerce's Promotions module end to end with Selenium WebDriver, RestAssured and TestNG in Java. Phase 2 rebuilds the same module in Playwright.",
    tags: ['Selenium', 'RestAssured', 'TestNG', 'Playwright', 'Java'],
    related: [{ name: 'ProjectBatch4_Phase2', label: 'Phase 2 (Playwright)' }],
    kind: 'Team of 4',
  },
  'NotePad-Automation-using-TestComplete': {
    title: 'Notepad desktop automation (TestComplete)',
    pitch:
      'Desktop automation beyond record-and-playback: a structured TestComplete framework for Notepad CRUD, with stable object identification, reusable functions and BDD-style scenarios.',
    tags: ['TestComplete', 'Desktop automation', 'BDD', 'JavaScript'],
  },
  'Api-Testing-using-RestAssured-and-Java': {
    title: 'E-commerce API suite (RestAssured)',
    pitch:
      'An end-to-end API suite for login, catalogue, cart and order flows, with request chaining, dynamic payloads and JsonPath assertions. It runs on TestNG and Maven.',
    tags: ['RestAssured', 'Java', 'TestNG', 'Maven'],
  },
  'API-Testing-Using-PostMan': {
    title: 'Petstore API testing (Postman)',
    pitch:
      'A Postman collection for the Swagger Petstore API: user and store scenarios, environments, data-driven runs from CSV and a JavaScript test script on every response.',
    tags: ['Postman', 'API testing', 'JavaScript'],
  },
  'FinalYearProject-CYBERSECURITY-INTRUSION-DETECTION-SYSTEM-': {
    title: 'Network intrusion detection system',
    pitch:
      'My final-year project, a full IDS: Scapy packet capture, Airflow pipelines, Avro and Cassandra storage, ML trained on UNSW-NB15, and a live dashboard.',
    tags: ['Python', 'Scapy', 'Airflow', 'Cassandra', 'ML'],
    kind: 'Final-year project',
  },
  EmailAutomationLinkeniteChallenge: {
    title: 'AI email-automation platform',
    pitch:
      'Linkenite hackathon entry: it pulls in Gmail and Outlook mail, runs NER, sentiment and urgency classification, and drafts RAG-grounded replies in a Streamlit UI.',
    tags: ['NLP', 'Hugging Face', 'spaCy', 'PostgreSQL', 'Streamlit'],
    kind: 'Hackathon',
  },
  Kafka_Cassandra_Log_Ingestion: {
    title: 'Kafka → Cassandra log pipeline',
    pitch:
      'A real-time logging pipeline: a Kafka producer streams Avro-serialised logs, and a consumer decodes them and stores them in Cassandra, creating the keyspace if it is missing.',
    tags: ['Kafka', 'Cassandra', 'Avro', 'Python'],
  },
  'MURF-Coding-Challenge-4-Multilingual-Voice-Chat-Room': {
    title: 'Multilingual voice chat room',
    pitch:
      'Murf AI Coding Challenge 4 entry: a real-time group voice room with translation built in, so people who speak different languages can share one call.',
    tags: ['Python', 'Voice AI', 'Real-time'],
    kind: 'Hackathon',
  },
  Create_Your_Own_HTTP_Sever: {
    title: 'Multithreaded HTTP server in C++',
    pitch: 'An HTTP server written from scratch in C++. It handles GET and POST, serves static files, and uses threads to serve several clients at once.',
    tags: ['C++', 'Networking', 'Multithreading'],
  },
  Customer_Segmentation_USA: {
    title: 'US customer segmentation',
    pitch: 'Segments US customers on demographic and financial data, using PCA to reduce dimensions and K-Means to find high-value groups for targeted marketing.',
    tags: ['Python', 'scikit-learn', 'PCA', 'K-Means'],
  },
};

export interface BuildingItem {
  name: string;
  summary: string;
  tags: string[];
  repo?: string;
}

export const BUILDING: BuildingItem[] = [
  {
    name: 'DSA interview prep',
    summary: 'A 16-week C++ plan built around choosing the right technique for each problem: 22 topic guides and a 219-problem tracker.',
    tags: ['C++', 'DSA'],
  },
  {
    name: 'QA mastery roadmap',
    summary: 'A 12-phase curriculum from manual testing to Java/TypeScript automation to QA leadership, with five capstone projects.',
    tags: ['Java', 'TypeScript', 'QA'],
  },
  {
    name: 'Alpha Foundry',
    summary: 'A multi-agent research sandbox for NSE intraday strategies. It only backtests and paper-trades, with no real money.',
    tags: ['Python', 'Multi-agent', 'Research'],
  },
];
