const EP = "https://data.europarl.europa.eu/api/v2";

const COMMITTEE_NAMES = {
  AFET: "Foreign Affairs",
  DROI: "Human Rights",
  SEDE: "Security and Defence",
  DEVE: "Development",
  INTA: "International Trade",
  BUDG: "Budgets",
  CONT: "Budgetary Control",
  ECON: "Economic and Monetary Affairs",
  FISC: "Tax Matters",
  EMPL: "Employment and Social Affairs",
  ENVI: "Environment, Climate and Food Safety",
  SANT: "Public Health",
  ITRE: "Industry, Research and Energy",
  IMCO: "Internal Market and Consumer Protection",
  TRAN: "Transport and Tourism",
  REGI: "Regional Development",
  AGRI: "Agriculture and Rural Development",
  PECH: "Fisheries",
  CULT: "Culture and Education",
  JURI: "Legal Affairs",
  LIBE: "Civil Liberties, Justice and Home Affairs",
  AFCO: "Constitutional Affairs",
  FEMM: "Women’s Rights and Gender Equality",
  PETI: "Petitions",
  HOUS: "Housing Crisis in the European Union"
};

const GROUP_NAMES = {
  PPE: "EPP",
  EPP: "EPP",
  SD: "S&D",
  "S&D": "S&D",
  RENEW: "Renew Europe",
  RE: "Renew Europe",
  VERTS_ALE: "Greens/EFA",
  GREENS_EFA: "Greens/EFA",
  ECR: "ECR",
  PFE: "Patriots for Europe",
  ESN: "Europe of Sovereign Nations",
  LEFT: "The Left",
  GUE_NGL: "The Left",
  NI: "Non-attached"
};

const PARTY_BY_MEP = {
  "Aodhán Ó Ríordáin": "Labour Party",
  "Barry Andrews": "Fianna Fáil",
  "Barry Cowen": "Fianna Fáil",
  "Billy Kelleher": "Fianna Fáil",
  "Ciarán Mullooly": "Independent Ireland",
  "Cynthia Ní Mhurchú": "Fianna Fáil",
  "Kathleen Funchion": "Sinn Féin",
  "Luke Ming Flanagan": "Independent",
  "Lynn Boylan": "Sinn Féin",
  "Maria Walsh": "Fine Gael",
  "Michael McNamara": "Independent",
  "Nina Carberry": "Fine Gael",
  "Regina Doherty": "Fine Gael",
  "Seán Kelly": "Fine Gael"
};

const PARTY_LOGOS = {
  "Fianna Fáil": "https://commons.wikimedia.org/wiki/Special:FilePath/Fianna%20F%C3%A1il%20logo%20(2024).svg",
  "Fine Gael": "https://commons.wikimedia.org/wiki/Special:FilePath/Fine%20Gael%20wordmark%202009.svg",
  "Sinn Féin": "https://commons.wikimedia.org/wiki/Special:FilePath/Sinn%20F%C3%A9in%20wordmark.svg",
  "Labour Party": "https://commons.wikimedia.org/wiki/Special:FilePath/The%20logo%20of%20Labour%20Party%20in%20Ireland%202021.svg",
  "Independent Ireland": "https://www.independentireland.ie/favicon.ico"
};

function text(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (!value.length) return "";
    const english = value.find(v => v && typeof v === "object" && (v.language === "en" || v.lang === "en" || v["@language"] === "en"));
    return text(english || value[0]);
  }
  if (typeof value === "object") {
    return text(
      value.en ??
      value["@value"] ??
      value.value ??
      value.label ??
      value["@id"] ??
      value.id
    );
  }
  return "";
}

function lastCode(value) {
  const s = text(value).trim();
  if (!s) return "";
  return s.split("/").filter(Boolean).pop() || s;
}

function arrayFrom(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.["@graph"])) return payload["@graph"];
  return [];
}

async function epJson(path) {
  const r = await fetch(`${EP}/${path}`, {
    headers: {
      Accept: "application/ld+json",
      "User-Agent": "MEP-Vote-Tracker/1.0"
    }
  });
  if (!r.ok) throw new Error(`EP request failed ${r.status}: ${path}`);
  return r.json();
}

function isIrish(raw) {
  const value = text(
    raw?.["api:country-of-representation"] ??
    raw?.country ??
    raw?.citizenship ??
    raw?.nationality
  ).toUpperCase();
  const code = lastCode(value).toUpperCase();
  return code === "IE" || code === "IRL" || value.includes("IRELAND");
}

function mepId(raw) {
  const rawId = text(raw?.identifier ?? raw?.notation_codictPersonId ?? raw?.["@id"] ?? raw?.id);
  return lastCode(rawId).replace(/^MEP-/, "").replace(/^person\//, "");
}

function mepName(raw) {
  const label = text(raw?.label);
  if (label) return label;
  return `${text(raw?.givenName ?? raw?.given_name)} ${text(raw?.familyName ?? raw?.family_name)}`.trim() || "Unknown MEP";
}

function isCurrentMembership(m) {
  const period = m?.memberDuring || {};
  const start = text(period.startDate);
  const end = text(period.endDate);
  const today = new Date().toISOString().slice(0, 10);
  return (!start || start <= today) && (!end || end >= today);
}

function roleLabel(role) {
  const code = lastCode(role).toUpperCase();
  if (code.includes("VICE") && code.includes("CHAIR")) return "Vice-Chair";
  if (code.includes("CHAIR")) return "Chair";
  if (code.includes("SUBSTITUTE")) return "Substitute";
  if (code.includes("MEMBER")) return "Member";
  return code ? code.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "";
}

function groupLabel(value) {
  const code = lastCode(value).toUpperCase().replaceAll("-", "_");
  return GROUP_NAMES[code] || lastCode(value).replaceAll("_", " ").replaceAll("-", " ");
}

function corporateBodyMeta(raw) {
  const id = lastCode(raw?.body_id ?? raw?.identifier ?? raw?.id ?? raw?.["@id"]);
  const notation = text(raw?.notation ?? raw?.["skos:notation"]);
  const label = text(raw?.label);
  const rawCode = notation || label || id;
  const code = lastCode(rawCode).toUpperCase();
  const fullName = text(
    raw?.prefLabel ??
    raw?.["skos:prefLabel"] ??
    raw?.altLabel ??
    raw?.["skos:altLabel"]
  );
  return {
    id,
    code,
    name: fullName || COMMITTEE_NAMES[code] || (/[A-Z]/.test(code) ? code : "Committee")
  };
}

function buildCorporateBodyDirectory(pages) {
  const directory = new Map();
  for (const raw of pages.flatMap(arrayFrom)) {
    const meta = corporateBodyMeta(raw);
    if (!meta.id && !meta.code) continue;
    if (meta.id) directory.set(meta.id.toUpperCase(), meta);
    if (meta.code) directory.set(meta.code.toUpperCase(), meta);
  }
  return directory;
}

function committeesFromDetail(raw, bodyDirectory) {
  const memberships = Array.isArray(raw?.hasMembership) ? raw.hasMembership : [];
  const found = [];
  for (const m of memberships) {
    if (!isCurrentMembership(m)) continue;
    const classification = lastCode(m?.membershipClassification).toUpperCase();
    if (!classification.startsWith("COMMITTEE_PARLIAMENTARY")) continue;
    const orgId = lastCode(m?.organization);
    if (!orgId) continue;
    const directoryEntry = bodyDirectory.get(orgId.toUpperCase());
    const directCode = orgId.toUpperCase();
    const code = directoryEntry?.code || (COMMITTEE_NAMES[directCode] ? directCode : "");
    const name = directoryEntry?.name || COMMITTEE_NAMES[directCode] || "Committee name unavailable";
    found.push({
      key: directoryEntry?.id || orgId,
      code,
      name,
      role: roleLabel(m?.role)
    });
  }
  const unique = new Map();
  for (const c of found) {
    const old = unique.get(c.key);
    if (!old || (old.role === "Member" && c.role !== "Member")) unique.set(c.key, c);
  }
  return [...unique.values()]
    .map(({ key, ...c }) => c)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normaliseParty(value, code = "") {
  const raw = `${value || ""} ${code || ""}`.toLowerCase();
  if (raw.includes("fianna") || /\bff\b/.test(raw)) return "Fianna Fáil";
  if (raw.includes("fine gael") || /\bfg\b/.test(raw)) return "Fine Gael";
  if (raw.includes("sinn") || /\bsf\b/.test(raw)) return "Sinn Féin";
  if (raw.includes("labour") || /\blab\b/.test(raw)) return "Labour Party";
  if (raw.includes("independent ireland")) return "Independent Ireland";
  if (raw.includes("independent") || raw.includes("non-attached")) return "Independent";
  return value || code || "";
}

function nationalPartyFromDetail(raw, bodyDirectory, name) {
  const memberships = Array.isArray(raw?.hasMembership) ? raw.hasMembership : [];
  for (const m of memberships) {
    if (!isCurrentMembership(m)) continue;
    const classification = lastCode(m?.membershipClassification).toUpperCase();
    if (classification !== "NATIONAL_POLITICAL_GROUP") continue;
    const orgId = lastCode(m?.organization);
    const meta = bodyDirectory.get(orgId.toUpperCase());
    const party = normaliseParty(meta?.name || "", meta?.code || orgId);
    if (party) return party;
  }
  return PARTY_BY_MEP[name] || "Independent";
}

export default async function handler(req, res) {
  try {
    const [mepPages, bodyPages] = await Promise.all([
      Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          epJson(`meps/show-current?format=application%2Fld%2Bjson&limit=100&offset=${i * 100}`)
        )
      ),
      Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          epJson(`corporate-bodies/show-current?format=application%2Fld%2Bjson&limit=100&offset=${i * 100}`)
        )
      )
    ]);

    const bodyDirectory = buildCorporateBodyDirectory(bodyPages);
    const roster = mepPages.flatMap(arrayFrom).filter(isIrish);

    const meps = await Promise.all(roster.map(async raw => {
      const id = mepId(raw);
      let detail = raw;
      if (id) {
        try {
          const d = await epJson(`meps/${encodeURIComponent(id)}?format=application%2Fld%2Bjson`);
          detail = arrayFrom(d)[0] || raw;
        } catch (e) {
          console.warn(`Could not load MEP detail ${id}`, e);
        }
      }

      const groupRaw =
        detail?.["api:political-group"] ??
        detail?.politicalGroup ??
        detail?.political_group ??
        raw?.["api:political-group"];

      const name = mepName(detail) || mepName(raw);
      const partyName = nationalPartyFromDetail(detail, bodyDirectory, name);

      return {
        id,
        name,
        partyName,
        partyLogo: PARTY_LOGOS[partyName] || "",
        group: groupLabel(groupRaw) || "Political group unavailable",
        photo: text(detail?.img ?? raw?.img),
        committees: committeesFromDetail(detail, bodyDirectory),
        profileUrl: id ? `https://www.europarl.europa.eu/meps/en/${encodeURIComponent(id)}` : ""
      };
    }));

    meps.sort((a, b) => a.name.localeCompare(b.name));
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    return res.status(200).json({ updatedAt: new Date().toISOString(), meps });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to retrieve Irish MEP committee data" });
  }
}
