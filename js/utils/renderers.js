import { t, getLanguage } from "../i18n/index.js";
import { translateHonorifics } from "../i18n/honorifics.js";
import { isSafeUrl } from "../sanitize.js";

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

  const { number, title, isChildrensSong } = splitHymn(value);
  const hymnUrl = getHymnUrl(number, isChildrensSong, title);

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
    link.textContent = title;
    titleDiv.appendChild(link);
  } else {
    titleDiv.textContent = title;
  }

  div.appendChild(row);
  div.appendChild(titleDiv);

  container.appendChild(div);
}

function getHymnUrl(number, isChildrensSong, title) {
  if (!number) return null;

  const cleanNumber = number.replace("#", "");

  if (isChildrensSong) {
    const slug = title
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s-]/g, "")
      .replaceAll(/\s+/g, "-")
      .replaceAll(/-+/g, "-")
      .trim();
    return slug ? `https://www.churchofjesuschrist.org/music/library/children/${slug}` : null;
  }

  return `https://www.churchofjesuschrist.org/music/library/hymns/${cleanNumber}`;
}

function splitHymn(value) {
  const csMatch = value.match(/^CS\s*(\d+)\s*(.*)$/i);
  if (csMatch) {
    return { number: `CS ${csMatch[1]}`, title: csMatch[2], isChildrensSong: true };
  }

  const match = value.match(/^(#?\d+)\s*(.*)$/);
  if (!match) return { number: "", title: value, isChildrensSong: false };
  return { number: match[1], title: match[2], isChildrensSong: false };
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
  rows.forEach(({ key, value }) => {
    const isHorizontalLine = key.toLowerCase() === "horizontalline";
    const isEmpty = !value || value.trim() === "";

    if (isEmpty && !isHorizontalLine) return;

    const renderer = renderers[key];
    if (renderer) renderer(value || "");
  });

  const alternateVersion = document.getElementById("the-version");
  if (alternateVersion) {
    alternateVersion.classList.remove("hidden");
  }
}
