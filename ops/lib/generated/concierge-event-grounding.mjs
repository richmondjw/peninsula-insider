// ops/lib/concierge-snapshot.mjs
import { createHash as createHash2 } from "node:crypto";

// ops/lib/concierge-manifest.mjs
import { createHash } from "node:crypto";
var hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
var nonempty = (x) => typeof x === "string" && x.length > 0;
var instant = (x) => nonempty(x) && Number.isFinite(Date.parse(x));
var fields = ["indexSchema", "embeddingModel", "promptRevision", "appRevision"];
function validateManifest(m) {
  const errors = [];
  if (!m || m.schemaVersion !== 1) return ["manifest-schema"];
  for (const key of ["id", "sourceRevision", "sourceDigest"]) if (!nonempty(m[key])) errors.push("missing-" + key);
  if (!fields.every((k) => nonempty(m.bundle?.[k]))) errors.push("bundle-incomplete");
  if (!(m.sourceVerifiedAt === null || instant(m.sourceVerifiedAt)) || !(m.contentPublishedAt === null || instant(m.contentPublishedAt)) || !instant(m.ingestedAt) || !instant(m.retrievedAt)) errors.push("freshness-incomplete");
  if (Date.parse(m.retrievedAt) < Date.parse(m.ingestedAt)) errors.push("retrieved-before-ingested");
  if (m.state !== "complete" || m.failures?.length || m.lockHeld !== true) errors.push("incomplete-or-failed");
  if (!Array.isArray(m.sourceRecords) || !Array.isArray(m.outcomes) || !Array.isArray(m.indexRows) || !Array.isArray(m.pages)) return [...errors, "inventory-schema"];
  if (![...m.sourceRecords, ...m.outcomes, ...m.indexRows, ...m.pages].every((r) => r && typeof r === "object" && !Array.isArray(r))) return [...errors, "record-schema"];
  if (!Array.isArray(m.failures)) errors.push("failure-ledger-missing");
  if (m.sourceDigest !== hash(m.sourceRecords)) errors.push("source-digest");
  const ids = m.sourceRecords.map((r) => r.id), rowIds = m.indexRows.map((r) => r.id), outcomeIds = m.outcomes.map((r) => r.id);
  for (const [name, values] of [["source", ids], ["index", rowIds], ["outcome", outcomeIds]]) if (values.some((x) => !nonempty(x)) || new Set(values).size !== values.length) errors.push(name + "-duplicates-or-missing-id");
  const source = new Map(m.sourceRecords.map((r) => [r.id, r])), rows = new Map(m.indexRows.map((r) => [r.id, r]));
  if (outcomeIds.length !== ids.length || ids.some((id) => !outcomeIds.includes(id)) || outcomeIds.some((id) => !source.has(id))) errors.push("unaccounted-source");
  for (const r of m.sourceRecords) if (!nonempty(r.revision) || !nonempty(r.effectiveRevision) || !["index", "exclude"].includes(r.admission) || r.admission === "exclude" && !nonempty(r.exclusionReason)) errors.push("source-contract");
  for (const outcome of m.outcomes) {
    const r = source.get(outcome.id);
    if (!r) continue;
    if (outcome.status === "failed") {
      errors.push("record-failed");
      continue;
    }
    if (outcome.status === "excluded") {
      if (r.admission !== "exclude" || outcome.reason !== r.exclusionReason || rows.has(r.id)) errors.push("unjustified-exclusion");
    } else if (outcome.status === "indexed") {
      const row = rows.get(r.id);
      if (r.admission !== "index" || !row || row.revision !== r.effectiveRevision || outcome.revision !== r.effectiveRevision) errors.push("revision-or-admission-mismatch");
    } else errors.push("unknown-outcome");
  }
  if (rowIds.some((id) => !source.has(id))) errors.push("stale-or-unexpected-index-row");
  const pageIds = m.pages.flatMap((p) => Array.isArray(p.ids) ? p.ids : []);
  if (!m.pages.length || m.pages[0].cursor !== null || m.pages.at(-1).nextCursor !== null || m.pages.some((p, i) => p.snapshot !== m.sourceRevision || !Array.isArray(p.ids) || i > 0 && (p.cursor == null || p.cursor !== m.pages[i - 1].nextCursor)) || new Set(m.pages.map((p) => p.cursor)).size !== m.pages.length || JSON.stringify(pageIds) !== JSON.stringify(ids)) errors.push("pagination-not-exhaustive");
  if (!Array.isArray(m.previousIndexedIds) || !Array.isArray(m.removedIds) || [m.previousIndexedIds, m.removedIds].some((ids2) => ids2.some((id) => !nonempty(id)) || new Set(ids2).size !== ids2.length)) errors.push("deletion-schema");
  else {
    const removed = m.previousIndexedIds.filter((id) => !rowIds.includes(id)).sort();
    if (JSON.stringify(removed) !== JSON.stringify([...m.removedIds].sort())) errors.push("deletion-accounting");
  }
  return [...new Set(errors)];
}

// ops/lib/concierge-event-source.mjs
function validateEventSource(data, slug) {
  const object = (v, label) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw Error(`Invalid event ${label}`);
  };
  const text = (v, label) => {
    if (typeof v !== "string") throw Error(`Invalid event ${label}`);
  };
  const bool = (v, label) => {
    if (typeof v !== "boolean") throw Error(`Invalid event ${label}`);
  };
  const date = (v, label) => {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v) || !Number.isFinite(Date.parse(v)) || (/* @__PURE__ */ new Date(v.slice(0, 10) + "T00:00:00Z")).toISOString().slice(0, 10) !== v.slice(0, 10)) throw Error(`Invalid event ${label}`);
  };
  if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("Invalid event source object");
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error("Invalid event identity");
  if (typeof data.title !== "string" || !data.title.trim()) throw Error("Missing event title");
  if (data.slug !== void 0 && data.slug !== slug) throw Error("Event slug does not match source filename");
  if (data.status !== void 0 && !["draft", "review", "scheduled", "published", "expired", "past", "archived"].includes(data.status)) throw Error("Invalid event lifecycle");
  for (const [field, allowed] of Object.entries({ recurrence: ["one-off", "weekly", "monthly", "annual", "seasonal", "ongoing"], occurrencePolicy: ["cadence", "confirmed-only"], dateBasis: ["fixed", "operator-calendar", "on-request", "opening-hours"], contentKind: ["event", "experience", "offer"], bookingStatus: ["open", "sold-out", "waitlist", "closed", "not-required", "unknown"] })) {
    if (data[field] !== void 0 && !allowed.includes(data[field])) throw Error(`Invalid event ${field}`);
  }
  for (const field of ["cancelled", "postponed", "skipThis", "endsNextDay", "reviewHold", "factualReviewHold"]) if (data[field] !== void 0) bool(data[field], field);
  for (const field of ["suburb", "summary", "venueName", "startTime", "endTime", "timezone", "recurrenceNote", "verificationStatus", "bookingStatus", "reviewStatus"]) if (data[field] !== void 0) text(data[field], field);
  for (const field of ["place", "venue"]) if (data[field] !== void 0) {
    if (typeof data[field] === "string") continue;
    object(data[field], field);
    text(data[field].id, field + ".id");
  }
  for (const field of ["startDate", "endDate", "nextOccurrence", "rescheduledTo", "expiresAt", "sourceUpdatedAt", "lastVerifiedAt", "lastCheckedDate", "publishedAt"]) {
    const value = data[field];
    if (value === void 0 && field !== "startDate") continue;
    date(value, field);
  }
  if (data.endDate && Date.parse(data.endDate) < Date.parse(data.startDate)) throw Error("Inverted event date range");
  for (const field of ["seriesOccurrences", "occurrenceExceptions"]) if (data[field] !== void 0) {
    const values = data[field];
    if (!Array.isArray(values)) throw Error(`Invalid event ${field}`);
    const days = /* @__PURE__ */ new Set();
    for (const row of values) {
      object(row, field);
      date(row.date, field + ".date");
      for (const key of ["date", "originalDate", "rescheduledTo"]) if (row[key] !== void 0 && !/^\d{4}-\d{2}-\d{2}$/.test(row[key])) throw Error(`Invalid event ${field}.${key}`);
      if (days.has(row.date)) throw Error(`Duplicate event ${field} date`);
      days.add(row.date);
      const statuses = ["cancelled", "postponed", "rescheduled", "sold-out", "moved", "as-scheduled", ...field === "seriesOccurrences" ? ["scheduled"] : []];
      if (!statuses.includes(row.status)) throw Error(`Invalid event ${field}.status`);
      for (const key of ["originalDate", "rescheduledTo"]) if (row[key] !== void 0) date(row[key], field + "." + key);
      if (field === "seriesOccurrences") {
        text(row.id, field + ".id");
        date(row.originalDate, field + ".originalDate");
        text(row.venueName, field + ".venueName");
        text(row.sourceUrl, field + ".sourceUrl");
      }
      for (const key of ["startTime", "endTime", "venueName", "sourceUrl", "note"]) if (row[key] !== void 0 && !(field === "seriesOccurrences" && ["startTime", "endTime"].includes(key) && row[key] === null)) text(row[key], field + "." + key);
    }
  }
  if (data.sourceReview !== void 0) {
    object(data.sourceReview, "sourceReview");
    if (data.sourceReview.required !== void 0) bool(data.sourceReview.required, "sourceReview.required");
  }
  if (data.intelligence !== void 0) {
    const receipt = data.intelligence;
    object(receipt, "intelligence");
    for (const key of ["revision", "approvedContent", "approvedBy"]) if (receipt[key] !== void 0) text(receipt[key], "intelligence." + key);
    for (const key of ["approvedAt", "reviewedAt"]) if (receipt[key] !== void 0) date(receipt[key], "intelligence." + key);
    if (receipt.factScore !== void 0 && (typeof receipt.factScore !== "number" || !Number.isFinite(receipt.factScore))) throw Error("Invalid event intelligence.factScore");
    if (receipt.evidenceIds !== void 0) {
      if (!Array.isArray(receipt.evidenceIds) || receipt.evidenceIds.some((v) => typeof v !== "string")) throw Error("Invalid event intelligence.evidenceIds");
    }
    if (receipt.standingAuthority !== void 0) {
      object(receipt.standingAuthority, "intelligence.standingAuthority");
      for (const key of ["id", "by", "scope", "source"]) if (receipt.standingAuthority[key] !== void 0) text(receipt.standingAuthority[key], "standingAuthority." + key);
      if (receipt.standingAuthority.at !== void 0) date(receipt.standingAuthority.at, "standingAuthority.at");
    }
    if (receipt.geography !== void 0) {
      const geo = receipt.geography;
      object(geo, "intelligence.geography");
      if (geo.shireConfirmed !== void 0) bool(geo.shireConfirmed, "geography.shireConfirmed");
      for (const key of ["verifiedBy", "evidenceId"]) if (geo[key] !== void 0) text(geo[key], "geography." + key);
      if (geo.checkedAt !== void 0) date(geo.checkedAt, "geography.checkedAt");
    }
  }
}

// ops/lib/concierge-snapshot.mjs
var digest = (text) => createHash2("sha256").update(text).digest("hex");
function validateRecords(records) {
  const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const text = (v) => typeof v === "string" && v.trim().length > 0;
  const instant2 = (v) => text(v) && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
  if (records.some((r) => !object(r) || !text(r.id) || !text(r.revision) || !object(r.data) || r.verifiedAt !== null && !instant2(r.verifiedAt) || r.validUntil !== void 0 && !instant2(r.validUntil) || r.liveAvailability !== void 0 && (!object(r.liveAvailability) || typeof r.liveAvailability.available !== "boolean" || !instant2(r.liveAvailability.checkedAt) || !instant2(r.liveAvailability.validUntil)))) return ["record-schema"];
  return [];
}
function validateBindings(manifest, records) {
  const errors = validateManifest(manifest);
  if (errors.length) throw Error(errors.join(","));
  if (!Array.isArray(records) || records.length !== manifest.sourceRecords.length) throw Error("record-inventory");
  const invalid = validateRecords(records);
  if (invalid.length) throw Error(invalid.join(","));
  const byId = new Map(records.map((r) => [r?.id, r]));
  if (byId.size !== records.length) throw Error("duplicate-record");
  for (const source of manifest.sourceRecords) {
    const record = byId.get(source.id);
    if (!record || record.revision !== source.effectiveRevision || source.payloadDigest !== hash(record)) throw Error("source-payload-binding");
    const data = { ...record.data };
    for (const key of ["startTime", "endTime"]) if (data[key] === null) delete data[key];
    validateEventSource(data, data.slug ?? record.id);
  }
}
function readPrepared(prepared) {
  if (!prepared || typeof prepared.payload !== "string" || prepared.token !== digest(prepared.payload)) throw Error("prepared-digest");
  const value = JSON.parse(prepared.payload);
  if (value.version !== 1) throw Error("prepared-version");
  if (value.predecessorToken !== null && !/^[a-f0-9]{64}$/.test(value.predecessorToken ?? "")) throw Error("prepared-predecessor");
  if (!Number.isInteger(value.dimensions) || value.dimensions < 1 || value.dimensions > 4096) throw Error("embedding-dimensions");
  validateBindings(value.manifest, value.records);
  const ids = value.manifest.indexRows.map((r) => r.id);
  if (!Array.isArray(value.embeddings) || value.embeddings.length !== ids.length) throw Error("embedding-inventory");
  const embedded = /* @__PURE__ */ new Set();
  for (const row of value.embeddings) {
    if (!ids.includes(row.id) || embedded.has(row.id) || !Array.isArray(row.vector) || row.vector.length !== value.dimensions || !row.vector.every(Number.isFinite)) throw Error("embedding-shape");
    embedded.add(row.id);
    const source = value.records.find((r) => r.id === row.id);
    if (row.textDigest !== hash(`${source.data.title}
${source.data.summary ?? ""}`)) throw Error("embedding-text-binding");
  }
  return value;
}

// next/src/lib/event-occurrence.mjs
var PENINSULA_TZ = "Australia/Melbourne";
var MINUTE = 6e4;
var _formatters = /* @__PURE__ */ new Map();
function formatterFor(tz) {
  let f = _formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    _formatters.set(tz, f);
  }
  return f;
}
function zonedParts(instant2, tz = PENINSULA_TZ) {
  const parts = formatterFor(tz).formatToParts(instant2);
  const num = (type) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour") % 24,
    minute: num("minute"),
    second: num("second")
  };
}
function zoneOffsetMinutes(instant2, tz = PENINSULA_TZ) {
  const p = zonedParts(instant2, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const whole = instant2.getTime() - instant2.getTime() % 1e3;
  return Math.round((asUtc - whole) / MINUTE);
}
function isoOffsetFor(instant2, tz = PENINSULA_TZ) {
  const minutes = zoneOffsetMinutes(instant2, tz);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}
function wallClockToInstant(year, month, day, hour, minute, tz = PENINSULA_TZ) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const offsets = /* @__PURE__ */ new Set([
    zoneOffsetMinutes(new Date(naive), tz),
    zoneOffsetMinutes(new Date(naive - 864e5), tz),
    zoneOffsetMinutes(new Date(naive + 864e5), tz)
  ]);
  const candidates = [...offsets].map((off) => naive - off * MINUTE);
  const readsBack = (t) => {
    const p = zonedParts(new Date(t), tz);
    return p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute;
  };
  const valid = candidates.filter(readsBack);
  return new Date(valid.length ? Math.min(...valid) : Math.max(...candidates));
}
function parseClock(value) {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}
function parseDayIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? "").slice(0, 10));
  return m ? m[0] : null;
}
function dayIsoOf(value, tz = PENINSULA_TZ) {
  if (value == null) return null;
  if (typeof value === "string") {
    const plain = parseDayIso(value);
    if (plain) return plain;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = zonedParts(d, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
function addDaysIso(dayIso, days) {
  const [y, m, d] = dayIso.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  const p = (n) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}`;
}
function toDate(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
var timezoneOf = (data) => data?.timezone || PENINSULA_TZ;
function occurrenceBounds(data, dayIso, options = {}) {
  const tz = timezoneOf(data);
  const isFirstDay = options.isFirstDay !== false;
  const isFinalDay = options.isFinalDay !== false;
  const exception = options.exception ?? null;
  const startSource = isFirstDay ? exception?.startTime ?? data?.startTime : null;
  const startClock = parseClock(startSource) ?? { hour: 0, minute: 0 };
  const rawEnd = isFinalDay ? exception?.endTime ?? data?.endTime : null;
  const endClock = parseClock(rawEnd);
  const [y, m, d] = dayIso.split("-").map(Number);
  const startsAt = wallClockToInstant(y, m, d, startClock.hour, startClock.minute, tz);
  if (!endClock) {
    const [ny, nm, nd] = addDaysIso(dayIso, 1).split("-").map(Number);
    const endsAt2 = new Date(wallClockToInstant(ny, nm, nd, 0, 0, tz).getTime() - 1);
    return { startsAt, endsAt: endsAt2, crossesMidnight: false, bounded: false };
  }
  const startMinutes = startClock.hour * 60 + startClock.minute;
  const endMinutes = endClock.hour * 60 + endClock.minute;
  const declared = data?.endsNextDay;
  const crossesMidnight = typeof declared === "boolean" ? declared : isFinalDay && endMinutes <= startMinutes;
  const endDayIso = crossesMidnight ? addDaysIso(dayIso, 1) : dayIso;
  const [ey, em, ed] = endDayIso.split("-").map(Number);
  const endsAt = wallClockToInstant(ey, em, ed, endClock.hour, endClock.minute, tz);
  return { startsAt, endsAt, crossesMidnight, bounded: true };
}
function spanBounds(data, startDayIso, endDayIso, options = {}) {
  const first = occurrenceBounds(data, startDayIso, {
    ...options,
    isFirstDay: true,
    isFinalDay: startDayIso === endDayIso
  });
  if (startDayIso === endDayIso) return first;
  const last = occurrenceBounds(data, endDayIso, { ...options, isFirstDay: false, isFinalDay: true });
  return {
    startsAt: first.startsAt,
    endsAt: last.endsAt,
    crossesMidnight: last.crossesMidnight,
    bounded: last.bounded
  };
}
function exceptionFor(data, dayIso) {
  const list = Array.isArray(data?.occurrenceExceptions) ? data.occurrenceExceptions : [];
  return list.find((x) => parseDayIso(x?.date) === dayIso) ?? null;
}
function sourceOutranksVerification(data) {
  const sourceUpdatedAt = toDate(data?.sourceUpdatedAt);
  if (!sourceUpdatedAt) return false;
  const verifiedAt = toDate(data?.lastVerifiedAt ?? data?.lastCheckedDate);
  if (!verifiedAt) return true;
  return sourceUpdatedAt.getTime() > verifiedAt.getTime();
}
function isCancelledRecord(data) {
  if (!data) return false;
  return data.cancelled === true || // Matches the noun as well as the participle. One live record reads
  // "Updated after organiser cancellation notice", which the participle
  // alone missed, so a cancelled market was listed as running.
  //
  // The trade is deliberate and asymmetric: a false positive hides an event
  // that is on, a false negative sends a reader to one that is off. Only the
  // second wastes somebody's Saturday. Verified against every
  // verificationStatus value in the corpus: exactly one record newly
  // matches, and it is the cancelled one. A future "cancellation policy"
  // would false-positive here and should be caught by review.
  /cancell(ed|ation|ing)/i.test(String(data.verificationStatus ?? "")) || /^cancelled:/i.test(String(data.summary ?? "")) || data.skipThis === true;
}
var BOOKING_LABELS = {
  "sold-out": "Sold out",
  waitlist: "Waitlist only",
  closed: "Bookings closed",
  open: null,
  "not-required": null,
  unknown: null
};
function recordDisposition(data, now = /* @__PURE__ */ new Date()) {
  const reasons = [];
  const cancelled = isCancelledRecord(data);
  const postponed = data?.postponed === true;
  const rescheduledTo = dayIsoOf(data?.rescheduledTo);
  const expiresAt = toDate(data?.expiresAt);
  const expired = Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
  const unverified = sourceOutranksVerification(data);
  const undated = Boolean(data?.dateBasis && data.dateBasis !== "fixed");
  const bookingStatus = String(data?.bookingStatus ?? "unknown");
  let status = "scheduled";
  if (cancelled) status = "cancelled";
  else if (postponed) status = rescheduledTo ? "rescheduled" : "postponed";
  if (expired) reasons.push("expired");
  if (cancelled) reasons.push("cancelled");
  if (status === "postponed") reasons.push("postponed-without-new-date");
  if (unverified) reasons.push("source-newer-than-verification");
  if (undated) reasons.push("no-confirmed-occurrence");
  const listable = !expired && status !== "postponed";
  const promotable = listable && status === "scheduled" && !unverified && !undated && bookingStatus !== "sold-out" && bookingStatus !== "closed";
  let label = null;
  if (status === "cancelled") label = "Cancelled";
  else if (status === "postponed") label = "Postponed";
  else if (status === "rescheduled") label = "New date";
  else if (data?.dateBasis === "on-request") label = "Dates on request";
  else if (data?.dateBasis === "opening-hours") label = "Check opening hours";
  else if (data?.dateBasis === "operator-calendar") label = "Check session dates";
  else label = BOOKING_LABELS[bookingStatus] ?? null;
  return { status, bookingStatus, rescheduledTo, expired, unverified, listable, promotable, label, reasons };
}
function resolveOccurrence(data, dayIso, now = /* @__PURE__ */ new Date(), options = {}) {
  const exception = options.exception ?? exceptionFor(data, dayIso);
  const endDayIso = options.endDayIso ?? dayIso;
  const bounds = endDayIso === dayIso ? occurrenceBounds(data, dayIso, { ...options, exception }) : spanBounds(data, dayIso, endDayIso, { exception });
  const disposition = options.disposition ?? recordDisposition(data, now);
  let status = disposition.status;
  let label = disposition.label;
  let note = null;
  let sourceUrl = null;
  let soldOut = disposition.bookingStatus === "sold-out" || disposition.bookingStatus === "closed";
  if (exception) {
    note = exception.note ?? null;
    sourceUrl = exception.sourceUrl ?? null;
    if (exception.status === "cancelled") {
      status = "cancelled";
      label = "Cancelled this time";
    } else if (exception.status === "sold-out") {
      soldOut = true;
      label = "Sold out";
    } else if (exception.status === "rescheduled" || exception.status === "postponed") {
      status = exception.rescheduledTo ? "rescheduled" : "postponed";
      label = exception.rescheduledTo ? "Moved to another date" : "Postponed";
    } else if (exception.status === "moved") {
      label = exception.venueName ? `Moved to ${exception.venueName}` : "Venue moved";
    } else if (exception.status === "as-scheduled") {
      label = disposition.label;
    }
  }
  const t = now.getTime();
  const phase = t < bounds.startsAt.getTime() ? "upcoming" : t <= bounds.endsAt.getTime() ? "running" : "past";
  const bookable = phase !== "past" && status === "scheduled" && !disposition.expired && !soldOut;
  if (phase === "past" && !label) label = "Ended";
  return {
    dayIso,
    startsAt: bounds.startsAt,
    endsAt: bounds.endsAt,
    crossesMidnight: bounds.crossesMidnight,
    bounded: bounds.bounded,
    status,
    phase,
    soldOut,
    bookable,
    label,
    note,
    sourceUrl,
    exception
  };
}

// next/src/lib/event-schedule.ts
var EDITORIAL_TIME_ZONE = "Australia/Melbourne";
function editorialDateParts(d) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EDITORIAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
function startOfDay(d) {
  const { year, month, day } = editorialDateParts(d);
  return new Date(Date.UTC(year, month - 1, day));
}
function addDays(d, n) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}
function isoDate(d) {
  const { year, month, day } = editorialDateParts(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${year}-${p(month)}-${p(day)}`;
}
function parseIsoLocal(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
var DAY_WORDS = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tues: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thurs: 4,
  thur: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6
};
var NTH_WORDS = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  last: -1
};
var MONTH_WORDS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};
function applicableMonths(text) {
  const lower = text.toLowerCase();
  const season = lower.match(/\b(spring|summer|autumn|winter)\b/);
  if (season && /\b(?:during|in|through|from|winter|summer|autumn|spring)\b/.test(lower)) {
    const months2 = {
      summer: [12, 1, 2],
      autumn: [3, 4, 5],
      winter: [6, 7, 8],
      spring: [9, 10, 11]
    };
    return months2[season[1]];
  }
  const range = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:to|through|-)\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (!range) return void 0;
  const start = MONTH_WORDS[range[1]];
  const end = MONTH_WORDS[range[2]];
  const result = [];
  for (let month = start; ; month = month % 12 + 1) {
    result.push(month);
    if (month === end) break;
  }
  return result;
}
function parseWeekday(text) {
  const m = text.toLowerCase().match(/\b(sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?)(?:day)?s?\b/);
  if (!m) return void 0;
  return DAY_WORDS[m[1]] ?? DAY_WORDS[`${m[1]}day`];
}
function parseWeekdays(text) {
  const matches = [...text.toLowerCase().matchAll(/\b(sun|mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?)(?:day)?s?\b/g)];
  const days = matches.map((m) => DAY_WORDS[m[1]] ?? DAY_WORDS[`${m[1]}day`]).filter((day) => day !== void 0);
  if (days.length === 2 && /\b(?:to|through)\b|[–-]/.test(text)) {
    const expanded = [days[0]];
    while (expanded.at(-1) !== days[1]) expanded.push((expanded.at(-1) + 1) % 7);
    return expanded;
  }
  return [...new Set(days)];
}
function parseNth(text) {
  const m = text.toLowerCase().match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)\b/);
  return m ? NTH_WORDS[m[1]] : void 0;
}
var FAR_HORIZON_DAYS = 370;
function baseRuleFor(event, now) {
  const data = event.data;
  if ((data.intelligence || data.occurrencePolicy === "confirmed-only") && Array.isArray(data.seriesOccurrences) && data.seriesOccurrences.length) {
    const dates = data.seriesOccurrences.map((session) => session.date).sort();
    return { kind: "explicit", start: parseIsoLocal(dates[0]), end: parseIsoLocal(dates.at(-1)), dates };
  }
  const today = startOfDay(now);
  const start = data.startDate ? startOfDay(data.startDate) : void 0;
  const endRaw = data.endDate ? startOfDay(data.endDate) : start;
  const next = data.nextOccurrence ? startOfDay(data.nextOccurrence) : void 0;
  const validNext = next && (!start || next >= start) ? next : void 0;
  if (data.occurrencePolicy === "confirmed-only") {
    const runningConfirmed = validNext && validNext < today ? resolveOccurrence(data, isoDate(validNext), now) : null;
    return validNext && (validNext >= today || runningConfirmed?.phase === "running" && runningConfirmed.bookable && runningConfirmed.crossesMidnight) ? { kind: "range", start: validNext, end: validNext } : null;
  }
  const recur = data.recurrence ?? "one-off";
  const noteText = [data.recurrenceNote, data.title, data.summary].filter(Boolean).join(" ");
  const months2 = applicableMonths(data.recurrenceNote ?? "");
  const seriesStart = start ?? today;
  const seriesEnd = endRaw && endRaw > seriesStart && ["weekly", "monthly", "ongoing"].includes(recur) ? endRaw : addDays(today, FAR_HORIZON_DAYS);
  if (recur === "weekly") {
    const days = parseWeekdays(data.recurrenceNote ?? "");
    const day = days[0] ?? start?.getUTCDay();
    if (day !== void 0) return { kind: "weekly", start: seriesStart, end: seriesEnd, day, days: days.length ? days : void 0, months: months2 };
    if (validNext && validNext >= today) return { kind: "range", start: validNext, end: validNext };
    return start && endRaw ? { kind: "range", start, end: endRaw } : null;
  }
  if (recur === "monthly") {
    const day = parseWeekday(noteText);
    const nth = parseNth(noteText);
    if (day !== void 0 && nth !== void 0) {
      return { kind: "monthly", start: seriesStart, end: seriesEnd, day, nth, months: months2 };
    }
    if (validNext && validNext >= today) return { kind: "range", start: validNext, end: validNext };
    return start && start >= today && endRaw ? { kind: "range", start, end: endRaw } : null;
  }
  if (!start || !endRaw) return null;
  if (endRaw < today && validNext && validNext >= today) {
    const spanDays = Math.round((endRaw.getTime() - start.getTime()) / 864e5);
    return { kind: "range", start: validNext, end: addDays(validNext, Math.max(0, spanDays)) };
  }
  return { kind: "range", start, end: endRaw };
}
function ruleFor(event, now) {
  const rule = baseRuleFor(event, now);
  if (!rule || rule.kind === "explicit") return rule;
  const exceptions = Array.isArray(event.data.occurrenceExceptions) ? event.data.occurrenceExceptions : [];
  const validDay = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const reschedules = {};
  for (const exception of exceptions) {
    if (!["rescheduled", "postponed"].includes(exception.status)) continue;
    const from = exception.date, to = exception.rescheduledTo;
    if (!validDay(from) || !validDay(to) || from === to) continue;
    if (exceptions.filter((x) => x.date === from).length !== 1 || exceptions.filter((x) => x.rescheduledTo === to).length !== 1) continue;
    if (!baseOccursOnDay(rule, parseIsoLocal(from))) continue;
    const target = parseIsoLocal(to);
    if (target < rule.start || target > rule.end || baseOccursOnDay(rule, target)) continue;
    reschedules[from] = to;
  }
  return Object.keys(reschedules).length ? { ...rule, reschedules } : rule;
}
function nthWeekdayIndex(d) {
  const nth = Math.floor((d.getUTCDate() - 1) / 7) + 1;
  const isLast = d.getUTCDate() + 7 > new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return { nth, isLast };
}
function baseOccursOnDay(rule, day) {
  const d = startOfDay(day);
  if (rule.kind === "explicit") return !!rule.dates?.includes(d.toISOString().slice(0, 10));
  if (d < startOfDay(rule.start) || d > startOfDay(rule.end)) return false;
  if (rule.months && !rule.months.includes(d.getUTCMonth() + 1)) return false;
  if (rule.kind === "range") return true;
  if (!(rule.days ?? [rule.day]).includes(d.getUTCDay())) return false;
  if (rule.kind === "weekly") return true;
  const { nth, isLast } = nthWeekdayIndex(d);
  return rule.nth === -1 ? isLast : nth === rule.nth;
}
function occursOnDay(rule, day) {
  const key = startOfDay(day).toISOString().slice(0, 10);
  if (rule.reschedules && Object.hasOwn(rule.reschedules, key)) return false;
  if (rule.reschedules && Object.values(rule.reschedules).includes(key)) return true;
  return baseOccursOnDay(rule, day);
}

// next/src/lib/event-standing-authority.mjs
var EVENT_AUTHORITY = Object.freeze({
  id: "pi-routine-events-2026-11-01",
  by: "James",
  at: "2026-11-01T10:13:33.000Z",
  scope: "verified-routine-pi-website-events",
  source: "Sentinel_d25f9be50a808191af4932dd34f3ee8f"
});
var EVENT_PUBLISHER = "PI routine event publisher";
function validEventAuthority(value, now = /* @__PURE__ */ new Date()) {
  return Boolean(value && Object.entries(EVENT_AUTHORITY).every(([key, expected]) => value[key] === expected) && Number.isFinite(+new Date(now)) && +new Date(now) >= Date.parse(EVENT_AUTHORITY.at));
}

// next/src/lib/event-publication.mjs
var approvedFields = "slug eventId contentKind title summary description category subcategory startDate endDate nextOccurrence sourceUpdatedAt sourceReview retiredSourceLinks startTime endTime endsNextDay timezone venue venueName place venueRegion suburb streetAddress coordinates indoorOutdoor bookingUrl ticketingUrl officialEventUrl primarySourceUrl secondarySourceUrl bookingRequired bookingStatus bookingStatusNote bookingStatusSourceUrl bookingStatusCheckedAt freePaid priceTier recurrence recurrenceNote occurrencePolicy dateBasis occurrenceExceptions seriesOccurrences verifiedPrice suitableFor audienceTags familyFriendly petFriendly accessibilityNotes weather weatherDependency weatherShape organiser verification verificationStatus verificationNote lastVerifiedAt lastCheckedDate visitorAppealScore editorialPriority nearbyAttractions suggestedItineraryPairing nearestVenues worthTheDrive firstTimer skipThis skipReason skipInstead editorVerdict whyWeCare standoutOfMonth pairingProse editorVisited featuredInDispatch relatedArticles lens editorNote heroImage cancelled cancelledOn cancellationNote cancellationSourceUrl cancellationSourceLabel postponed postponedOn postponedFrom rescheduledTo postponementNote postponementSourceUrl postponementSourceLabel expiresAt".split(" ");
var approvalDefaults = { timezone: "Australia/Melbourne", bookingStatus: "unknown", recurrence: "one-off", occurrenceExceptions: [], audienceTags: [], weather: "mixed", nearestVenues: [], worthTheDrive: false, firstTimer: false, skipThis: false, standoutOfMonth: false, editorVisited: false, relatedArticles: [], lens: [], cancelled: false, postponed: false };
var dayFields = /* @__PURE__ */ new Set(["startDate", "endDate", "nextOccurrence", "postponedFrom", "rescheduledTo"]);
var instantFields = /* @__PURE__ */ new Set(["sourceUpdatedAt", "checkedAt", "coordinateCheckedAt", "validUntil", "lastVerifiedAt", "lastCheckedDate", "bookingStatusCheckedAt", "cancelledOn", "postponedOn", "expiresAt"]);
function approvedValue(value, key = "") {
  if (value == null) return value;
  if (dayFields.has(key) || instantFields.has(key)) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return String(value);
    return dayFields.has(key) ? date.toISOString().slice(0, 10) : date.toISOString();
  }
  if (["place", "venue"].includes(key)) return typeof value === "string" ? value : value.id;
  if (Array.isArray(value)) return value.map((item) => approvedValue(item));
  if (typeof value === "object") return Object.fromEntries(Object.keys(value).sort().filter((k) => value[k] !== void 0).map((k) => [k, approvedValue(value[k], k)]));
  return value;
}
function approvedEventContent(data) {
  const content = {};
  for (const key of approvedFields) {
    const value = data?.[key] ?? approvalDefaults[key];
    if (value !== void 0) content[key] = approvedValue(value, key);
  }
  if (data?.intelligence?.geography) content.geography = approvedValue(data.intelligence.geography);
  return JSON.stringify(content);
}
function hasRoutineAuthority(data, now) {
  const receipt = data.intelligence, checked = +new Date(receipt.reviewedAt), instant2 = +new Date(now);
  return receipt.approvedBy === EVENT_PUBLISHER && validEventAuthority(receipt.standingAuthority, now) && data.contentKind === "event" && !data.sponsored && !data.heroImage && receipt.geography?.shireConfirmed === true && receipt.factScore === 100 && checked >= Date.parse(receipt.standingAuthority.at) && instant2 - checked < 864e5 && Number.isFinite(+new Date(data.expiresAt)) && instant2 < +new Date(data.expiresAt);
}
function eventContentKind(data) {
  if (["event", "experience", "offer"].includes(data?.contentKind)) return data.contentKind;
  return data?.dateBasis && data.dateBasis !== "fixed" ? "experience" : "event";
}
function isPublicEventRecord(data, now = /* @__PURE__ */ new Date()) {
  const publishedArchive = data?.status === "archived" && data?.publishedAt != null && Number.isFinite(new Date(data.publishedAt).getTime()) && new Date(data.publishedAt) <= new Date(now);
  if (!["published", "expired", "past"].includes(data?.status) && !publishedArchive) return false;
  if (!data.intelligence) return true;
  if (data.reviewHold || data.factualReviewHold || data.reviewStatus && data.reviewStatus !== "published" || data.sourceReview?.required === true) return false;
  const receipt = data.intelligence;
  return Boolean(typeof receipt.approvedContent === "string" && receipt.approvedContent === approvedEventContent(data) && receipt.revision && (receipt.approvedBy === "James" || hasRoutineAuthority(data, now)) && receipt.approvedAt != null && receipt.reviewedAt != null && Number.isFinite(new Date(receipt.approvedAt).getTime()) && Number.isFinite(new Date(receipt.reviewedAt).getTime()) && new Date(receipt.approvedAt) <= new Date(now) && new Date(receipt.reviewedAt) <= new Date(now) && Number.isFinite(receipt.factScore) && receipt.factScore >= 90 && Array.isArray(receipt.evidenceIds) && receipt.evidenceIds.length);
}

// next/src/lib/intelligence-series.mjs
function hasExplicitSeries(data) {
  return (!!data?.intelligence || data?.occurrencePolicy === "confirmed-only") && Array.isArray(data?.seriesOccurrences) && data.seriesOccurrences.length > 0;
}
function hasLegacyExceptions(data) {
  return !hasExplicitSeries(data) && Array.isArray((data?._seriesBase ?? data)?.occurrenceExceptions) && (data._seriesBase ?? data).occurrenceExceptions.length > 0;
}
function legacyRule(data, now) {
  const dated = { ...data };
  for (const key of ["startDate", "endDate", "nextOccurrence"]) if (dated[key]) dated[key] = new Date(dated[key]);
  return ruleFor({ data: dated }, now);
}
function legacyData(data, day, now) {
  const base = data._seriesBase ?? data, rule = legacyRule(base, now);
  if (!rule) return null;
  if (rule.kind === "range" && rule.start < rule.end) return base;
  const pairs = Object.entries(rule.reschedules ?? {});
  const original = pairs.find(([, effective2]) => effective2 === day)?.[0] ?? day;
  const effective = rule.reschedules?.[original] ?? day;
  if (!occursOnDay(rule, new Date(effective))) return null;
  const matches = base.occurrenceExceptions.filter((e) => e.date === original);
  const exception = matches.length === 1 ? matches[0] : null;
  const ambiguous = matches.length > 1;
  const moved = exception?.status === "moved" || exception?.venueName !== void 0 && exception.venueName !== base.venueName;
  const changedDate = ["rescheduled", "postponed"].includes(exception?.status);
  const rescheduled = changedDate && rule.reschedules?.[original] === effective;
  const value = {
    ...base,
    _seriesBase: base,
    _occurrenceOriginalDate: original,
    _occurrenceEffectiveDate: effective,
    _occurrencePreviousStartDate: rescheduled ? base.startTime ? original + "T" + base.startTime + ":00" + isoOffsetFor(occurrenceBounds(base, original).startsAt) : original : void 0,
    startDate: new Date(effective),
    endDate: new Date(effective),
    nextOccurrence: new Date(effective),
    occurrenceExceptions: [],
    startTime: exception?.startTime ?? base.startTime,
    // A changed start without a new finish does not confirm the old end clock.
    endTime: exception?.endTime ?? (exception?.startTime && exception.startTime !== base.startTime ? void 0 : base.endTime),
    venueName: moved ? exception?.venueName : base.venueName,
    cancelled: isCancelledRecord(base) || exception?.status === "cancelled",
    postponed: base.postponed === true || changedDate || ambiguous || moved && !exception?.venueName,
    rescheduledTo: rescheduled ? effective : void 0,
    postponedFrom: rescheduled ? original : void 0,
    bookingStatus: exception?.status === "sold-out" ? "sold-out" : base.bookingStatus,
    officialEventUrl: exception?.sourceUrl ?? base.officialEventUrl
  };
  if (moved) for (const key of ["streetAddress", "suburb", "coordinates", "place", "venue"]) delete value[key];
  return value;
}
function occurrenceData(data, day, now = /* @__PURE__ */ new Date()) {
  if (!hasExplicitSeries(data)) return hasLegacyExceptions(data) ? legacyData(data, day, now) : data;
  const session = data.seriesOccurrences.find((s) => s.date === day);
  if (!session) return null;
  const baseData = data._seriesBase ?? data;
  const moved = session.venueName !== baseData.venueName;
  const value = { ...baseData, _seriesBase: baseData, startDate: new Date(session.date), endDate: new Date(session.date), nextOccurrence: new Date(session.date), startTime: session.startTime ?? void 0, endTime: session.endTime ?? void 0, venueName: session.venueName, occurrenceExceptions: [], cancelled: baseData.cancelled === true || session.status === "cancelled", postponed: baseData.postponed === true || ["postponed", "rescheduled"].includes(session.status), rescheduledTo: session.status === "rescheduled" ? session.date : void 0, postponedFrom: session.status === "rescheduled" ? session.originalDate : void 0, bookingStatus: session.status === "sold-out" ? "sold-out" : baseData.bookingStatus, officialEventUrl: session.sourceUrl ?? baseData.officialEventUrl };
  if (moved) for (const key of ["streetAddress", "suburb", "coordinates", "place", "venue"]) delete value[key];
  return value;
}
function explicitOccurrence(data, day, now = /* @__PURE__ */ new Date()) {
  const actual = occurrenceData(data, day);
  if (!actual) return null;
  const result = resolveOccurrence(actual, day, now);
  const session = data.seriesOccurrences.find((s) => s.date === day);
  const base = recordDisposition(data._seriesBase ?? data, now);
  const safe = base.status === "scheduled" && !base.unverified && !base.expired;
  const phase = (
    /** @type {'upcoming'|'running'|'past'} */
    result.phase
  );
  return { ...result, phase, note: session?.note ?? result.note, bookable: safe && (session?.status === "rescheduled" ? result.phase !== "past" && !result.soldOut && !recordDisposition(actual, now).expired : result.bookable), data: actual, session, label: session?.status === "rescheduled" ? "Rescheduled from " + session.originalDate : session?.status === "moved" ? "Moved to " + session.venueName : result.label };
}
function legacyOccurrence(data, day, now = /* @__PURE__ */ new Date()) {
  const actual = occurrenceData(data, day, now);
  if (!actual) return null;
  const effective = actual._occurrenceEffectiveDate ?? day, result = resolveOccurrence(actual, effective, now);
  const phase = (
    /** @type {'upcoming'|'running'|'past'} */
    result.phase
  );
  const base = recordDisposition(data._seriesBase ?? data, now);
  const safe = base.status === "scheduled" && !base.unverified && !base.expired;
  const exception = (data._seriesBase ?? data).occurrenceExceptions?.find((e) => e.date === actual._occurrenceOriginalDate);
  return {
    ...result,
    phase,
    data: actual,
    note: exception?.note ?? result.note,
    sourceUrl: exception?.sourceUrl ?? result.sourceUrl,
    bookable: safe && (result.status === "rescheduled" ? result.phase !== "past" && !result.soldOut : result.bookable),
    label: result.status === "rescheduled" ? "Rescheduled from " + actual._occurrenceOriginalDate : exception?.status === "moved" ? actual.venueName ? "Moved to " + actual.venueName : "Venue to be confirmed" : result.label
  };
}

// next/src/lib/whatson-listing.mjs
function resolveListingOccurrence(data, rule, dayIso, now = /* @__PURE__ */ new Date()) {
  if (hasExplicitSeries(data)) return explicitOccurrence(data, dayIso, now) ?? { phase: (
    /** @type {'upcoming'|'running'|'past'} */
    "past"
  ), bookable: false, status: "cancelled", label: "No scheduled session", data: null };
  if (hasLegacyExceptions(data) && rule.kind !== "range") return legacyOccurrence(data, dayIso, now) ?? { phase: (
    /** @type {'upcoming'|'running'|'past'} */
    "past"
  ), bookable: false, status: "postponed", label: "No confirmed session", data: null };
  const iso = (date) => date.toISOString().slice(0, 10);
  const occurrence = resolveOccurrence(
    data,
    rule.kind === "range" ? iso(rule.start) : dayIso,
    now,
    rule.kind === "range" ? { endDayIso: iso(rule.end) } : {}
  );
  const phase = (
    /** @type {'upcoming' | 'running' | 'past'} */
    occurrence.phase
  );
  return { ...occurrence, phase, data: null };
}

// next/src/lib/event-discovery.mjs
var SHIRE_PLACES = new Set("arthurs-seat balnarring balnarring-beach bittern blairgowrie boneo cape-schanck capel-sound crib-point dromana fingal flinders hastings main-ridge mccrae merricks merricks-beach merricks-north moorooduc mornington mount-eliza mount-martha point-leo point-nepean portsea red-hill red-hill-south rosebud rye safety-beach shoreham somers sorrento st-andrews-beach stony-point tootgarook tuerong tyabb".split(" "));
var ref = (value) => typeof value === "string" ? value : value?.id ?? "";
var identity = (value) => String(ref(value)).trim().toLowerCase().replace(/[.'’]/g, "").replace(/\s+/g, "-");
function reviewedGeography(data, now) {
  const geo = data?.intelligence?.geography;
  const checked = Date.parse(geo?.checkedAt);
  return geo?.shireConfirmed === true && geo.verifiedBy === "James" && typeof geo.evidenceId === "string" && geo.evidenceId.trim() && Number.isFinite(checked) && checked <= now.getTime() && now.getTime() - checked < 7 * 864e5;
}
function hasPromotionGeography(data, now = /* @__PURE__ */ new Date()) {
  const places = [identity(data?.place), identity(data?.suburb)].filter(Boolean);
  if (places.some((place) => !SHIRE_PLACES.has(place) && place !== "pearcedale")) return false;
  if (data?.intelligence) return Boolean(reviewedGeography(data, now));
  return places.length > 0 && places.every((place) => SHIRE_PLACES.has(place));
}
function selectEventPromotions(entries, { now = /* @__PURE__ */ new Date(), windowDays = 30, windowStart, placeId, venueId, limit = Infinity } = {}) {
  now = new Date(now);
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(windowDays) || windowDays < 1 || windowDays > 366 || !(limit > 0)) return [];
  if (windowStart && !Number.isFinite(new Date(windowStart).getTime())) return [];
  const today = startOfDay(now), start = windowStart ? startOfDay(new Date(windowStart)) : today;
  if (!Number.isFinite(start.getTime())) return [];
  const end = addDays(start, windowDays - 1), output = [], used = /* @__PURE__ */ new Set();
  for (const supplied of entries ?? []) {
    const originalEvent = supplied?.data?._promotionOriginal ?? supplied;
    const data = originalEvent?.data;
    if (!data || data.status !== "published" || !data.title || !isPublicEventRecord(data, now) || !hasPromotionGeography(data, now)) continue;
    const disposition = recordDisposition(data, now);
    if (!disposition.promotable) continue;
    const datedData = { ...data };
    for (const key of ["startDate", "endDate", "nextOccurrence"]) if (datedData[key]) datedData[key] = new Date(datedData[key]);
    if (["startDate", "endDate", "nextOccurrence"].some((key) => datedData[key] && !Number.isFinite(datedData[key].getTime()))) continue;
    const rule = ruleFor({ ...originalEvent, data: datedData }, now);
    if (!rule) continue;
    const slug = String(data.slug ?? originalEvent.slug ?? originalEvent.id ?? "");
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || used.has(slug)) continue;
    const firstDay = start < today ? today : start;
    for (let date = addDays(firstDay, -1); date <= end; date = addDays(date, 1)) {
      if (!occursOnDay(rule, date)) continue;
      const day = isoDate(date), occurrence = resolveListingOccurrence(data, rule, day, now);
      if (!occurrence?.bookable || occurrence.phase === "past") continue;
      if (date < firstDay && (occurrence.phase !== "running" || !occurrence.crossesMidnight || rule.kind === "range" && isoDate(rule.start) !== isoDate(rule.end) && occursOnDay(rule, firstDay) || isoDate(occurrence.endsAt) < isoDate(start))) continue;
      const effective = occurrence.data ?? data;
      if (effective.venueName !== data.venueName || !hasPromotionGeography(effective, now)) continue;
      const exception = data.occurrenceExceptions?.find((item) => item.date === day);
      if (exception?.venueName && exception.venueName !== data.venueName) continue;
      if (placeId && ![identity(effective.place), identity(effective.suburb)].includes(identity(placeId))) continue;
      if (venueId && ref(effective.venue) !== ref(venueId)) continue;
      const kind = eventContentKind(effective);
      const event = { ...originalEvent, data: { ...effective, _promotionDay: day, _promotionOriginal: originalEvent } };
      const prefix = kind === "offer" ? "Offer valid" : kind === "experience" ? "Experience session" : "";
      const dateLabel = `${prefix ? prefix + " \xB7 " : ""}${date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}`;
      output.push({ event, originalEvent, day, dateLabel, kind, href: `/whats-on/${slug}/`, slug, occurrence, rule });
      used.add(slug);
      break;
    }
    if (output.length >= limit) break;
  }
  return output;
}

// next/src/lib/season.ts
var PENINSULA_TZ2 = "Australia/Melbourne";
function melbourneCalendarParts(date = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: PENINSULA_TZ2,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(date);
  const num = (t) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const monthName = new Intl.DateTimeFormat("en-AU", {
    timeZone: PENINSULA_TZ2,
    month: "long"
  }).format(date);
  return { year: num("year"), month: num("month"), day: num("day"), monthName };
}
function getAustralianSeason(date = /* @__PURE__ */ new Date()) {
  const { month } = melbourneCalendarParts(date);
  if (month >= 3 && month <= 5) return "Autumn";
  if (month >= 6 && month <= 8) return "Winter";
  if (month >= 9 && month <= 11) return "Spring";
  return "Summer";
}
function getAustralianSeasonLower(date = /* @__PURE__ */ new Date()) {
  return getAustralianSeason(date).toLowerCase();
}

// ops/lib/concierge-event-grounding.mjs
var months = "january february march april may june july august september october november december".split(" ");
function resolveMonthPlace(query, now = /* @__PURE__ */ new Date()) {
  const q = String(query).toLowerCase().replaceAll("\u2019", "'").trim().replace(/[?.!]$/, "");
  const match = q.match(/^(?:what'?s on|events)(?: in)? ([a-z][a-z -]*?) (?:in )?(january|february|march|april|may|june|july|august|september|october|november|december)(?: (20\d{2}))?$/);
  if (!match || !Number.isFinite(+new Date(now))) return null;
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit" }).formatToParts(new Date(now));
  const currentYear = Number(local.find((p) => p.type === "year").value), currentMonth = Number(local.find((p) => p.type === "month").value);
  const month = months.indexOf(match[2]) + 1, year = match[3] ? Number(match[3]) : currentYear + (month < currentMonth ? 1 : 0);
  const start = `${year}-${String(month).padStart(2, "0")}-01`, end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { place: match[1].trim().replace(/\s+/g, "-"), start, end, yearBasis: match[3] ? "explicit" : "next-occurrence-of-month", timezone: "Australia/Melbourne", resolved: true };
}
function groundEventRecords(records, context, now = /* @__PURE__ */ new Date()) {
  now = new Date(now);
  if (!context || !context.resolved) return { disposition: "clarify", matches: [], season: null };
  const days = (Date.parse(context.end) - Date.parse(context.start)) / 864e5 + 1;
  if (context.timezone !== "Australia/Melbourne" || !Number.isInteger(days) || days < 1 || days > 366 || !context.place || !Number.isFinite(+now)) throw Error("invalid-event-context");
  const eligible = records.filter((r) => r.verifiedAt && Number.isFinite(Date.parse(r.verifiedAt)) && Date.parse(r.verifiedAt) <= +now && (!r.validUntil || Date.parse(r.validUntil) > +now) && eventContentKind(r.data) === "event");
  const selected = selectEventPromotions(eligible, { now, windowStart: /* @__PURE__ */ new Date(context.start + "T00:00:00Z"), windowDays: days, placeId: context.place });
  const matches = selected.map((hit) => ({ id: hit.originalEvent.id, revision: hit.originalEvent.revision, title: hit.event.data.title, occurrence: hit.day, href: hit.href, place: context.place, startsAt: hit.occurrence.startsAt.toISOString(), endsAt: hit.occurrence.endsAt.toISOString() }));
  return { disposition: matches.length ? "answer" : "abstain", matches, season: getAustralianSeasonLower(/* @__PURE__ */ new Date(context.start + "T12:00:00Z")) };
}
function eventAnswer(records, query, now = /* @__PURE__ */ new Date()) {
  const context = resolveMonthPlace(query, now), result = groundEventRecords(records, context, now);
  if (!context) return { answer: "Which town and month should I check? Please include the year if you mean a particular year.", recommendations: [], follow_on: [], provenance_footer: "A date and exact locality are needed to match published event occurrences.", disposition: "clarify" };
  const label = `${context.place.replaceAll("-", " ")} from ${context.start} to ${context.end}`;
  const escape = (text) => String(text).replace(/[\\\[\]()*_`<>]/g, "");
  const answer = result.matches.length ? `Published events for ${label}:

${result.matches.map((m) => `- ${escape(m.title)} \u2014 ${m.occurrence}. https://peninsulainsider.com.au${m.href}`).join("\n")}

Check the event page with the operator before booking.` : `I couldn't verify a matching published event for ${label}.`;
  return { answer, recommendations: [], follow_on: [], disposition: result.disposition, provenance_footer: `${result.season[0].toUpperCase() + result.season.slice(1)} in Victoria. ${context.yearBasis === "explicit" ? "Year supplied." : `Interpreted the month as ${context.start.slice(0, 4)}.`} Dates and locality are checked separately from live ticket availability.`, matches: result.matches };
}
export {
  eventAnswer,
  groundEventRecords,
  readPrepared,
  resolveMonthPlace
};
