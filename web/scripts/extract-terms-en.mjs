import fs from "node:fs";
import path from "node:path";

const pagePath = path.join("src", "app", "terms", "page.tsx");
const lines = fs.readFileSync(pagePath, "utf8").split(/\r?\n/);
const start = lines.findIndex((l) => l.includes('<article className="space-y-12'));
const end = lines.findIndex((l, i) => i > start && l.trim() === "</article>");
if (start < 0 || end < 0) throw new Error("Could not find article bounds");

let body = lines.slice(start + 1, end).join("\n");
body = body.replace(/<Section /g, "<LegalSection ");
body = body.replace(/<\/Section>/g, "</LegalSection>");
body = body.replace(/<Subsection /g, "<LegalSubsection ");
body = body.replace(/<\/Subsection>/g, "</LegalSubsection>");
body = body.replace(
  /title=\{t\.terms\.sectionTitles\[(\d+)\] \?\? ""\}/g,
  "title={titles[$1] ?? \"\"}",
);

const header = `import type { Dictionary } from "@/lib/i18n/types";
import { LegalSection, LegalSubsection, codeClass } from "../shared";

export function TermsBodyEn({ titles }: { titles: Dictionary["terms"]["sectionTitles"] }) {
  return (
    <>
`;

const footer = `
    </>
  );
}
`;

const outDir = path.join("src", "lib", "i18n", "legal", "terms");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "en.tsx"), header + body + footer);
console.log("Wrote en.tsx with", body.split("\n").length, "lines");
