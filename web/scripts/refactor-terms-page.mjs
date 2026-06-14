import fs from "node:fs";
import path from "node:path";

const pagePath = path.join("src", "app", "terms", "page.tsx");
const lines = fs.readFileSync(pagePath, "utf8").split(/\r?\n/);
const articleStart = lines.findIndex((l) => l.includes("<article className=\"space-y-12"));
const articleEnd = lines.findIndex((l, i) => i > articleStart && l.trim() === "</article>");
const footerStart = lines.findIndex((l, i) => i > articleEnd && l.includes("mt-16 flex flex-col"));
const endComponent = lines.findIndex((l, i) => i > footerStart && l === "}");

const head = lines.slice(0, articleStart);
const footer = lines.slice(footerStart, endComponent + 1);
const tail = lines.slice(endComponent + 1).filter((l) => !l.startsWith("function Section") && !l.startsWith("function Subsection") && l.trim() !== "}" || l === "}");

const newPage = [
  ...head,
  "        <TermsArticle />",
  "",
  ...footer,
  ...tail.filter((l) => l !== ""),
].join("\n");

fs.writeFileSync(pagePath, newPage);
console.log("Refactored page.tsx");
