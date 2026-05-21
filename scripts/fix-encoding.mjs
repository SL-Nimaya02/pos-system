import { readFileSync, writeFileSync } from "fs";

// Windows-1252 special chars that don't map 1-to-1 with Latin-1
const cp1252 = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function fixDoubleEncoding(filePath) {
  const raw = readFileSync(filePath);
  // Drop BOM if present
  const text = raw.toString("utf8").replace(/^\uFEFF/, "");

  // Each char's code point was a Windows-1252 byte — recover original bytes
  const bytes = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp in cp1252) {
      bytes.push(cp1252[cp]);
    } else if (cp <= 0xFF) {
      bytes.push(cp);
    } else {
      // Multi-byte char not from cp1252 — encode as-is (ASCII/structural code)
      for (const b of Buffer.from(ch, "utf8")) bytes.push(b);
    }
  }

  const fixed = Buffer.from(bytes).toString("utf8");
  writeFileSync(filePath, fixed, { encoding: "utf8" });
  console.log(`Fixed: ${filePath}`);
  // Show first non-ASCII translation value
  const firstSinhala = fixed.match(/"([^\x00-\x7F][^"]+)"/);
  if (firstSinhala) console.log("Sample:", firstSinhala[1]);
}

fixDoubleEncoding("./src/lib/i18n/si.ts");
fixDoubleEncoding("./src/lib/i18n/ta.ts");
