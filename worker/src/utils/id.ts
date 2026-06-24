/**
 * Human-like random email local part generator.
 * Uses adjective + noun + optional number to mimic real email addresses.
 */

const ADJECTIVES = [
  'cool', 'fast', 'nice', 'good', 'real', 'true', 'pure', 'wild',
  'calm', 'bold', 'wise', 'keen', 'safe', 'free', 'gold', 'dark',
  'deep', 'rare', 'slim', 'glad', 'neat',
  'sunny', 'lucky', 'swift', 'brave', 'clear', 'smart', 'sharp',
  'fresh', 'happy', 'quiet', 'vivid', 'noble', 'royal', 'prime',
  'super', 'ultra', 'mega', 'hyper', 'rapid', 'silver',
  'copper', 'bronze', 'cosmic', 'stellar', 'crystal', 'golden',
  'silent', 'gentle', 'bright', 'simple', 'honest', 'modern',
  'smooth', 'subtle', 'humble', 'strong',
];

const NOUNS = [
  'cat', 'dog', 'fox', 'owl', 'bat', 'elk', 'yak',
  'sky', 'sun', 'sea', 'bay', 'cove', 'lake', 'peak',
  'star', 'moon', 'mars', 'nova', 'solar', 'comet',
  'pine', 'oak', 'elm', 'ash', 'ivy', 'lotus', 'jade',
  'wave', 'wind', 'fire', 'ice', 'storm', 'frost', 'rain',
  'rock', 'stone', 'gem', 'opal', 'ruby', 'onyx', 'jazz',
  'bird', 'hawk', 'wolf', 'bear', 'deer', 'dove', 'swan',
  'lion', 'eagle', 'falcon', 'raven', 'tiger', 'shark',
  'river', 'ocean', 'creek', 'ridge', 'field', 'trail',
  'cloud', 'snow', 'dust', 'spark', 'flame', 'blaze',
  'leaf', 'seed', 'root', 'wood', 'forest', 'grove',
  'ace', 'pro', 'zen', 'one', 'pilot', 'scout', 'chief',
  'sage', 'knight', 'mentor', 'tutor', 'coach', 'guide',
  'beacon', 'harbor', 'haven', 'oasis', 'shelter', 'tower',
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * arr.length)];
}

/**
 * Generate a human-like random email local part.
 * Pattern: adjective + noun + optional number
 * Examples: cool.river42, happy.fox, swift.eagle7
 */
export function generateLocalPart(length?: number): string {
  const adj = pickRandom(ADJECTIVES);
  const noun = pickRandom(NOUNS);
  const num = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000 * 100);

  // Option: separator (dot/underscore/none)
  const sep = Math.random() < 0.8 ? '.' : '_';

  // Option: append number (60% chance)
  const withNum = Math.random() < 0.6;

  const base = `${adj}${sep}${noun}`;
  return withNum ? `${base}${num}` : base;
}

/**
 * Generate a full UUID v4.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Validate a custom email local part.
 * Must be 3-30 alphanumeric characters, dots, underscores, or dashes.
 * Cannot start or end with a special character.
 */
export function validatePrefix(prefix: string): boolean {
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(prefix)) return false;
  // Can't start or end with special chars
  if (/^[._-]/.test(prefix) || /[._-]$/.test(prefix)) return false;
  // Can't have consecutive special chars
  if (/[._-]{2,}/.test(prefix)) return false;
  return true;
}
