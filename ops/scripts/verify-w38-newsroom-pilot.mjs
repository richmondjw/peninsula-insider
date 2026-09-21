#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const eventPath = resolve(root, "next/src/content/events/national-works-on-paper-2026-nwop.json");
const articlePath = resolve(root, "next/src/content/articles/practical-spring-visit-national-works-on-paper.md");
const evidencePath = resolve(root, "ops/reports/newsroom/w38-national-works-on-paper-evidence.json");
const reportPath = resolve(root, "ops/reports/newsroom/w38-national-works-on-paper-verification.json");

const eventUrl = "https://mprg.mornpen.vic.gov.au/Exhibitions/Current-exhibitions/National-Works-On-Paper-2026";
const homeUrl = "https://mprg.mornpen.vic.gov.au/Home";
const verifiedAt = process.argv[2];

if (!verifiedAt || Number.isNaN(Date.parse(verifiedAt))) {
  throw new Error("Pass an ISO-8601 verification timestamp as the first argument");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const checks = [];
const check = (name, condition, evidence) => {
  checks.push({ name, status: condition ? "passed" : "failed", evidence });
  if (!condition) throw new Error(`Verification failed: ${name}`);
};

const [eventRaw, articleRaw, evidenceRaw, eventResponse, homeResponse] = await Promise.all([
  readFile(eventPath, "utf8"),
  readFile(articlePath, "utf8"),
  readFile(evidencePath, "utf8"),
  fetch(eventUrl, { redirect: "follow" }),
  fetch(homeUrl, { redirect: "follow" }),
]);

const event = JSON.parse(eventRaw);
const evidence = JSON.parse(evidenceRaw);
const eventHtml = await eventResponse.text();
const homeHtml = await homeResponse.text();
const plainText = (html) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");
const eventText = plainText(eventHtml);
const homeText = plainText(homeHtml);
const body = articleRaw.split(/^---\s*$/m).slice(2).join("---").trim();
const bodyWords = body.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? [];

check("official exhibition source reachable", eventResponse.status === 200, `HTTP ${eventResponse.status}`);
check("official gallery source reachable", homeResponse.status === 200, `HTTP ${homeResponse.status}`);
check("official exhibition dates independently observed", /5\s+September\s*[-–]\s*22\s+November\s+2026/i.test(eventText), "5 September to 22 November 2026");
check("official address independently observed", /Civic\s+Reserve/i.test(homeText) && /Dunns\s+Road/i.test(homeText) && /Mornington/i.test(homeText), "Civic Reserve, Dunns Road, Mornington");
check("official regular hours independently observed", /11\s*(?:am|a\.m\.)\s*[-–]\s*4\s*(?:pm|p\.m\.)/i.test(homeText) && /Tues(?:day)?\s*[-–]\s*Sun(?:day)?/i.test(homeText), "11am-4pm, Tuesday-Sunday");
check("official Monday closure independently observed", /closed\s+mondays/i.test(homeText), "Closed Mondays");

check("event dates match sources", event.startDate === "2026-09-05" && event.endDate === "2026-11-22", `${event.startDate} to ${event.endDate}`);
check("event hours match sources", event.startTime === "11:00" && event.endTime === "16:00", `${event.startTime}-${event.endTime}`);
check("event location matches sources", event.venueName === "Mornington Peninsula Regional Gallery" && event.streetAddress === "Civic Reserve, Dunns Road", `${event.venueName}; ${event.streetAddress}`);
check("event URLs use current official sources", event.officialEventUrl === eventUrl && event.primarySourceUrl === eventUrl && event.secondarySourceUrl === homeUrl, "current MPRG exhibition and home pages");
check("event source check is current", event.lastCheckedDate === "2026-09-17", event.lastCheckedDate);
check("unsupported commercial and availability fields are absent", ["bookingRequired", "freePaid", "priceTier", "editorVerdict", "editorNote", "coordinates"].every((field) => !(field in event)), "no ticket, booking, pricing, verdict, note or coordinate fields");

check("article length is within approved scope", bodyWords.length >= 100 && bodyWords.length <= 150, `${bodyWords.length} words`);
check("article states only verified visit facts", /5 September to 22 November/.test(body) && /Tuesday-to-Sunday/.test(body) && /11am to 4pm/.test(body) && /Civic Reserve, Dunns Road, Mornington/.test(body), "dates, regular hours and address present");
check("article advises a current source check", /Before travelling, check the official exhibition page and the gallery home page/i.test(body), "pre-travel source check present");
check("article excludes unsupported claims explicitly", /does not make claims about tickets, availability, individual works or the best time to visit/i.test(body), "exclusion statement present");
check("article contains no fabricated first-hand visit", !/\b(?:I|we)\s+(?:visited|went|saw|attended|found)\b/i.test(body), "no first-person visit claim");
check("article contains no partner promotion", !/\b(?:partner|sponsored|affiliate|book now|buy tickets)\b/i.test(body), "no commercial call to action");

check("evidence packet identifies approved plan", evidence.plan_id === "e25b1b5d-ee97-550d-ace9-39d0b73a7bba", evidence.plan_id);
check("evidence packet identifies both plan items", ["19baff07-58fc-5b90-b3ad-cf97f1f8fe8b", "675c0939-de9b-527a-8ac6-2cfdd5876465"].every((id) => evidence.plan_item_ids.includes(id)), evidence.plan_item_ids.join(", "));

const report = {
  contract: "pi.newsroom.verification/1",
  status: "passed",
  verifier: "Independent Verifier / deterministic evidence gate",
  verified_at: verifiedAt,
  plan_id: evidence.plan_id,
  artifacts: [
    { path: "next/src/content/events/national-works-on-paper-2026-nwop.json", sha256: sha256(eventRaw) },
    { path: "next/src/content/articles/practical-spring-visit-national-works-on-paper.md", sha256: sha256(articleRaw) },
    { path: "ops/reports/newsroom/w38-national-works-on-paper-evidence.json", sha256: sha256(evidenceRaw) },
  ],
  checks,
};

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: report.status, checks: checks.length, report: reportPath }, null, 2));
