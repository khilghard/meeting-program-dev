import { parseFieldValue, normalizeCmsKeyType } from "../../js/components/CmsEditor.mjs";

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = "";
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { header: [], records: [] };
  }

  const header = rows[0];
  const records = rows.slice(1).map((r) => ({
    key: r[0] ?? "",
    en: r[1] ?? "",
    es: r[2] ?? "",
    fr: r[3] ?? "",
    swa: r[4] ?? ""
  }));

  return { header, records };
}

export function toCsv(header, records) {
  const lines = [header, ...records.map((r) => [r.key, r.en, r.es, r.fr, r.swa])]
    .map((cols) => cols.map(quoteCsv).join(","));
  return `${lines.join("\n")}\n`;
}

function quoteCsv(value) {
  const str = String(value ?? "").replaceAll('"', '""');
  return `"${str}"`;
}

export function toEditorRows(records) {
  return records.map((r) => ({ key: r.key, value: r.en ?? "" }));
}

export function fromEditorRows(baseRecords, editorRows) {
  const buckets = new Map();
  for (const record of baseRecords) {
    const arr = buckets.get(record.key) ?? [];
    arr.push({ ...record });
    buckets.set(record.key, arr);
  }

  const out = [];
  for (const row of editorRows) {
    if (row.key.startsWith("split:")) continue;

    const key = row.key;
    const templateList = buckets.get(key) ?? [];
    const next = templateList.length > 0
      ? templateList.shift()
      : { key, en: "", es: "", fr: "", swa: "" };

    const normalized = normalizeCmsKeyType(key);
    const localeValues = mapEditorValueToLocaleColumns(normalized, row.value);

    next.en = localeValues.en;
    if (localeValues.es !== undefined) next.es = localeValues.es;
    if (localeValues.fr !== undefined) next.fr = localeValues.fr;
    if (localeValues.swa !== undefined) next.swa = localeValues.swa;

    out.push(next);
  }

  return out;
}

function mapEditorValueToLocaleColumns(normalizedKey, value) {
  if (normalizedKey === "linkWithSpace") {
    const parsed = parseFieldValue(normalizedKey, value);
    return {
      en: buildImgTriplet(parsed.text, parsed.url, parsed.imageUrl),
      es: buildLocaleImgTripletOrUndefined(parsed.text_es, parsed.url_es, parsed.imageUrl_es),
      fr: buildLocaleImgTripletOrUndefined(parsed.text_fr, parsed.url_fr, parsed.imageUrl_fr),
      swa: buildLocaleImgTripletOrUndefined(parsed.text_swa, parsed.url_swa, parsed.imageUrl_swa)
    };
  }

  if (normalizedKey === "generalStatementWithLink") {
    const parsed = parseFieldValue(normalizedKey, value);
    return {
      en: buildLinkPair(parsed.text, parsed.url),
      es: buildLocaleLinkPairOrUndefined(parsed.text_es, parsed.url_es),
      fr: buildLocaleLinkPairOrUndefined(parsed.text_fr, parsed.url_fr),
      swa: buildLocaleLinkPairOrUndefined(parsed.text_swa, parsed.url_swa)
    };
  }

  if (USER_TRANSLATED_SINGLE.has(normalizedKey)) {
    const parsed = parseFieldValue(normalizedKey, value);
    return {
      en: parsed.text ?? "",
      es: parsed.text_es,
      fr: parsed.text_fr,
      swa: parsed.text_swa
    };
  }

  return { en: value };
}

const USER_TRANSLATED_SINGLE = new Set([
  "generalStatement",
  "horizontalLine",
  "sacramentLine",
  "lessonEQRS",
  "lessonSundaySchool",
  "lessonYouth",
  "lessonPrimary"
]);

function buildImgTriplet(text, url, imageUrl) {
  const t = String(text ?? "").trim();
  const u = String(url ?? "").trim();
  const i = String(imageUrl ?? "").trim();
  if (!t && !u && !i) return "";
  const textWithToken = t ? `<IMG> ${t}` : "";
  const parts = [textWithToken, u, i];
  while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts.join(" | ");
}

function buildLocaleImgTripletOrUndefined(text, url, imageUrl) {
  if (text === undefined && url === undefined && imageUrl === undefined) {
    return undefined;
  }
  return buildImgTriplet(text, url, imageUrl);
}

function buildLinkPair(text, url) {
  const t = String(text ?? "").trim();
  const u = String(url ?? "").trim();
  if (!t && !u) return "";
  const textWithToken = t ? `${t} <LINK>` : "";
  const parts = [textWithToken, u];
  while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts.join(" | ");
}

function buildLocaleLinkPairOrUndefined(text, url) {
  if (text === undefined && url === undefined) {
    return undefined;
  }
  return buildLinkPair(text, url);
}
