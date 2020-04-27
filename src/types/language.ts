
export const languages = ["enUS", "enGB", "esLA", "esES", "ptBR", "ptPT", "frFR", "deDE", "arME", "itIT", "ruRU"] as const;
export type Language = typeof languages[number];
//export type Language = "enUS" | "enGB" | "esLA" | "esES" | "ptBR" | "ptPT" | "frFR" | "deDE" | "arME" | "itIT" | "ruRU";
