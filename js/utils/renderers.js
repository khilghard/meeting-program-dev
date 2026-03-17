import { t, getLanguage } from "../i18n/index.js";
import { translateHonorifics } from "../i18n/honorifics.js";
import { isSafeUrl } from "../sanitize.js";
import { getChildrenSongData, getChildrenSongUrl, getHymnData } from "../data/hymnsLookup.js";

// Helper: Render a role with translated name (speaker, prayer, etc.)
function renderHonorificRole(name, labelKey, className) {
  const translatedName = translateHonorifics(name, getLanguage());
  appendRow(t(labelKey), translatedName, className);
}

function renderSpeaker(name) {
  renderHonorificRole(name, "speaker", "speaker");
}

function renderIntermediateHymn(name) {
  appendRowHymn(t("intermediateHymn"), name, "intermediateHymn");
}

function renderOpeningHymn(name) {
  appendRowHymn(t("openingHymn"), name, "openingHymn");
}

function renderClosingHymn(name) {
  appendRowHymn(t("closingHymn"), name, "closingHymn");
}

function renderHymn(name) {
  appendRowHymn(t("hymn"), name, "hymn");
}

function renderSacramentHymn(name) {
  appendRowHymn(t("sacramentHymn"), name, "sacramentHymn");
}

function renderOpeningPrayer(name) {
  renderHonorificRole(name, "openingPrayer", "openingPrayer");
}

function renderClosingPrayer(name) {
  renderHonorificRole(name, "closingPrayer", "closingPrayer");
}

function renderPresiding(name) {
  renderHonorificRole(name, "presiding", "presiding");
}

function renderConducting(name) {
  renderHonorificRole(name, "conducting", "conducting");
}

function renderMusicDirector(name) {
  renderHonorificRole(name, "musicDirector", "musicDirector");
}

function renderOrganist(name) {
  renderHonorificRole(name, "organist", "musicOrganist");
}

function renderLeader(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");

  const leaderSplit = splitLeadership(value);

  const row = document.createElement("div");
  row.className = "leader-of-dots hymn-row";

  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = leaderSplit.name;

  const dotsSpan = document.createElement("span");
  dotsSpan.className = "dots";

  const valueSpan = document.createElement("span");
  valueSpan.className = "value-on-right";
  valueSpan.textContent = leaderSplit.position;

  row.appendChild(labelSpan);
  row.appendChild(dotsSpan);
  row.appendChild(valueSpan);

  const phoneDiv = document.createElement("div");
  phoneDiv.className = "hymn-title";
  phoneDiv.textContent = leaderSplit.phone;

  div.appendChild(row);
  div.appendChild(phoneDiv);

  container.appendChild(div);
}

function renderGeneralStatementWithLink(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");

  const [textPart, urlPart] = value.split("|").map((s) => s.trim());
  if (!textPart || !urlPart) return;

  const safeUrl = urlPart.startsWith("http") ? urlPart : `https://${urlPart}`;
  if (!isSafeUrl(safeUrl)) return;

  const wrapper = document.createElement("div");
  wrapper.className = "general-statement";

  // Split around <LINK> placeholder
  const parts = textPart.split("<LINK>");
  // text before link
  if (parts[0]) {
    wrapper.appendChild(document.createTextNode(parts[0]));
  }

  // link itself
  const link = document.createElement("a");
  link.href = safeUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "general-link";
  link.textContent = urlPart;
  wrapper.appendChild(link);

  // text after link
  if (parts[1]) {
    wrapper.appendChild(document.createTextNode(parts[1]));
  }

  div.appendChild(wrapper);
  container.appendChild(div);
}

function renderGeneralStatement(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.className = "general-statement";
  div.textContent = value;
  container.appendChild(div);
}

function renderLink(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.className = "link-center";

  const [text, url] = value.split("|").map((s) => s.trim());
  if (!text || !url) return;

  const safeUrl = url.startsWith("http") ? url : `https://${url}`;
  if (!isSafeUrl(safeUrl)) return;

  const a = document.createElement("a");
  a.href = safeUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;

  div.appendChild(a);
  container.appendChild(div);
}

function renderLinkWithSpace(value) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.className = "link-with-space";

  const [textRaw, urlRaw, imgLinkRaw] = value.split("|").map((s) => s.trim());
  if (!textRaw || !urlRaw) return;

  const safeUrl = urlRaw.startsWith("http") ? urlRaw : `https://${urlRaw}`;
  if (!isSafeUrl(safeUrl)) return;

  const text = textRaw.replace("<IMG>", "").trim();

  const inner = document.createElement("div");
  inner.className = "link-with-space-inner";

  if (imgLinkRaw?.toUpperCase() !== "NONE" && isSafeUrl(imgLinkRaw)) {
    const img = document.createElement("img");
    img.src = imgLinkRaw;
    img.className = "link-icon";
    img.setAttribute("role", "presentation");
    inner.appendChild(img);
  }

  const a = document.createElement("a");
  a.href = safeUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;

  inner.appendChild(a);
  div.appendChild(inner);
  container.appendChild(div);
}

function appendRow(label, value, id) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.id = id;

  const row = document.createElement("div");
  row.className = "leader-of-dots";

  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = label;

  const dotsSpan = document.createElement("span");
  dotsSpan.className = "dots";

  const valueSpan = document.createElement("span");
  valueSpan.className = "value-on-right";
  valueSpan.textContent = value;

  row.appendChild(labelSpan);
  row.appendChild(dotsSpan);
  row.appendChild(valueSpan);

  div.appendChild(row);
  container.appendChild(div);
}

function appendRowHymn(label, value, id) {
  const container = document.getElementById("main-program");
  const div = document.createElement("div");
  div.id = id;

  const { number, title, isChildrensSong, customText } = splitHymn(value);

  // Get URL and potentially correct title from lookup
  let hymnUrl = null;
  let displayTitle = title;

  if (isChildrensSong) {
    const lookupData = getChildrenSongData(number);
    if (lookupData) {
      hymnUrl = lookupData.url;
      displayTitle = lookupData.title;
    }
  } else {
    const hymnData = getHymnData(number);
    if (hymnData) {
      hymnUrl = hymnData.url;
      displayTitle = hymnData.title;
    } else {
      hymnUrl = getHymnUrl(number, isChildrensSong, title);
    }
  }

  const row = document.createElement("div");
  row.className = "leader-of-dots hymn-row";

  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = label;

  const dotsSpan = document.createElement("span");
  dotsSpan.className = "dots";

  const valueSpan = document.createElement("span");
  valueSpan.className = "value-on-right";
  valueSpan.textContent = number.includes("#") ? number.replace("#", "🎵 ") : `🎵 ${number}`;

  row.appendChild(labelSpan);
  row.appendChild(dotsSpan);
  row.appendChild(valueSpan);

  const titleDiv = document.createElement("div");
  titleDiv.className = "hymn-title";

  if (hymnUrl) {
    const link = document.createElement("a");
    link.href = hymnUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "hymn-link";
    link.textContent = displayTitle;
    titleDiv.appendChild(link);
  } else {
    titleDiv.textContent = displayTitle;
  }

  div.appendChild(row);
  div.appendChild(titleDiv);

  // Add custom text line if provided
  if (customText) {
    const customTextDiv = document.createElement("div");
    customTextDiv.className = "hymn-title";
    customTextDiv.textContent = customText;
    div.appendChild(customTextDiv);
  }

  container.appendChild(div);
}

function getHymnUrl(number, isChildrensSong, title) {
  if (!number) return null;

  const cleanNumber = number.replace("#", "");

  if (isChildrensSong) {
    // Use lookup table for accurate URL
    const url = getChildrenSongUrl(cleanNumber);
    if (url) return url;

    // Fallback to title-based slug if not found in lookup
    const slug = title
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s-]/g, "")
      .replaceAll(/\s+/g, "-")
      .replaceAll(/-+/g, "-")
      .replaceAll(/^-+|-+$/g, "")
      .trim();
    return slug ? `https://www.churchofjesuschrist.org/media/music/songs/${slug}?lang=eng` : null;
  }

  // Use lookup table for regular hymns
  const hymnData = getHymnData(cleanNumber);
  if (hymnData) return hymnData.url;

  // Fallback to collection page if not found in lookup
  return `https://www.churchofjesuschrist.org/media/music/collections/hymns?lang=eng`;
}

function splitHymn(value) {
  // Split on first pipe to separate hymn name from custom text
  const parts = value.split("|");
  const hymnPart = parts[0].trim();
  const customText = parts.length > 1 ? parts.slice(1).join("|").trim() : "";

  const csMatch = hymnPart.match(/^#?CS\s*(\d+[a-z]?)\s*(.*)$/i);
  if (csMatch) {
    return { number: `CS ${csMatch[1]}`, title: csMatch[2], isChildrensSong: true, customText };
  }

  const match = hymnPart.match(/^(#?(\d+[a-z]?))\s*(.*)$/);
  if (!match) return { number: "", title: hymnPart, isChildrensSong: false, customText };
  return { number: match[1], title: match[3], isChildrensSong: false, customText };
}

function splitLeadership(value) {
  const parts = value.split("|").map((p) => p.trim());
  return {
    name: parts[0] || "",
    phone: parts[1] || "",
    position: parts[2] || ""
  };
}

function renderUnitName(name) {
  document.getElementById("unitname").textContent = name;
}

function renderUnitAddress(name) {
  document.getElementById("unitaddress").textContent = name;
}

function renderDate(name) {
  document.getElementById("date").textContent = name;
}

function renderLineBreak(value) {
  const container = document.getElementById("main-program");
  const hr = document.createElement("hr");
  hr.className = "hr-text";
  if (value) {
    hr.dataset.content = value;
  }
  container.appendChild(hr);
}

function normalizeRenderableKey(rawKey) {
  const key = (rawKey || "").trim().replace(/^\uFEFF/, "");

  if (/^speaker\d+$/i.test(key)) {
    return "speaker";
  }

  if (/^intermediatehymn\d+$/i.test(key)) {
    return "intermediateHymn";
  }

  return key;
}

const renderers = {
  unitName: renderUnitName,
  unitAddress: renderUnitAddress,
  date: renderDate,
  presiding: renderPresiding,
  conducting: renderConducting,
  hymn: renderHymn,
  openingHymn: renderOpeningHymn,
  openingPrayer: renderOpeningPrayer,
  sacramentHymn: renderSacramentHymn,
  speaker: renderSpeaker,
  intermediateHymn: renderIntermediateHymn,
  closingHymn: renderClosingHymn,
  closingPrayer: renderClosingPrayer,
  musicDirector: renderMusicDirector,
  musicOrganist: renderOrganist,
  horizontalLine: renderLineBreak,
  leader: renderLeader,
  generalStatementWithLink: renderGeneralStatementWithLink,
  generalStatement: renderGeneralStatement,
  link: renderLink,
  linkWithSpace: renderLinkWithSpace
};

export {
  renderers,
  renderProgram,
  renderUnitName,
  renderUnitAddress,
  renderDate,
  renderLineBreak,
  splitHymn,
  splitLeadership,
  appendRow,
  appendRowHymn,
  renderSpeaker,
  renderLeader,
  renderGeneralStatementWithLink,
  renderGeneralStatement,
  renderLink,
  renderLinkWithSpace
};

function renderProgram(rows) {
  let speakerLikeInputCount = 0;
  let renderedSpeakerCount = 0;

  rows.forEach(({ key, value }) => {
    const normalizedKey = normalizeRenderableKey(key);
    const isHorizontalLine = normalizedKey.toLowerCase() === "horizontalline";
    const isEmpty = !value || value.trim() === "";

    if (/^speaker\d*$/i.test((key || "").trim()) && !isEmpty) {
      speakerLikeInputCount++;
    }

    if (isEmpty && !isHorizontalLine) return;

    const renderer = renderers[normalizedKey];
    if (renderer) {
      renderer(value || "");
      if (normalizedKey === "speaker") {
        renderedSpeakerCount++;
      }
      return;
    }

    if (/^speaker/i.test((key || "").trim())) {
      console.warn(
        `[renderProgram] Unmapped speaker key: "${key}" (normalized: "${normalizedKey}")`
      );
    }
  });

  if (speakerLikeInputCount > 0 && renderedSpeakerCount === 0) {
    console.warn(
      `[renderProgram] Speaker rows detected (${speakerLikeInputCount}) but none were rendered.`
    );
  }

  const alternateVersion = document.getElementById("the-version");
  if (alternateVersion) {
    alternateVersion.classList.remove("hidden");
  }
}
