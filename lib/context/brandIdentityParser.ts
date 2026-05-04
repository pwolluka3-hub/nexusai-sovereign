export interface ParsedStructuredBrandIdentity {
  brandName?: string;
  niche?: string;
  characterName?: string;
  characterProfile?: string;
  contentPillars: string[];
  avoidTopics: string[];
  contentThemes: string[];
  episodeStructure?: string;
  raw: string;
}

const SECTION_HEADINGS = [
  'Brand Core',
  'Character Lock',
  'Content Pillars',
  'Skill Modules',
  'Episode Structure',
  'Topics to Avoid',
  'Prompt Template',
  'Prompt Templates',
];

function normalizeLine(line: string): string {
  return line
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripNumberPrefix(line: string): string {
  return normalizeLine(line).replace(/^\d+[\).\-\s]+/, '').trim();
}

function findSectionLines(lines: string[], heading: string): string[] {
  const start = lines.findIndex((line) => line.toLowerCase().startsWith(heading.toLowerCase()));
  if (start < 0) return [];

  const result: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const isNextHeading = SECTION_HEADINGS.some((candidate) =>
      candidate.toLowerCase() !== heading.toLowerCase() &&
      line.toLowerCase().startsWith(candidate.toLowerCase())
    );
    if (isNextHeading) break;
    if (line) result.push(line);
  }

  return result;
}

function extractItems(lines: string[]): string[] {
  return lines
    .map(stripNumberPrefix)
    .filter((line) => line.length > 0);
}

function extractCharacterName(brandCoreItems: string[], raw: string): string | undefined {
  const direct = brandCoreItems
    .map((item) => item.match(/^One character:\s*(.+)$/i)?.[1]?.trim())
    .find(Boolean);
  if (direct) return direct;

  const characterLockMatch = raw.match(/Character Lock\s*[—-]\s*([A-Za-z0-9' ]{2,80})/i);
  return characterLockMatch?.[1]?.trim();
}

function extractWorldNiche(brandName: string | undefined, brandCoreItems: string[]): string | undefined {
  const world = brandCoreItems
    .map((item) => item.match(/^One world:\s*(.+)$/i)?.[1]?.trim())
    .find(Boolean);
  if (world && brandName) return `${brandName}: ${world}`;
  if (world) return world;
  return brandName;
}

export function looksLikeStructuredBrandIdentity(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    /\bbrand core\b/.test(normalized) &&
    /\bcharacter lock\b/.test(normalized) &&
    /\bcontent pillars\b/.test(normalized) &&
    (/\btopics to avoid\b/.test(normalized) || /\bskill modules\b/.test(normalized))
  );
}

export function parseStructuredBrandIdentity(message: string): ParsedStructuredBrandIdentity | null {
  const raw = String(message || '').trim();
  if (!raw || !looksLikeStructuredBrandIdentity(raw)) return null;

  const prepared = raw.replace(
    /\s+(Brand Core|Character Lock(?:\s*[—-]\s*[^0-9\n]+)?|Content Pillars|Skill Modules|Episode Structure(?:\s*\([^)]*\))?|Topics to Avoid|Prompt Templates?(?:\s*\([^)]*\))?)(?=\s*(?:\n|\d|\r|$))/gi,
    '\n$1'
  );

  const lines = prepared
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const title = lines.find((line) => !SECTION_HEADINGS.some((heading) => line.toLowerCase().startsWith(heading.toLowerCase())));
  const brandName = title?.split(/\s+[—-]\s+/)[0]?.trim();
  const brandCoreItems = extractItems(findSectionLines(lines, 'Brand Core'));
  const characterLines = extractItems(findSectionLines(lines, 'Character Lock'));
  const contentPillars = extractItems(findSectionLines(lines, 'Content Pillars'));
  const skillModules = extractItems(findSectionLines(lines, 'Skill Modules'));
  const episodeItems = extractItems(findSectionLines(lines, 'Episode Structure'));
  const avoidTopics = extractItems(findSectionLines(lines, 'Topics to Avoid'));
  const characterName = extractCharacterName(brandCoreItems, raw);
  const niche = extractWorldNiche(brandName, brandCoreItems);
  const characterProfile = [
    characterName ? `${characterName} character lock` : 'Character lock',
    ...characterLines,
  ].join(': ');

  return {
    brandName,
    niche,
    characterName,
    characterProfile,
    contentPillars,
    avoidTopics,
    contentThemes: [...brandCoreItems, ...skillModules],
    episodeStructure: episodeItems.join(' | ') || undefined,
    raw: raw.slice(0, 5000),
  };
}
