export type SkillRef = {
  name: string;
  id: string;
};

export type Skill = SkillRef & {
  description: string;
};

export function formatMention(skill: SkillRef): string {
  return `/${skill.name} (Kody skill_get id: ${skill.id})`;
}

export type SlashPartial = {
  start: number;
  query: string;
};

const MENTION = /\/[^\s]+ \(Kody skill_get id: [^)]+\)/;
const SLASH_TOKEN = /\/([^\s]*)/g;

export function findSlashPartial(
  text: string,
  caret: number,
): SlashPartial | null {
  const prefix = text.slice(0, caret);
  let last: SlashPartial | null = null;
  for (const match of prefix.matchAll(SLASH_TOKEN)) {
    const start = match.index ?? 0;
    if (isCompletedMentionAt(text, start)) {
      continue;
    }
    last = { start, query: match[1] ?? "" };
  }
  return last;
}

function isCompletedMentionAt(text: string, start: number): boolean {
  const matched = text.slice(start).match(MENTION);
  return matched !== null && matched.index === 0;
}

export function filterSkills(skills: Skill[], query: string): Skill[] {
  const needle = query.toLowerCase();
  return skills.filter((skill) => skill.name.toLowerCase().startsWith(needle));
}

export function replacePartial(
  text: string,
  partial: SlashPartial,
  mention: string,
): string {
  const end = partial.start + 1 + partial.query.length;
  return text.slice(0, partial.start) + mention + text.slice(end);
}

export function isPrompt(text: string): boolean {
  return MENTION.test(text);
}
