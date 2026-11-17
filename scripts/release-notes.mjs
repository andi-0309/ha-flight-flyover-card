// Build brief, readable GitHub release notes from commits since the last tag.
// A commit may provide richer, curated bullet points using
// Release-Note(perf): Human-readable improvement.
// Release-Note(fix): Human-readable bug fix.
// This keeps future automatic releases informative without manual tagging.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ORDER = ["Improvements", "Fixes", "Performance", "Documentation", "Maintenance"];
const SECTIONS = {
  feat: "Improvements", fix: "Fixes", perf: "Performance",
  refactor: "Improvements", docs: "Documentation", ci: "Maintenance",
  chore: "Maintenance", build: "Maintenance"
};
const IGNORE = /^(?:build: sync bundled marketplace asset|chore: release)/i;

export function formatReleaseNotes(messages) {
  const grouped = new Map(ORDER.map(section => [section, []]));
  const seen = new Set();
  let total = 0;
  for (const message of messages) {
    if (total >= 8) break;
    const lines = message.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const subject = lines[0] || "";
    if (!subject || IGNORE.test(subject)) continue;
    const conventional = /^(feat|fix|perf|refactor|docs|ci|chore|build|test)(?:\([^)]*\))?!?:\s*(.+)$/i.exec(subject);
    const type = conventional?.[1]?.toLowerCase();
    const details = lines.slice(1).map(line => {
      const m = /^Release-Note(?:\((feat|fix|perf|refactor|docs|ci|chore|build)\))?:\s*(.+)$/i.exec(line);
      return m ? { type: (m[1] || type || "feat").toLowerCase(), label: m[2] } : null;
    }).filter(Boolean);
    const items = details.length ? details : type && type !== "test" ?
      [{ type, label: conventional[2] }] : [];
    for (const item of items) {
      const section = SECTIONS[item.type] || "Improvements";
      const bullet = item.label.charAt(0).toUpperCase() + item.label.slice(1);
      const clean = /[.!?]$/.test(bullet) ? bullet : bullet + ".";
      if (seen.has(clean.toLowerCase()) || grouped.get(section).length >= 4) continue;
      grouped.get(section).push(clean);
      seen.add(clean.toLowerCase());
      if (++total >= 8) break;
    }
  }
  if (!total) return "## Changes\n\n- Minor maintenance and stability improvements.\n";
  const sections = ORDER.filter(name => grouped.get(name).length).map(name =>
    "### " + name + "\n" + grouped.get(name).map(text => "- " + text).join("\n")
  );
  return "## What's changed\n\n" + sections.join("\n\n") + "\n";
}

function messagesSince(tag) {
  const args = ["log", "--no-merges", "--format=%B%x00"];
  if (tag) args.splice(1, 0, tag + "..HEAD");
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\0").map(x => x.trim()).filter(Boolean);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.stdout.write(formatReleaseNotes(messagesSince(process.argv[2] || "")));
}
