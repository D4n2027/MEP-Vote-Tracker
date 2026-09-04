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

function text(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length ? text(value[0]) : "";
  if (typeof value === "object") {
    return text(value.en ?? value["@value"] ?? value.value ?? value.label ?? value["@id"] ?? value.id);
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

function committeesFromDetail(raw) {
  const memberships = Array.isArray(raw?.hasMembership) ? raw.hasMembership : [];
  const found = [];

  for (const m of memberships) {
    if (!isCurrentMembership(m)) continue;

    const classification = lastCode(m?.membershipClassification).toUpperCase();
    const code = lastCode(m?.organization).toUpperCase();
    const looksLikeCommittee = classification.startsWith("COMMITTEE_PARLIAMENTARY") || Boolean(COMMITTEE_NAMES[code]);
    if (!looksLikeCommittee || !code) continue;

    found.push({
      code,
      name: COMMITTEE_NAMES[code] || code,
      role: roleLabel(m?.role)
    });
  }

  const unique = new Map();
  for (const c of found) {
    const old = unique.get(c.code);
    if (!old || (old.role === "Member" && c.role !== "Member")) unique.set(c.code, c);
  }
  return [...unique.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export default async function handler(req, res) {
  try {
    // The Parliament has 720 seats, so 8 pages of 100 covers the complete current roster.
    const pages = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        epJson(`meps/show-current?format=application%2Fld%2Bjson&limit=100&offset=${i * 100}`)
      )
    );

    const roster = pages.flatMap(arrayFrom).filter(isIrish);

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

      const groupRaw = detail?.["api:political-group"] ?? detail?.politicalGroup ?? detail?.political_group ?? raw?.["api:political-group"];

      return {
        id,
        name: mepName(detail) || mepName(raw),
        group: groupLabel(groupRaw) || "Political group unavailable",
        photo: text(detail?.img ?? raw?.img),
        committees: committeesFromDetail(detail),
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
