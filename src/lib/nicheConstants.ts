export const NICHE_OPTIONS = [
  "Semua Kategori (All Trends)",
  "Podcast & Talkshow",
  "Entertainment & Pop Culture",
  "Gaming",
  "Comedy & Humor",
  "Music",
  "Science & Tech (AI / Gadget)",
  "Education & Knowledge",
  "Bisnis & Finansial",
  "Kesehatan & Olahraga",
  "Kuliner & Food",
  "People & Blogs (Vlog)",
  "Howto & Style",
  "Horor & Misteri",
  "News & Politics",
] as const;

export type NicheOption = (typeof NICHE_OPTIONS)[number] | string;

