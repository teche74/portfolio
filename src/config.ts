/**
 * ============================================================
 *  SITE CONFIG — the ONE file you edit to personalise the site.
 *  Anything marked TODO is a placeholder you must fill in.
 *  Extra coding-profile cards live in src/data/profiles.ts,
 *  featured-project pitches in src/data/projects.ts.
 * ============================================================
 */

/** GitHub username. Set to "TODO" to hide every live GitHub feature. */
export const GITHUB_USERNAME = 'teche74';

/** LeetCode username. Set to "TODO" to hide the live LeetCode panel. */
export const LEETCODE_USERNAME = 'ujjwalbisht55';

/**
 * The GitHub repo this site's source lives in. The /admin page commits here, and the
 * deploy workflow publishes from it. Change REPO_NAME if you name the repo differently
 * (use "teche74.github.io" to serve the site at https://teche74.github.io/).
 */
export const REPO = {
  owner: GITHUB_USERNAME,
  name: 'portfolio',
  branch: 'main',
  timelinePath: 'src/data/timeline.json',
  dailyDir: 'src/content/daily',
  blogDir: 'src/content/blog',
  readingDir: 'src/content/reading',
  tilDir: 'src/content/til',
  nowPath: 'src/content/now.md',
};

/**
 * Sample content. The blog, reading, TIL and Now collections ship with a few entries marked
 * `sample: true` so the design is populated on day one. Set this to false (or delete the
 * sample files) once you have real entries. Samples always carry a pencil "sample" note.
 */
export const SHOW_SAMPLES = true;

/** Journey timeline options. */
export const TIMELINE = {
  /** Add each public GitHub repo as an automatic "project" entry (fetched live in the browser). */
  includeGitHubRepos: true,
  /** Include forked repos in that list. */
  includeForks: false,
  /** Entries shown on the home page before the "Show all" button. */
  initialVisible: 8,
};

/**
 * Featured projects, in display order: GitHub repo names (case-insensitive).
 * The pitch/title/tags for each come from src/data/projects.ts; live stars, language,
 * topics and homepage come from the GitHub API.
 * Leave the list EMPTY to pick automatically (top non-fork repos by stars + recent activity,
 * excluding the profile-README repo).
 */
export const FEATURED_REPOS: string[] = [
  'Project_Batch4',
  'NotePad-Automation-using-TestComplete',
  'Api-Testing-using-RestAssured-and-Java',
  'API-Testing-Using-PostMan',
  'FinalYearProject-CYBERSECURITY-INTRUSION-DETECTION-SYSTEM-',
  'EmailAutomationLinkeniteChallenge',
  'Kafka_Cassandra_Log_Ingestion',
  'MURF-Coding-Challenge-4-Multilingual-Voice-Chat-Room',
  'Create_Your_Own_HTTP_Sever',
  'Customer_Segmentation_USA',
];

/** How many repos the automatic featured pick shows (only used when FEATURED_REPOS is empty). */
export const FEATURED_AUTO_COUNT = 6;

/** Profile photo. Falls back to initials if it fails to load. */
export const AVATAR_URL = `https://github.com/${GITHUB_USERNAME}.png?size=320`;

/** Timezone used for "today", streaks and the daily-log heatmap. */
export const TIMEZONE = 'Asia/Kolkata';

export const SITE = {
  name: 'Ujjwal Bisht',
  title: 'Associate Software Engineer | QA Automation | Problem Solver',
  description:
    'Ujjwal Bisht — Associate Software Engineer (QA automation) at GlobalLogic, Noida. UI, API and desktop test automation with Selenium, Playwright, RestAssured and TestComplete; LeetCode Knight; data engineering and ML projects.',
  location: 'Noida, India',
  /**
   * Public contact email. It is never written into the HTML as plain text: the site
   * assembles it in the browser (mailto link + "copy email" action). "TODO" hides it.
   */
  email: 'ujjwalbisht55@gmail.com',
  /** Phone (published with the owner's approval). Assembled in the browser like the email. "TODO" hides it. */
  phone: '+91-7906378407',
  /** Date of birth, YYYY-MM-DD (published with the owner's approval). Shown on the About passport. */
  dob: '2003-08-24',
  role: 'Associate Software Engineer',
  employer: 'GlobalLogic (Hitachi Group)',
  nationality: 'Indian',
  /**
   * Resume PDF inside /public. Empty string hides the /resume page link and CTAs.
   * To update the resume, overwrite public/resume/Ujjwal_Bisht_Resume.pdf (same name) and push.
   */
  resume: '/resume/Ujjwal_Bisht_Resume.pdf',
};

/** The short handwritten line on the notebook cover (decorative). */
export const COVER_LINE = 'notes on testing, code & the slow art of getting better';

/** Short bio shown in the About section. Plain paragraphs. */
export const BIO: string[] = [
  "I'm an Associate Software Engineer at GlobalLogic (Hitachi Group) in Noida, doing manual and automated QA for a public-safety records-management platform: defect investigation, test design, and fix verification with regression before changes ship.",
  'I graduated with a B.Tech in Computer Science from Graphic Era Hill University (2021–2025, GPA 8.2), and my focus is UI, API and desktop test automation with Selenium, Playwright, RestAssured and TestComplete.',
  "Outside work I'm a competitive programmer (LeetCode Knight, peak rating 2016) with a background in data engineering and ML: Kafka, Cassandra and Spark, plus WorldQuant University's Applied Data Science Lab.",
];

export const SKILLS: { group: string; items: string[] }[] = [
  { group: 'Test tools', items: ['TestComplete', 'Selenium WebDriver', 'Playwright', 'RestAssured', 'Cucumber / BDD', 'TestNG', 'Postman'] },
  {
    group: 'Testing',
    items: ['Manual testing', 'API testing', 'UI automation', 'Regression testing', 'Functional testing', 'Test case design', 'Defect life cycle'],
  },
  { group: 'Languages', items: ['Java', 'C++', 'SQL', 'JavaScript', 'Python', 'Scala', 'R'] },
  { group: 'Data & distributed', items: ['Kafka', 'Cassandra', 'Spark', 'Airflow', 'Avro'] },
  { group: 'ML / NLP', items: ['pandas', 'scikit-learn', 'Hugging Face', 'spaCy', 'LangChain'] },
  { group: 'Web & tools', items: ['FastAPI', 'Streamlit', 'Docker', 'PostgreSQL', 'Git', 'Jenkins', 'Azure DevOps'] },
];

export type SocialIcon = 'github' | 'linkedin' | 'leetcode' | 'mail' | 'x' | 'globe' | 'book';

/**
 * Social / contact links. Entries whose href contains "TODO" are hidden automatically.
 * The "mail" entry needs no href: it is built in the browser from SITE.email.
 */
export const SOCIALS: { label: string; href: string; icon: SocialIcon }[] = [
  { label: 'GitHub', href: `https://github.com/${GITHUB_USERNAME}`, icon: 'github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ujjwal-bisht', icon: 'linkedin' },
  { label: 'LeetCode', href: `https://leetcode.com/u/${LEETCODE_USERNAME}/`, icon: 'leetcode' },
  { label: 'Email', href: 'mailto:', icon: 'mail' },
];

/** Other places on the web (shown on the Profiles page and in the command palette). */
export const LINKS: { label: string; href: string; icon: SocialIcon; note?: string }[] = [
  { label: 'Blog / notes', href: 'https://teche74.github.io/BUJJ_BLOG/', icon: 'book', note: 'Things I learn, written down' },
  { label: 'Older site (bujj.io)', href: 'https://bujj-io.onrender.com/', icon: 'globe', note: 'My previous portfolio' },
];

export const isSet = (v: string | undefined | null) => !!v && !/TODO/i.test(v);

/**
 * Light obfuscation for the email: reversed, with "@" and "." swapped for markers, so the
 * address never appears verbatim in the HTML. Decoded in the browser by src/scripts/contact.ts.
 */
export const obfuscatedEmail = () =>
  isSet(SITE.email) ? [...SITE.email].reverse().join('').replace(/@/g, '(at)').replace(/\./g, '(dot)') : '';

/** Same light obfuscation for the phone number (digits reversed, "+" and "-" swapped for markers). */
export const obfuscatedPhone = () =>
  isSet(SITE.phone) ? [...SITE.phone].reverse().join('').replace(/\+/g, '(p)').replace(/-/g, '(d)') : '';
