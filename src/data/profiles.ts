/**
 * Coding-profile cards (Profiles page, home "stats" strip, command palette).
 *
 * - `live: 'github' | 'leetcode'` cards are filled in the browser from public APIs;
 *   their `stats` are only the fallback shown while loading or when the API is down.
 * - Every other card is static: edit `stats` / `badges` by hand when they change.
 * - Any card whose href contains "TODO" is hidden automatically.
 * - `mark` is a short monogram drawn in a gradient tile, so no third-party logos are needed.
 *   `hue` (0–360) tints that tile.
 */
import { GITHUB_USERNAME, LEETCODE_USERNAME } from '../config';

export interface ProfileStat {
  label: string;
  value: string | number;
}

export interface CodingProfile {
  id: string;
  name: string;
  handle: string;
  href: string;
  mark: string;
  hue: number;
  blurb?: string;
  stats?: ProfileStat[];
  /** Short badge chips, e.g. "C++ ★★★". */
  badges?: string[];
  live?: 'github' | 'leetcode';
  /** Smaller, link-only card. */
  compact?: boolean;
}

export const PROFILES: CodingProfile[] = [
  {
    id: 'leetcode',
    name: 'LeetCode',
    handle: LEETCODE_USERNAME,
    href: `https://leetcode.com/u/${LEETCODE_USERNAME}/`,
    mark: 'LC',
    hue: 38,
    blurb: 'Knight badge · daily streak badges since 2023',
    live: 'leetcode',
    stats: [
      { label: 'solved', value: 1348 },
      { label: 'contest rating', value: 1944 },
      { label: 'top', value: '3.57%' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    handle: GITHUB_USERNAME,
    href: `https://github.com/${GITHUB_USERNAME}`,
    mark: 'GH',
    hue: 265,
    blurb: 'Test automation, data engineering and ML projects',
    live: 'github',
    stats: [{ label: 'public repos', value: 51 }],
  },
  {
    id: 'hackerrank',
    name: 'HackerRank',
    handle: 'ujjwalbisht55',
    href: 'https://www.hackerrank.com/profile/ujjwalbisht55',
    mark: 'HR',
    hue: 140,
    blurb: 'Skill badges and certificates',
    badges: ['C++ ★★★', 'SQL ★★★', 'C ★★★', 'Python ★★'],
  },
  {
    id: 'gfg',
    name: 'GeeksforGeeks',
    handle: 'ujjwalbisht55',
    href: 'https://www.geeksforgeeks.org/user/ujjwalbisht55/',
    mark: 'GfG',
    hue: 150,
    stats: [
      { label: 'problems solved', value: 133 },
      { label: 'coding score', value: 279 },
    ],
  },
  { id: 'kaggle', name: 'Kaggle', handle: 'ujjwalbisht', href: 'https://www.kaggle.com/ujjwalbisht', mark: 'K', hue: 195, compact: true },
  { id: 'codeforces', name: 'Codeforces', handle: 'ujjwalbisht55', href: 'https://codeforces.com/profile/ujjwalbisht55', mark: 'CF', hue: 210, compact: true },
  { id: 'hackerearth', name: 'HackerEarth', handle: 'ujjwalbisht55', href: 'https://www.hackerearth.com/@ujjwalbisht55', mark: 'HE', hue: 230, compact: true },
  {
    id: 'credly',
    name: 'Credly',
    handle: 'WorldQuant ADS Lab',
    href: 'https://www.credly.com/badges/5a8836c4-73d0-4eb5-827c-65efadba14b4/public_url',
    mark: 'Cr',
    hue: 20,
    compact: true,
  },
];

/**
 * LeetCode values shown instantly (and whenever every live proxy is down).
 * Snapshot taken Sep 2026; the live fetch replaces them when it succeeds.
 */
export const LEETCODE_FALLBACK = {
  asOf: 'Sep 2026',
  solved: 1348,
  easy: 582,
  medium: 652,
  hard: 114,
  rating: 1944,
  peakRating: 2016.7,
  peakContest: 'Weekly Contest 427',
  bestRank: 595,
  bestRankContest: 'Weekly Contest 421',
  contests: 39,
  topPercent: 3.57,
  badge: 'Knight',
  badgesCount: 19,
  /** Accepted problems per language. */
  languages: [
    ['C++', 1251],
    ['C', 77],
    ['MySQL', 72],
    ['Scala', 50],
    ['Java', 33],
  ] as [string, number][],
  /** Problems per topic tag. */
  topTags: [
    ['Array', 759],
    ['String', 334],
    ['Hash Table', 290],
    ['Sorting', 194],
    ['Math', 190],
    ['Dynamic Programming', 157],
  ] as [string, number][],
};
