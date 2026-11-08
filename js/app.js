/* SERA Apply — one application for universities in Tanzania.
   Front-end prototype: accounts and applications are stored in this browser (localStorage).
   Reference data (institutions, schools, scholarships, rules) comes from js/data.js. */
(() => {
  "use strict";

  const D = window.SERA_DATA;
  const INST = Object.fromEntries(D.institutions.map((i) => [i.id, i]));
  const SCHOOLS = D.schools;
  const OLAMS_URL = "https://olas.heslb.go.tz";
  const STORE_KEY = "sera-apply.v1";

  // ---------- Reference lists ----------
  const REGIONS = ["Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Kaskazini Unguja", "Kusini Unguja", "Mjini Magharibi", "Kaskazini Pemba", "Kusini Pemba"];

  const CSEE_CORE = ["Civics", "History", "Geography", "Kiswahili", "English Language", "Biology", "Basic Mathematics", "Physics", "Chemistry"];
  const CSEE_EXTRA = ["Literature in English", "Commerce", "Book-keeping", "Agriculture", "Computer Studies", "Bible Knowledge", "Islamic Knowledge", "French", "Arabic", "Additional Mathematics", "Food and Nutrition", "Fine Art", "Physical Education", "Engineering Science", "Building Construction"];
  const CSEE_GRADES = ["A", "B", "C", "D", "F"];
  const ACSEE_GRADES = ["A", "B", "C", "D", "E", "S", "F"];

  const COMBINATIONS = {
    PCM: ["Physics", "Chemistry", "Advanced Mathematics"],
    PCB: ["Physics", "Chemistry", "Biology"],
    PGM: ["Physics", "Geography", "Advanced Mathematics"],
    PMC: ["Physics", "Advanced Mathematics", "Computer Science"],
    CBG: ["Chemistry", "Biology", "Geography"],
    CBA: ["Chemistry", "Biology", "Agriculture"],
    CBN: ["Chemistry", "Biology", "Food and Human Nutrition"],
    EGM: ["Economics", "Geography", "Advanced Mathematics"],
    ECA: ["Economics", "Commerce", "Accountancy"],
    HGE: ["History", "Geography", "Economics"],
    HGK: ["History", "Geography", "Kiswahili"],
    HGL: ["History", "Geography", "English Language"],
    HKL: ["History", "Kiswahili", "English Language"],
    HGF: ["History", "Geography", "French"],
    KLF: ["Kiswahili", "English Language", "French"],
  };
  const SAMIA_COMBOS = ["PCB", "PCM", "CBG", "PGM", "CBA", "PMC", "CBN"];

  // ACSEE points used by TCU for entry (brand_and_rules.json).
  const TCU_POINTS = D.rules.acsee_points;
  // NECTA division scales (lower is better).
  const CSEE_DIV_PTS = { A: 1, B: 2, C: 3, D: 4, F: 5 };
  const ACSEE_DIV_PTS = { A: 1, B: 2, C: 3, D: 4, E: 5, S: 6, F: 7 };

  const KEY_DATES = [
    { m: "JUN", d: "2027", what: "HESLB loan applications open", note: "Usually opens in June. Apply on OLAMS.", href: OLAMS_URL },
    { m: "JUL", d: "2027", what: "Samia Scholarship next round", note: "Opens after ACSEE results.", route: "#/aid" },
    { m: "JUL", d: "2027", what: "TCU guidebook for 2027/28", note: "Programmes and application windows are published.", href: "https://www.tcu.go.tz" },
    { m: "SEP", d: "2027", what: "Mo Scholars Program next round", note: "The 2026 window ran 21 Sep to 8 Oct.", route: "#/aid" },
  ];

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const INDEX_RE = /^[SP]\d{4}\/\d{4}\/\d{4}$/i;
  // Phone numbers are stored in international format: +<country code><number>.
  const COUNTRIES = [
    ["Tanzania","255"],["Kenya","254"],["Uganda","256"],["Rwanda","250"],["Burundi","257"],["DR Congo","243"],["Zambia","260"],["Malawi","265"],["Mozambique","258"],["Zimbabwe","263"],["South Africa","27"],["Ethiopia","251"],["Somalia","252"],["South Sudan","211"],["Nigeria","234"],["Ghana","233"],["Egypt","20"],["Morocco","212"],["Algeria","213"],["Tunisia","216"],["Senegal","221"],["Cameroon","237"],["Ivory Coast","225"],["Angola","244"],["Namibia","264"],["Botswana","267"],["Sudan","249"],["Madagascar","261"],["Mauritius","230"],
    ["United Kingdom","44"],["Ireland","353"],["France","33"],["Germany","49"],["Italy","39"],["Spain","34"],["Portugal","351"],["Netherlands","31"],["Belgium","32"],["Switzerland","41"],["Austria","43"],["Sweden","46"],["Norway","47"],["Denmark","45"],["Finland","358"],["Poland","48"],["Russia","7"],["Turkey","90"],["Greece","30"],
    ["United States","1"],["Canada","1"],["Mexico","52"],["Brazil","55"],["Argentina","54"],["Colombia","57"],["Chile","56"],["Peru","51"],["Jamaica","1876"],
    ["India","91"],["Pakistan","92"],["Bangladesh","880"],["Sri Lanka","94"],["Nepal","977"],["China","86"],["Japan","81"],["South Korea","82"],["Singapore","65"],["Malaysia","60"],["Indonesia","62"],["Philippines","63"],["Thailand","66"],["Vietnam","84"],["Hong Kong","852"],
    ["United Arab Emirates","971"],["Saudi Arabia","966"],["Qatar","974"],["Oman","968"],["Kuwait","965"],["Bahrain","973"],["Israel","972"],["Jordan","962"],["Iran","98"],["Iraq","964"],["Australia","61"],["New Zealand","64"],
  ];
  const CC_ALT = COUNTRIES.map((x) => x[1]).filter((c, i, a) => a.indexOf(c) === i).sort((a, b) => b.length - a.length).join("|");
  // Keep digits only and require a leading + (or 00), so the country is always known.
  function normPhone(v) {
    const raw = String(v || "").trim().replace(/[\s().-]/g, "");
    if (!/^(\+|00)/.test(raw)) return "";
    return "+" + raw.replace(/^(\+|00)/, "").replace(/\D/g, "");
  }
  // Older Tanzanian entries (0712 345 678 or 255712345678) become +255712345678.
  function upgradePhone(v) {
    const raw = String(v || "").trim().replace(/[\s().-]/g, "");
    if (!raw || /^(\+|00)/.test(raw)) return normPhone(raw) || raw;
    if (/^0[67]\d{8}$/.test(raw)) return "+255" + raw.slice(1);
    if (/^255[67]\d{8}$/.test(raw)) return "+" + raw;
    return raw;
  }
  const isPhone = (v) => {
    const n = normPhone(v);
    if (!/^\+[1-9]\d{7,14}$/.test(n)) return false;
    if (n.startsWith("+255")) return /^\+255[67]\d{8}$/.test(n);
    return true;
  };
  const PHONE_MSG = "Start with the country code, like +255 712 345 678 or +44 7700 900123.";
  const phoneKey = (v) => normPhone(upgradePhone(v));
  const countryOptions = () => COUNTRIES.map(([n, c]) => `<option value="${c}" ${n === "Tanzania" ? "selected" : ""}>${esc(n)} (+${c})</option>`).join("");

  // ---------- Icons (Lucide, outline) ----------
  const ICONS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    cap: '<path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    mailcheck: '<path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="m16 19 2 2 4-4"/>',
    bank: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2 20 7H4z"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevdown: '<path d="m6 9 6 6 6-6"/>',
    chevup: '<path d="m18 15-6-6-6 6"/>',
    chevright: '<path d="m9 18 6-6-6-6"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  };
  const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const statusIcon = (done) => done
    ? '<svg class="status-ico" viewBox="0 0 24 24" aria-label="Complete"><circle cx="12" cy="12" r="11" fill="#1F7A4D"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg class="status-ico" viewBox="0 0 24 24" aria-label="Not complete"><circle cx="12" cy="12" r="9.5" fill="none" style="stroke:var(--blue)" stroke-width="2" stroke-dasharray="3.4 2.8"/></svg>';

  // ---------- Helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, el = document) => el.querySelector(sel);
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const setPath = (obj, path, val) => {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = val;
  };
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const initials = (name) => name.replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => /^[A-Z]/.test(w) && !/^(Of|And|The|In)$/.test(w)).map((w) => w[0]).join("").slice(0, 4);

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.innerHTML = icon("check", "sm") + esc(msg);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // ---------- Storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        d.users = d.users || {};
        Object.values(d.users).forEach((u) => {
          const c = u.profile && u.profile.contact;
          if (c) { if (c.phone) c.phone = upgradePhone(c.phone); if (c.altPhone) c.altPhone = upgradePhone(c.altPhone); }
        });
        return d;
      }
    } catch (e) { /* storage unavailable: start empty */ }
    return { users: {}, session: null };
  }
  let db = load();
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); return true; } catch (e) {
      toast("This browser could not save your changes.");
      return false;
    }
  }
  const me = () => (db.session ? db.users[db.session] : null);
  const P = () => me().profile;

  async function hashPassword(pw, salt) {
    const text = salt + ":" + pw;
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 2166136261;
    for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return "f" + (h >>> 0).toString(16);
  }

  // Every account gets a unique SERA ID: SRID followed by five digits.
  function newSrid() {
    const taken = new Set(Object.keys(db.users));
    if (taken.size >= 90000) throw new Error("No SERA IDs left");
    let id;
    do {
      const n = window.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 1e9);
      id = "SRID" + String(10000 + (n % 90000));
    } while (taken.has(id));
    return id;
  }

  const findUser = (login) => {
    const key = login.trim();
    if (/^srid\d{5}$/i.test(key)) return db.users[key.toUpperCase()];
    if (key.includes("@")) return Object.values(db.users).find((u) => u.email.toLowerCase() === key.toLowerCase());
    return findByPhone(key);
  };
  const findByPhone = (v) => { const k = phoneKey(v); return k ? Object.values(db.users).find((u) => phoneKey(u.profile?.contact?.phone) === k) : undefined; };
  const maskEmail = (e) => String(e).replace(/^(.).*(@.*)$/, "$1***$2");

  // ---------- Profile sections and results maths ----------
  const SECTIONS = [
    { id: "personal", group: "Profile", label: "Personal information", short: "Personal", done: (p) => !!(p.personal.first && p.personal.last && p.personal.dob && p.personal.sex) },
    { id: "address", group: "Profile", label: "Address", short: "Address", done: (p) => !!(p.address.kind && p.address.region && p.address.district && p.address.line) },
    { id: "contact", group: "Profile", label: "Contact details", short: "Contact", done: (p) => EMAIL_RE.test(p.contact.email || "") && isPhone(p.contact.phone) },
    { id: "education", group: "Education", label: "Schools and combination", short: "Education", done: (p) => !!(p.education.olevelSchool && INDEX_RE.test(p.education.cseeIndex || "") && p.education.alevelSchoolName && INDEX_RE.test(p.education.acseeIndex || "") && p.education.combination) },
    { id: "grades", group: "Grades", label: "Results (CSEE and ACSEE)", short: "Grades", done: (p) => {
      const c = cseeSummary(p), a = acseeSummary(p);
      return c.graded >= 7 && a.complete && !!p.grades.gs && !!p.grades.confirmed;
    } },
  ];
  const sectionById = (id) => SECTIONS.find((s) => s.id === id);
  const progress = (p) => SECTIONS.filter((s) => s.done(p)).length;

  function cseeSummary(p) {
    const grades = Object.values(p.grades.csee || {}).filter((g) => g in CSEE_DIV_PTS);
    const best7 = grades.map((g) => CSEE_DIV_PTS[g]).sort((a, b) => a - b).slice(0, 7);
    const points = best7.reduce((a, b) => a + b, 0);
    let division = null;
    if (best7.length === 7) division = points <= 17 ? "I" : points <= 21 ? "II" : points <= 25 ? "III" : points <= 33 ? "IV" : "0";
    return { graded: grades.length, points: best7.length === 7 ? points : null, division };
  }

  function acseeSummary(p) {
    const subjects = COMBINATIONS[p.education.combination] || [];
    const grades = subjects.map((s) => (p.grades.acsee || {})[s]).filter(Boolean);
    const complete = subjects.length === 3 && grades.length === 3;
    const principal = grades.filter((g) => "ABCDE".includes(g));
    const tcuPoints = principal.reduce((a, g) => a + TCU_POINTS[g], 0);
    let division = null;
    if (complete) {
      const dp = grades.reduce((a, g) => a + ACSEE_DIV_PTS[g], 0);
      division = dp <= 9 ? "I" : dp <= 12 ? "II" : dp <= 17 ? "III" : dp <= 19 ? "IV" : "0";
    }
    return {
      subjects, complete, division, tcuPoints,
      passes: principal.length,
      general: principal.length >= 2 && tcuPoints >= 4,
      health: principal.length >= 3 && tcuPoints >= 6,
    };
  }

  const VALIDATE = {
    "contact.email": (v) => (!v || EMAIL_RE.test(v) ? "" : "Enter an email like name@example.com."),
    "contact.phone": (v) => (!v || isPhone(v) ? "" : PHONE_MSG),
    "contact.altPhone": (v) => (!v || isPhone(v) ? "" : PHONE_MSG),
    "education.cseeIndex": (v) => (!v || INDEX_RE.test(v) ? "" : "Index number should look like S0101/0001/2022."),
    "education.acseeIndex": (v) => (!v || INDEX_RE.test(v) ? "" : "Index number should look like S0101/0001/2025."),
    "personal.dob": (v) => (v && new Date(v) > new Date() ? "Date of birth cannot be in the future." : ""),
  };

  function ageOf(dob) {
    if (!dob) return null;
    const b = new Date(dob), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
    return a;
  }

  // ---------- UI state (not saved) ----------
  const ui = {
    q: "", f: { type: "", own: "", region: "", admits: false }, sort: "name", showFilters: false,
    appFilter: "all", aidFilter: "all", collapsed: {}, openSch: {}, combo: null,
  };

  // ---------- Router ----------
  const root = $("#root");
  const route = () => {
    const [name = "", ...rest] = location.hash.replace(/^#\/?/, "").split("/");
    return { name, arg: decodeURIComponent(rest.join("/")) };
  };
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  function render() {
    closeModal();
    const r = route();
    const user = me();
    if (!user) {
      if (r.name !== "welcome" && r.name !== "signup") { location.replace("#/welcome"); return renderAuth("signin"); }
      return renderAuth(r.name === "signup" ? "signup" : "signin");
    }
    const views = { dashboard: viewDashboard, apply: viewApply, universities: viewUniversities, applications: viewApplications, search: viewSearch, admissions: viewAdmissions, aid: viewAid, settings: viewSettings };
    if (!views[r.name]) { location.replace("#/dashboard"); return; }
    root.innerHTML = shell(r.name, views[r.name](r.arg));
    if (r.name === "search") renderResults();
    const main = $("#main");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
    document.title = (TITLES[r.name] ? TITLES[r.name] + " · " : "") + "SERA Apply";
  }
  const TITLES = { dashboard: "Dashboard", apply: "My SERA Apply", universities: "My universities", applications: "My applications", search: "University search", admissions: "Direct admissions", aid: "Financial aid", settings: "Settings" };

  // ---------- Auth screens ----------
  function renderAuth(tab) {
    document.title = (tab === "signup" ? "Create account" : "Sign in") + " · SERA Apply";
    const admitting = D.institutions.filter((i) => i.admits).length;
    root.innerHTML = `
      <div class="auth">
        <section class="auth-visual" aria-label="About SERA Apply">
          <div class="auth-badge"><img src="assets/sera-logo.svg" alt="SERA"><span>APPLY</span></div>
          <div>
            <h1 class="auth-headline">One application. Every university in Tanzania.</h1>
            <ul class="auth-points">
              ${[
                "Fill in your profile and Form Six results once.",
                `Search all ${D.institutions.length} TCU-registered institutions. ${admitting} admit Form Six leavers in 2026/27.`,
                "Track every application and admission in one place.",
                "Find scholarships, including the Samia Scholarship, and the HESLB loan.",
              ].map((t) => `<li><span class="dot">${icon("check")}</span><span>${esc(t)}</span></li>`).join("")}
            </ul>
          </div>
          <p class="auth-foot">Built by SERA, Student Empowerment and Resource Access, for Form Six leavers.</p>
        </section>
        <section class="auth-panel">
          <div class="auth-card">
            <img class="auth-logo" src="assets/sera-logo.svg" alt="SERA">
            <div class="tabs" role="tablist">
              <button class="tab" role="tab" aria-selected="${tab === "signin"}" data-act="nav" data-href="#/welcome">Sign in</button>
              <button class="tab" role="tab" aria-selected="${tab === "signup"}" data-act="nav" data-href="#/signup">Create account</button>
            </div>
            ${tab === "signup" ? signupForm() : signinForm()}
          </div>
        </section>
      </div>`;
    const first = $(".auth-card input");
    if (first) first.focus();
  }

  function signinForm() {
    const saved = Object.values(db.users).sort((a, b) => (b.lastLogin || "").localeCompare(a.lastLogin || ""));
    const cards = saved.length ? `
      <div role="group" aria-label="Accounts on this device">
        <div class="small muted" style="margin-bottom:8px">Accounts on this device. Tap yours, then enter your password.</div>
        ${saved.map((u) => { const n = [u.profile.personal.first, u.profile.personal.last].filter(Boolean).join(" ") || u.email; return `
          <button type="button" class="btn btn-block" data-act="pick-account" data-srid="${u.srid}" style="justify-content:flex-start;text-align:left;margin-bottom:8px">
            <span aria-hidden="true" style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--blue);color:#fff;font-weight:700;margin-right:10px;flex:none">${esc((n[0] || "?").toUpperCase())}</span>
            <span><strong>${esc(n)}</strong><br><span class="small muted">${u.srid} · ${esc(maskEmail(u.email))}</span></span>
          </button>`; }).join("")}
      </div>` : "";
    return `
      <form class="form" id="signin" novalidate>
        <div>
          <h2 class="h2">${saved.length ? "Welcome back" : "Sign in"}</h2>
          <p class="muted" style="margin:8px 0 0">Use your email, phone number or SERA ID. One person, one account. New here? <a href="#/signup">Create an account</a>.</p>
        </div>
        ${cards}
        <div class="err" id="signin-err" role="alert"></div>
        <div class="field"><label for="si-login">Email, phone or SERA ID<span class="req">*</span></label>
          <input class="input" id="si-login" name="login" autocomplete="username" placeholder="name@example.com, +255712345678 or SRID12345"></div>
        <div class="field"><label for="si-pw">Password<span class="req">*</span></label>
          <input class="input" id="si-pw" name="pw" type="password" autocomplete="current-password"></div>
        <label class="check"><input type="checkbox" data-act="showpw" data-for="si-pw"> Show password</label>
        <button class="btn btn-primary btn-block" type="submit">Sign in</button>
        <p class="small muted" style="margin:0">SERA will never ask you to pay an agent to apply.</p>
      </form>`;
  }

  function signupForm() {
    return `
      <form class="form" id="signup" novalidate>
        <div>
          <h2 class="h2">Create your account</h2>
          <p class="muted" style="margin:8px 0 0">You will get a SERA ID that stays with you. Already have one? <a href="#/welcome">Sign in</a>.</p>
        </div>
        <div class="err" id="signup-err" role="alert"></div>
        <div class="grid-2">
          <div class="field"><label for="su-first">First name<span class="req">*</span></label><input class="input" id="su-first" name="first" autocomplete="given-name"></div>
          <div class="field"><label for="su-last">Last name<span class="req">*</span></label><input class="input" id="su-last" name="last" autocomplete="family-name"></div>
        </div>
        <div class="field"><label for="su-email">Email<span class="req">*</span></label><input class="input" id="su-email" name="email" type="email" autocomplete="email" placeholder="name@example.com"></div>
        <div class="field"><label for="su-phone">Mobile number<span class="req">*</span></label>
          <div style="display:flex;gap:8px"><select class="select" id="su-cc" aria-label="Country" style="flex:0 0 46%">${countryOptions()}</select>
          <input class="input" id="su-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="+255 " placeholder="+255 712 345 678" style="flex:1"></div>
          <span class="hint">Any country. Starts with the country code.</span></div>
        <div class="grid-2">
          <div class="field"><label for="su-pw">Password<span class="req">*</span></label><input class="input" id="su-pw" name="pw" type="password" autocomplete="new-password"><span class="hint">At least 8 characters.</span></div>
          <div class="field"><label for="su-pw2">Confirm password<span class="req">*</span></label><input class="input" id="su-pw2" name="pw2" type="password" autocomplete="new-password"></div>
        </div>
        <label class="check"><input type="checkbox" name="consent"> <span>I agree that SERA keeps my details to help me apply. I can download or delete them at any time.</span></label>
        <button class="btn btn-primary btn-block" type="submit">Create my account</button>
      </form>`;
  }

  async function onSignin(form) {
    const err = $("#signin-err");
    const login = form.login.value.trim(), pw = form.pw.value;
    if (!login || !pw) { err.innerHTML = icon("alert", "sm") + "Enter your email or SERA ID and your password."; return; }
    const u = findUser(login);
    if (!u || (await hashPassword(pw, u.srid)) !== u.pass) {
      err.innerHTML = icon("alert", "sm") + "That email, SERA ID or password is not right. Check it and try again.";
      return;
    }
    db.session = u.srid;
    u.lastLogin = new Date().toISOString();
    persist();
    go("#/dashboard");
  }

  async function onSignup(form) {
    const err = $("#signup-err");
    const v = Object.fromEntries(["first", "last", "email", "phone", "pw", "pw2"].map((k) => [k, form[k].value.trim()]));
    const fail = (m) => { err.innerHTML = icon("alert", "sm") + esc(m); err.scrollIntoView({ block: "nearest" }); };
    if (!v.first || !v.last) return fail("Enter your first and last name.");
    if (!EMAIL_RE.test(v.email)) return fail("Enter an email like name@example.com.");
    const dupe = (u, why) => {
      fail(`You already have an account (${u.srid}) with this ${why}. Sign in instead of creating another one.`);
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn"; b.textContent = "Sign in as " + u.srid;
      b.dataset.act = "pick-account"; b.dataset.srid = u.srid;
      err.appendChild(b);
    };
    const exE = findUser(v.email);
    if (exE) return dupe(exE, "email");
    if (!isPhone(v.phone)) return fail(PHONE_MSG);
    v.phone = normPhone(v.phone);
    const exP = findByPhone(v.phone);
    if (exP) return dupe(exP, "phone number");
    if (form.pw.value.length < 8) return fail("Your password needs at least 8 characters.");
    if (form.pw.value !== form.pw2.value) return fail("The two passwords do not match.");
    if (!form.consent.checked) return fail("Tick the box to agree that SERA keeps your details.");

    const srid = newSrid();
    db.users[srid] = {
      srid,
      email: v.email,
      pass: await hashPassword(form.pw.value, srid),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      consent: { storeDetails: new Date().toISOString() },
      profile: {
        personal: { first: v.first, middle: "", last: v.last },
        address: {}, contact: { email: v.email, phone: v.phone }, education: {},
        grades: { csee: {}, acsee: {} },
      },
      myUnis: [], applications: [],
    };
    db.session = srid;
    persist();
    history.pushState(null, "", "#/dashboard");
    render();
    openModal(`
      <div class="modal-body receipt" style="padding-top:34px">
        <div class="ok-ring">${icon("check")}</div>
        <h2 class="h2">Welcome to SERA Apply, ${esc(v.first)}</h2>
        <p class="muted" style="margin:0">This is your SERA ID. It is saved on this device, so next time just tap your account and enter your password. You can also sign in with it.</p>
        <div class="big">${srid}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-primary" data-act="close">Go to my dashboard</button></div>`, { label: "Your SERA ID" });
  }

  // ---------- Shell ----------
  function shell(active, content) {
    const u = me(), p = u.profile;
    const name = [p.personal.first, p.personal.last].filter(Boolean).join(" ");
    const pending = u.applications.filter((a) => a.status === "pending").length;
    const offers = u.applications.filter((a) => a.status === "admitted").length;
    const link = (r, ic, label, count) =>
      `<a href="#/${r}" ${active === r ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${count ? `<span class="count" aria-label="${count} waiting">${count}</span>` : ""}</a>`;
    const av = esc(((p.personal.first || "?")[0] + ((p.personal.last || "")[0] || "")).toUpperCase());
    return `
      <div class="shell">
        <aside class="sidebar" id="sidebar" aria-label="Main">
          <div class="sidebar-brand"><a href="#/dashboard" aria-label="SERA Apply dashboard"><img src="assets/sera-logo.svg" alt="SERA"></a></div>
          <nav class="nav">
            ${link("dashboard", "home", "Dashboard")}
            <div class="nav-label">APPLY</div>
            ${link("apply", "file", "My SERA Apply")}
            ${link("universities", "cap", "My universities")}
            ${link("applications", "clipboard", "My applications", pending)}
            <div class="nav-label">EXPLORE</div>
            ${link("search", "search", "University search")}
            ${link("admissions", "mailcheck", "Direct admissions", offers)}
            ${link("aid", "bank", "Financial aid")}
          </nav>
          <div class="nav nav-bottom" style="flex:none">
            ${link("settings", "settings", "Settings")}
            <a href="#" data-act="signout">${icon("logout")}<span>Sign out</span></a>
          </div>
          <div class="user-card">
            <div class="avatar" aria-hidden="true">${av}</div>
            <div class="who">
              <div class="name">${esc(name)}</div>
              <div class="email">${esc(u.email)}</div>
              <div class="srid">${u.srid}</div>
            </div>
          </div>
        </aside>
        <main class="main" id="main">
          <div class="mobile-bar">
            <button class="icon-btn" data-act="menu" aria-label="Open menu" aria-controls="sidebar">${icon("menu")}</button>
            <a href="#/dashboard"><img src="assets/sera-logo.svg" alt="SERA Apply"></a>
            <span class="srid">${u.srid}</span>
          </div>
          ${content}
        </main>
      </div>`;
  }

  // ---------- Shared pieces ----------
  function mono(i) {
    const cls = !i.admits ? "off" : i.ownership === "Public" ? "pub" : "";
    const text = i.short || initials(i.name);
    const size = text.length <= 3 ? 15 : text.length === 4 ? 13 : text.length === 5 ? 11 : 9;
    return `<div class="mono ${cls}" style="font-size:${size}px" aria-hidden="true">${esc(text)}</div>`;
  }

  const appFor = (instId) => me().applications.find((a) => a.instId === instId && a.status !== "withdrawn");
  const STATUS = {
    pending: ["Pending", "warn", "clock"],
    admitted: ["Admitted", "ok", "check"],
    not_admitted: ["Not admitted", "bad", "x"],
    confirmed: ["Confirmed", "black", "check"],
    released: ["Released", "", "x"],
  };
  const statusTag = (s) => { const [l, c, ic] = STATUS[s] || [s, "", "clock"]; return `<span class="tag ${c}">${icon(ic)}${l}</span>`; };

  function addButton(i) {
    if (!i.admits) return `<span class="tag" title="Registered with TCU, not admitting Form Six leavers in 2026/27">Not admitting</span>`;
    const added = me().myUnis.includes(i.id);
    return added
      ? `<button class="btn btn-added btn-sm btn-add" data-act="toggle-uni" data-id="${i.id}" aria-pressed="true" aria-label="Remove ${esc(i.name)} from my list">${icon("check", "sm")}Added</button>`
      : `<button class="btn btn-primary btn-sm btn-add" data-act="toggle-uni" data-id="${i.id}" aria-pressed="false" aria-label="Add ${esc(i.name)} to my list">${icon("plus", "sm")}Add</button>`;
  }

  function instRow(i, actions, extraMeta = "") {
    return `
      <div class="inst-row">
        <div class="mono-wrap">${mono(i)}</div>
        <div class="body">
          <button class="name" data-act="inst" data-id="${i.id}">${esc(i.name)}</button>
          <div class="meta"><span>${esc(i.location)} - TZA</span>${i.ownership ? `<span class="muted">${esc(i.ownership)}</span>` : ""}${extraMeta}</div>
        </div>
        <div class="act">${actions}</div>
      </div>`;
  }

  function section(id, title, body) {
    const open = !ui.collapsed[id];
    return `
      <section class="section">
        <button class="section-head" data-act="collapse" data-id="${id}" aria-expanded="${open}">${icon("chevup")}<h2>${title}</h2></button>
        <div class="section-body">${body}</div>
      </section>`;
  }

  const emptyState = (ic, text, action) => `
    <div class="empty">
      <div class="empty-art">${icon(ic, "lg")}</div>
      <p>${text}</p>
      ${action || ""}
    </div>`;

  // ---------- Dashboard ----------
  function viewDashboard() {
    const u = me(), p = u.profile;
    const hr = new Date().getHours();
    const hello = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
    const done = progress(p);
    const pct = Math.round((done / SECTIONS.length) * 100);

    const steps = SECTIONS.map((s) => `<a class="step" href="#/apply/${s.id}">${statusIcon(s.done(p))}<span>${s.short}</span></a>`).join("");
    const unis = u.myUnis.map((id) => INST[id]).filter(Boolean);
    const uniRows = unis.length
      ? `<div class="row-list">${unis.map((i) => {
          const a = appFor(i.id);
          const act = a ? statusTag(a.status) : `<button class="btn btn-outline btn-sm" data-act="apply" data-id="${i.id}">Apply</button>`;
          return instRow(i, act);
        }).join("")}</div>`
      : emptyState("send", "Nothing here yet. Add universities to your list to get started.", `<a class="btn btn-outline" href="#/search">${icon("search")}Search universities</a>`);

    const pending = u.applications.filter((a) => a.status === "pending");
    const offers = u.applications.filter((a) => a.status === "admitted" || a.status === "confirmed");
    const appsBody = u.applications.filter((a) => a.status !== "withdrawn").length
      ? `<div class="row-list">${pending.map((a) => instRow(INST[a.instId], statusTag("pending"), `<span class="muted">${esc(a.programme)}</span>`)).join("")}</div>
         ${!pending.length ? `<p class="muted" style="margin:0">No applications waiting for a decision.</p>` : ""}
         ${offers.length ? `<div class="notice ok" style="margin-top:14px"><strong>${offers.length} ${offers.length === 1 ? "university has" : "universities have"} admitted you.</strong> <a href="#/admissions">See direct admissions</a></div>` : ""}
         <p style="margin:14px 0 0"><a href="#/applications">See all my applications</a></p>`
      : emptyState("inbox", "You have not applied yet. Finish your profile, then apply from My universities.", `<a class="btn btn-outline" href="#/universities">${icon("cap")}My universities</a>`);

    const dates = `
      <ul class="date-list">
        ${KEY_DATES.map((k) => `
          <li><div class="cal" aria-hidden="true"><div class="m">${k.m}</div><div class="d" style="font-size:15px">${k.d}</div></div>
            <div><div class="what">${k.href ? `<a href="${k.href}" target="_blank" rel="noopener">${esc(k.what)}</a>` : `<a href="${k.route}">${esc(k.what)}</a>`}</div><div class="small muted">${esc(k.note)}</div></div></li>`).join("")}
      </ul>
      <p class="small muted" style="margin:14px 0 0">The 2026/27 TCU windows (10 Jul – 10 Aug and 8 – 21 Sep 2026) are closed. Dates are from SERA's October 2026 research. Always check the official site.</p>`;

    return `
      <div class="greeting">
        <div><h1>${hello}, ${esc(p.personal.first || "there")}!</h1><p>Your SERA Apply workspace for 2027/28 admissions.</p></div>
        <div class="id-chip"><span><span class="lbl">SERA ID&nbsp;</span> ${u.srid}</span><button data-act="copy" data-text="${u.srid}" aria-label="Copy SERA ID">${icon("copy", "sm")}</button></div>
      </div>
      <div class="page">
        <h1 class="title" style="margin-bottom:32px">Dashboard</h1>
        ${section("d-app", "My SERA Apply", `
          <div class="progress-label">${done}/${SECTIONS.length} sections complete</div>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Application progress"><span style="width:${pct}%"></span></div>
          <div class="steps">${steps}</div>`)}
        <div class="dash-grid">
          <div>
            ${section("d-unis", "My universities", uniRows)}
            ${section("d-apps", "My applications", appsBody)}
          </div>
          <div style="display:grid;gap:20px;align-content:start">
            <div class="card card-pad"><div class="eyebrow" style="margin-bottom:14px">Next key dates</div>${dates}</div>
            <div class="card card-pad" style="display:grid;gap:12px">
              <div class="eyebrow">Paying for university</div>
              <a class="btn btn-dark btn-block" href="#/aid">${icon("bank")}See scholarships</a>
              <a class="btn btn-outline btn-block" href="${OLAMS_URL}" target="_blank" rel="noopener">HESLB loan on OLAMS ${icon("external", "sm")}</a>
            </div>
            <div class="pay-notice">${icon("shield")}<span>SERA will never ask you to pay an agent. Pay fees only through official university or HESLB channels.</span></div>
          </div>
        </div>
      </div>`;
  }

  // ---------- My SERA Apply (profile) ----------
  function applyNav(current) {
    const p = P();
    const groups = [...new Set(SECTIONS.map((s) => s.group))];
    return `
      <h2>My SERA Apply</h2>
      ${groups.map((g) => {
        const secs = SECTIONS.filter((s) => s.group === g);
        const allDone = secs.every((s) => s.done(p));
        const open = !ui.collapsed["g-" + g];
        return `
          <div class="apply-group">
            <button data-act="collapse" data-id="g-${g}" aria-expanded="${open}">${icon("chevdown", "chev")}${statusIcon(allDone)}<span>${g}</span></button>
            <ul>${secs.map((s) => `<li><a href="#/apply/${s.id}" ${s.id === current ? 'aria-current="page"' : ""}>${statusIcon(s.done(p))}<span>${s.label}</span></a></li>`).join("")}</ul>
          </div>`;
      }).join("")}`;
  }

  function viewApply(arg) {
    const p = P();
    const sec = sectionById(arg) || SECTIONS.find((s) => !s.done(p)) || SECTIONS[0];
    return `
      <div class="apply-layout">
        <nav class="apply-nav" id="apply-nav" aria-label="Application sections">${applyNav(sec.id)}</nav>
        <div class="apply-form" id="apply-form" data-section="${sec.id}">${sectionForm(sec)}</div>
      </div>`;
  }

  function fld(k, label, o = {}) {
    const v = getPath(P(), k) ?? "";
    const id = "f-" + k.replace(/[.\s]/g, "-");
    let control;
    if (o.opts) {
      control = `<select class="select" id="${id}" data-k="${k}" ${o.rerender ? "data-rerender" : ""}>
        <option value="">Choose one</option>
        ${o.opts.map((x) => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}" ${String(v) === String(val) ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}
      </select>`;
    } else {
      control = `<input class="input" id="${id}" data-k="${k}" type="${o.type || "text"}" value="${esc(v)}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""} ${o.auto ? `autocomplete="${o.auto}"` : ""} ${o.mode ? `inputmode="${o.mode}"` : ""} ${o.max ? `max="${o.max}"` : ""}>`;
    }
    const e = VALIDATE[k] ? VALIDATE[k](v) : "";
    return `
      <div class="field">
        <label for="${id}">${esc(label)}${o.req ? '<span class="req" aria-hidden="true">*</span>' : ""}</label>
        ${o.hint ? `<div class="hint">${esc(o.hint)}</div>` : ""}
        ${control}
        <div class="err" id="err-${id}">${e ? icon("alert", "sm") + esc(e) : ""}</div>
      </div>`;
  }

  function radios(k, label, opts) {
    const v = getPath(P(), k) ?? "";
    return `
      <fieldset class="field" style="border:0;padding:0;margin:0">
        <legend class="label" style="font-weight:600;font-size:15px;margin-bottom:6px">${esc(label)}<span class="req" aria-hidden="true">*</span></legend>
        <div class="radio-row">${opts.map(([val, lab]) => `<label class="radio-card"><input type="radio" name="${k}" value="${val}" data-k="${k}" ${v === val ? "checked" : ""}><span>${esc(lab)}</span></label>`).join("")}</div>
      </fieldset>`;
  }

  function schoolCombo(k, idxKey, label, hint) {
    const v = getPath(P(), k) ?? "";
    const id = "f-" + k.replace(/\./g, "-");
    return `
      <div class="field">
        <label for="${id}">${esc(label)}<span class="req" aria-hidden="true">*</span></label>
        <div class="hint">${esc(hint)}</div>
        <div class="combo">
          <div class="input-wrap">${icon("search")}<input class="input" id="${id}" data-k="${k}" data-combo="${idxKey}" value="${esc(v)}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list"></div>
          <ul class="combo-list" id="${id}-list" role="listbox" hidden></ul>
        </div>
      </div>`;
  }

  function sectionForm(sec) {
    const p = P();
    const i = SECTIONS.indexOf(sec);
    const next = SECTIONS[i + 1];
    const head = `
      <div class="form-head">
        <div><div class="eyebrow">${sec.group}</div><h1 class="title" style="font-size:clamp(28px,3.4vw,38px);margin-top:6px">${sec.label}</h1></div>
        <span class="save-state" id="save-state">${sec.done(p) ? icon("check", "sm") + "Section complete" : "Saves as you type"}</span>
      </div>`;
    const foot = `
      <div class="form-foot">
        ${i > 0 ? `<a class="btn btn-ghost" href="#/apply/${SECTIONS[i - 1].id}">Back</a>` : "<span></span>"}
        ${next ? `<a class="btn btn-primary" href="#/apply/${next.id}">Save and continue</a>` : `<a class="btn btn-primary" href="#/dashboard">Save and go to dashboard</a>`}
      </div>`;
    let body = "";

    if (sec.id === "personal") {
      const age = ageOf(p.personal.dob);
      body = `
        <fieldset class="fieldset"><legend>Your name</legend>
          <p class="hint" style="margin:0 0 16px">Write your name exactly as it is on your NECTA certificates.</p>
          <div class="grid-3">
            ${fld("personal.first", "First name", { req: true, auto: "given-name" })}
            ${fld("personal.middle", "Middle name", { auto: "additional-name", hint: "Leave empty if you have none." })}
            ${fld("personal.last", "Last name", { req: true, auto: "family-name" })}
          </div>
        </fieldset>
        <fieldset class="fieldset"><legend>About you</legend>
          <div class="grid-2">
            ${fld("personal.dob", "Date of birth", { req: true, type: "date", max: new Date().toISOString().slice(0, 10) })}
            ${radios("personal.sex", "Sex", [["female", "Female"], ["male", "Male"]])}
          </div>
          ${age !== null && age < 18 ? `<div class="notice warn" style="margin-top:16px"><strong>You are under 18.</strong> A parent or guardian must agree before you submit an application.</div>` : ""}
        </fieldset>`;
    }

    if (sec.id === "address") {
      body = `
        <fieldset class="fieldset"><legend>Where should letters reach you?</legend>
          ${radios("address.kind", "This address is my", [["home", "Home address"], ["school", "School address"]])}
          <div class="grid-2" style="margin-top:18px">
            ${fld("address.region", "Region", { req: true, opts: REGIONS })}
            ${fld("address.district", "District", { req: true, ph: "For example: Kinondoni" })}
          </div>
          <div style="margin-top:18px">${fld("address.line", "Street, ward or P.O. Box", { req: true, ph: "For example: P.O. Box 123, Mwenge", auto: "street-address" })}</div>
        </fieldset>`;
    }

    if (sec.id === "contact") {
      body = `
        <fieldset class="fieldset"><legend>How universities can reach you</legend>
          <div class="grid-2">
            ${fld("contact.email", "Email", { req: true, type: "email", auto: "email" })}
            ${fld("contact.phone", "Mobile number", { req: true, type: "tel", mode: "tel", auto: "tel", ph: "+255 712 345 678", hint: "Start with the country code. Any country." })}
          </div>
          <div style="margin-top:18px">${fld("contact.altPhone", "Another number (parent or guardian)", { type: "tel", mode: "tel", ph: "+255 712 345 678", hint: "Optional. Start with the country code. Used only if we cannot reach you." })}</div>
        </fieldset>`;
    }

    if (sec.id === "education") {
      const combos = Object.entries(COMBINATIONS).map(([c, s]) => [c, `${c} — ${s.join(", ")}`]);
      body = `
        <fieldset class="fieldset"><legend>O-level (Form Four)</legend>
          <div style="display:grid;gap:18px">
            ${schoolCombo("education.olevelSchool", "olevel", "O-level school", "Start typing. Pick your school if it appears, or type the full name.")}
            <div class="grid-2">
              ${fld("education.cseeIndex", "CSEE index number", { req: true, ph: "S0101/0001/2022", hint: "As printed on your Form Four certificate." })}
            </div>
          </div>
        </fieldset>
        <fieldset class="fieldset"><legend>A-level (Form Six)</legend>
          <div style="display:grid;gap:18px">
            ${schoolCombo("education.alevelSchoolName", "alevel", "A-level school", `Search ${SCHOOLS.length.toLocaleString()} ACSEE schools by name or centre number.`)}
            <div class="grid-2">
              ${fld("education.acseeIndex", "ACSEE index number", { req: true, ph: "S0101/0001/2025", hint: "As printed on your Form Six results." })}
              ${fld("education.combination", "Subject combination", { req: true, opts: combos })}
            </div>
            ${p.education.alevelSchoolIndex ? `<p class="small muted" style="margin:0">Centre number ${esc(p.education.alevelSchoolIndex)}</p>` : ""}
          </div>
        </fieldset>`;
    }

    if (sec.id === "grades") body = gradesForm(p);

    return head + `<div id="section-body">${body}</div>` + foot;
  }

  function gradeSelect(k, scale, label) {
    const v = getPath(P(), k) ?? "";
    const id = "g-" + k.replace(/[.\s]/g, "-");
    return `<select class="select" id="${id}" data-k="${k}" data-rerender aria-label="${esc(label)} grade">
      <option value="">—</option>${scale.map((g) => `<option ${v === g ? "selected" : ""}>${g}</option>`).join("")}
    </select>`;
  }

  function gradesForm(p) {
    const csee = p.grades.csee || {};
    const extras = Object.keys(csee).filter((s) => !CSEE_CORE.includes(s));
    const c = cseeSummary(p);
    const a = acseeSummary(p);
    const addable = CSEE_EXTRA.filter((s) => !(s in csee));

    const cseeRows = [...CSEE_CORE, ...extras].map((s) => `
      <tr><td>${esc(s)}</td><td>${gradeSelect("grades.csee." + s, CSEE_GRADES, s)}</td>
      <td style="text-align:right">${CSEE_CORE.includes(s) ? "" : `<button class="icon-btn" data-act="rm-subject" data-s="${esc(s)}" aria-label="Remove ${esc(s)}">${icon("x", "sm")}</button>`}</td></tr>`).join("");

    const acseePart = a.subjects.length
      ? `
        <table class="grade-table">
          <thead><tr><th>Principal subject</th><th>Grade</th><th></th></tr></thead>
          <tbody>
            ${a.subjects.map((s) => `<tr><td>${esc(s)}</td><td>${gradeSelect("grades.acsee." + s, ACSEE_GRADES, s)}</td><td></td></tr>`).join("")}
            <tr><td>General Studies</td><td>${gradeSelect("grades.gs", ACSEE_GRADES, "General Studies")}</td><td></td></tr>
            ${a.subjects.includes("Advanced Mathematics") ? "" : `<tr><td>Basic Applied Mathematics <span class="muted small">(if you took it)</span></td><td>${gradeSelect("grades.bam", ACSEE_GRADES, "Basic Applied Mathematics")}</td><td></td></tr>`}
          </tbody>
        </table>
        <div class="summary-box">
          <div class="stat"><div class="k">Principal passes</div><div class="v">${a.passes}</div></div>
          <div class="stat"><div class="k">TCU points</div><div class="v">${a.tcuPoints}</div></div>
          <div class="stat"><div class="k">Division</div><div class="v">${a.division ?? "—"}</div></div>
        </div>
        ${a.complete ? `
          <div class="notice ${a.general ? "ok" : "warn"}" style="margin-top:16px">
            ${a.general
              ? `<strong>You meet the TCU minimum for most degree programmes:</strong> 2 principal passes and at least 4.0 points.`
              : `<strong>You do not yet meet the TCU minimum</strong> of 2 principal passes with at least 4.0 points. Diploma routes may still be open to you.`}
            ${a.general ? (a.health ? " You also meet the health programme minimum (3 passes, 6.0 points)." : " Health programmes need 3 principal passes and 6.0 points.") : ""}
          </div>` : ""}`
      : `<div class="notice blue">Choose your subject combination first. <a href="#/apply/education">Go to Education</a></div>`;

    return `
      <div class="notice" style="margin-bottom:20px">Enter your grades exactly as on your NECTA certificates. They are marked <strong>self-reported</strong> until SERA can check them with NECTA.</div>
      <fieldset class="fieldset"><legend>CSEE results (Form Four)</legend>
        <table class="grade-table">
          <thead><tr><th>Subject</th><th>Grade</th><th></th></tr></thead>
          <tbody>${cseeRows}</tbody>
        </table>
        ${addable.length ? `
          <div class="field" style="margin-top:14px;max-width:360px">
            <label for="add-subject">Add another subject</label>
            <select class="select" id="add-subject" data-act-change="add-subject"><option value="">Choose a subject</option>${addable.map((s) => `<option>${esc(s)}</option>`).join("")}</select>
          </div>` : ""}
        <div class="summary-box">
          <div class="stat"><div class="k">Subjects entered</div><div class="v">${c.graded}</div></div>
          <div class="stat"><div class="k">Points (best 7)</div><div class="v">${c.points ?? "—"}</div></div>
          <div class="stat"><div class="k">Division</div><div class="v">${c.division ?? "—"}</div></div>
        </div>
        ${c.graded < 7 ? `<p class="hint" style="margin:12px 0 0">Enter at least 7 subjects to work out your division.</p>` : ""}
      </fieldset>
      <fieldset class="fieldset"><legend>ACSEE results (Form Six)${p.education.combination ? ` · ${esc(p.education.combination)}` : ""}</legend>${acseePart}</fieldset>
      <label class="check" style="margin-bottom:22px"><input type="checkbox" data-k="grades.confirmed" data-rerender ${p.grades.confirmed ? "checked" : ""}><span>These results match my certificates.</span></label>`;
  }

  // ---------- My universities ----------
  function viewUniversities() {
    const u = me();
    const unis = u.myUnis.map((id) => INST[id]).filter(Boolean);
    const body = unis.length
      ? `<div class="row-list">${unis.map((i) => {
          const a = appFor(i.id);
          const act = a
            ? `${statusTag(a.status)}<button class="btn btn-ghost btn-sm" data-act="view-app" data-id="${a.id}">View</button>`
            : `<button class="btn btn-primary btn-sm" data-act="apply" data-id="${i.id}">Apply</button><button class="icon-btn" data-act="toggle-uni" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">${icon("trash", "sm")}</button>`;
          return instRow(i, act, `<span class="muted">${esc(i.typeLabel)}</span>`);
        }).join("")}</div>`
      : emptyState("cap", "You have not added a university yet.", `<a class="btn btn-primary" href="#/search">${icon("search")}Search universities</a>`);
    return `
      <div class="page">
        <div class="page-head">
          <div><h1 class="title">My universities</h1><p class="lead">The universities you are interested in. Apply to each one from here.</p></div>
          <a class="btn btn-outline" href="#/search">${icon("plus")}Add universities</a>
        </div>
        ${body}
      </div>`;
  }

  // ---------- My applications ----------
  function viewApplications() {
    const apps = me().applications.filter((a) => a.status !== "withdrawn");
    const counts = { all: apps.length, pending: 0, admitted: 0, not_admitted: 0 };
    apps.forEach((a) => {
      if (a.status === "pending") counts.pending++;
      if (a.status === "admitted" || a.status === "confirmed") counts.admitted++;
      if (a.status === "not_admitted") counts.not_admitted++;
    });
    const f = ui.appFilter;
    const shown = apps.filter((a) => f === "all" || a.status === f || (f === "admitted" && a.status === "confirmed"));
    const seg = [["all", "All"], ["pending", "Pending"], ["admitted", "Admitted"], ["not_admitted", "Not admitted"]]
      .map(([k, l]) => `<button data-act="app-filter" data-f="${k}" aria-pressed="${f === k}">${l} <span class="n">${counts[k]}</span></button>`).join("");

    const table = shown.length ? `
      <table class="table">
        <thead><tr><th>Reference</th><th>University</th><th>Programme</th><th>Submitted</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${shown.map((a) => {
          const i = INST[a.instId];
          return `<tr>
            <td class="ref">${esc(a.ref)}</td>
            <td><button class="link-btn" data-act="inst" data-id="${i.id}">${esc(i.short || i.name)}</button><div class="small muted">${esc(i.location)}</div></td>
            <td>${esc(a.programme)}${a.programme2 ? `<div class="small muted">2nd: ${esc(a.programme2)}</div>` : ""}</td>
            <td>${fmtDate(a.submittedAt)}</td>
            <td>${statusTag(a.status)}</td>
            <td style="text-align:right;white-space:nowrap"><button class="btn btn-ghost btn-sm" data-act="view-app" data-id="${a.id}">View</button></td>
          </tr>`;
        }).join("")}</tbody>
      </table>`
      : apps.length
        ? `<p class="muted">No applications with this status.</p>`
        : emptyState("clipboard", "You have not applied yet. Add universities to your list, then apply.", `<a class="btn btn-primary" href="#/universities">${icon("cap")}Go to My universities</a>`);

    return `
      <div class="page">
        <div class="page-head">
          <div><h1 class="title">My applications</h1><p class="lead">Every application you have made. Pending means the university has not decided yet.</p></div>
        </div>
        ${apps.length ? `<div class="seg" role="group" aria-label="Filter by status" style="margin-bottom:18px">${seg}</div>` : ""}
        ${table}
        ${apps.length ? `<p class="small muted" style="margin-top:18px">Universities that are not yet SERA partners also need you to apply on their own admission portal. Use your SERA details to fill it in quickly.</p>` : ""}
      </div>`;
  }

  // ---------- University search ----------
  function viewSearch() {
    const opt = (list, v) => list.map(([val, lab]) => `<option value="${esc(val)}" ${v === val ? "selected" : ""}>${esc(lab)}</option>`).join("");
    const types = [["", "All types"], ["university", "Universities"], ["university_college_or_campus", "University colleges and campuses"], ["non_university_institution", "Other degree-awarding institutions"], ["registered_not_admitting", "Registered, not admitting in 2026/27"]];
    const owns = [["", "Public and private"], ["Public", "Public"], ["Private", "Private"]];
    const regions = [["", "All regions"], ...[...new Set(D.institutions.map((i) => i.region))].sort().map((r) => [r, r])];
    const activeFilters = Object.values(ui.f).filter(Boolean).length;
    return `
      <div class="page">
        <div class="page-head">
          <h1 class="title">University search</h1>
          <button class="btn btn-ghost" data-act="requirements">Application requirements</button>
        </div>
        <div class="search-bar">
          <label for="q" style="font-weight:600;font-size:17px">University or city name</label>
          <div class="input-wrap">${icon("search")}<input class="input" id="q" type="search" value="${esc(ui.q)}" autocomplete="off" aria-describedby="q-hint" style="min-height:54px"></div>
          <div class="hint" id="q-hint">Separate several search terms with a comma, for example: Dodoma, Mwanza</div>
        </div>
        <div style="margin-top:16px">
          <button class="btn btn-outline" data-act="toggle-filters" aria-expanded="${ui.showFilters}" aria-controls="filters">${icon("filter")}More filters${activeFilters ? ` (${activeFilters})` : ""}</button>
        </div>
        <div class="filters" id="filters" ${ui.showFilters ? "" : "hidden"}>
          <div class="field"><label for="f-type">Type</label><select class="select" id="f-type" data-filter="type">${opt(types, ui.f.type)}</select></div>
          <div class="field"><label for="f-own">Ownership</label><select class="select" id="f-own" data-filter="own">${opt(owns, ui.f.own)}</select></div>
          <div class="field"><label for="f-region">Region</label><select class="select" id="f-region" data-filter="region">${opt(regions, ui.f.region)}</select></div>
          <label class="check"><input type="checkbox" data-filter="admits" ${ui.f.admits ? "checked" : ""}> Admitting Form Six leavers in 2026/27</label>
        </div>
        <div class="toolbar">
          <span id="result-count" aria-live="polite"></span>
          <label class="sort">Sort by: <select class="select" id="sort" data-filter="sort">
            ${opt([["name", "Name (A to Z)"], ["name-desc", "Name (Z to A)"], ["location", "Location"]], ui.sort)}
          </select></label>
        </div>
        <div class="row-list" id="results"></div>
      </div>`;
  }

  function filteredInstitutions() {
    const terms = ui.q.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const list = D.institutions.filter((i) => {
      const hay = `${i.name} ${i.short} ${i.location}`.toLowerCase();
      if (terms.length && !terms.some((t) => hay.includes(t))) return false;
      if (ui.f.type && i.type !== ui.f.type) return false;
      if (ui.f.own && i.ownership !== ui.f.own) return false;
      if (ui.f.region && i.region !== ui.f.region) return false;
      if (ui.f.admits && !i.admits) return false;
      return true;
    });
    const byName = (a, b) => a.name.localeCompare(b.name);
    if (ui.sort === "name-desc") list.sort((a, b) => byName(b, a));
    else if (ui.sort === "location") list.sort((a, b) => a.location.localeCompare(b.location) || byName(a, b));
    else list.sort(byName);
    return list;
  }

  function renderResults() {
    const box = $("#results");
    if (!box) return;
    const list = filteredInstitutions();
    $("#result-count").textContent = `${list.length} ${list.length === 1 ? "result" : "results"}`;
    box.innerHTML = list.length
      ? list.map((i) => instRow(i, addButton(i))).join("")
      : emptyState("search", "No university matches your search. Try a shorter name or clear the filters.", `<button class="btn btn-outline" data-act="clear-search">Clear search</button>`);
  }

  // ---------- Direct admissions ----------
  function viewAdmissions() {
    const u = me();
    const offers = u.applications.filter((a) => ["admitted", "confirmed", "released"].includes(a.status));
    const confirmed = offers.find((a) => a.status === "confirmed");
    const body = offers.length
      ? `
        ${!confirmed && offers.filter((a) => a.status === "admitted").length > 1
          ? `<div class="notice warn" style="margin-bottom:20px"><strong>You can confirm only one place.</strong> When you confirm one, the others are released. Confirm through TCU before the deadline the university gives you.</div>` : ""}
        ${confirmed ? `<div class="notice ok" style="margin-bottom:20px"><strong>You confirmed ${esc(INST[confirmed.instId].name)}.</strong> Complete your confirmation with TCU using the code the university sends you.</div>` : ""}
        <div class="offer-grid">${offers.map((a) => {
          const i = INST[a.instId];
          return `
            <article class="offer ${a.status === "confirmed" ? "confirmed" : ""}">
              <div class="top">${mono(i)}<div><h3>${esc(i.name)}</h3><div class="small muted">${esc(i.location)}</div></div></div>
              <div class="kv tight">
                <div class="k">Programme</div><div>${esc(a.programme)}</div>
                <div class="k">Admitted</div><div>${a.decidedAt ? fmtDate(a.decidedAt) : "—"}</div>
                <div class="k">Status</div><div>${statusTag(a.status)}</div>
              </div>
              ${a.status === "admitted" && !confirmed ? `<button class="btn btn-primary" data-act="confirm-offer" data-id="${a.id}">Confirm this one</button>` : ""}
            </article>`;
        }).join("")}</div>`
      : emptyState("mailcheck", "No admissions yet. When a university admits you, it will appear here.", `<a class="btn btn-outline" href="#/applications">${icon("clipboard")}See my applications</a>`);
    return `
      <div class="page">
        <div class="page-head"><div><h1 class="title">Direct admissions</h1><p class="lead">Universities that have admitted you. Compare your offers and confirm one place.</p></div></div>
        ${body}
      </div>`;
  }

  // ---------- Financial aid ----------
  function scholarshipFit(s, p) {
    const combo = p.education.combination;
    const a = acseeSummary(p), c = cseeSummary(p);
    if (!a.complete) return null;
    switch (s.name) {
      case "Samia Scholarship": return SAMIA_COMBOS.includes(combo);
      case "Samia Scholarship Extended (DS/AI+)": return ["PCM", "PGM", "PMC"].includes(combo);
      case "Mwalimu Julius K. Nyerere Memorial Scholarship Fund":
      case "NMB Nuru Yangu Scholarship":
      case "Mo Scholars Program": return a.division === "I";
      case "Karimjee Foundation Scholarship": return a.division === "I" && c.division === "I";
      default: return null;
    }
  }

  function viewAid() {
    const p = P();
    const samia = D.scholarships.find((s) => s.name === "Samia Scholarship");
    const others = D.scholarships.filter((s) => s !== samia && !/^HESLB/.test(s.name));
    const samiaFit = scholarshipFit(samia, p);
    const shown = ui.aidFilter === "fit" ? others.filter((s) => scholarshipFit(s, p)) : others;
    const fitTag = (fit) => fit === true ? `<span class="tag ok">${icon("check")}May fit your profile</span>` : "";

    const cards = shown.map((s) => {
      const open = ui.openSch[s.name];
      return `
        <article class="sch ${open ? "open" : ""}">
          <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag blue">${esc(s.type)}</span>${fitTag(scholarshipFit(s, p))}</div>
          <h3>${esc(s.name)}</h3>
          <div class="sponsor">${esc(s.sponsor)}</div>
          <div class="tag" style="justify-self:start;white-space:normal">${icon("clock")}${esc(s.status_oct_2026)}</div>
          <dl>
            <div><dt>Who can apply</dt><dd>${esc(s.eligibility)}</dd></div>
            <div class="more">
              <div><dt>What it covers</dt><dd>${esc(s.covers)}</dd></div>
              <div><dt>When</dt><dd>${esc(s.timing)}</dd></div>
              <div><dt>How to apply</dt><dd>${esc(s.how_to_apply)}</dd></div>
            </div>
          </dl>
          <div class="foot">
            <button class="link-btn" data-act="toggle-sch" data-name="${esc(s.name)}" aria-expanded="${!!open}">${open ? "Show less" : "Show details"}</button>
            <a class="btn btn-outline btn-sm" href="${esc(s.url)}" target="_blank" rel="noopener">Official website ${icon("external", "sm")}</a>
          </div>
        </article>`;
    }).join("");

    return `
      <div class="page">
        <div class="page-head"><div><h1 class="title">Financial aid</h1>
          <p class="lead">Scholarships and loans for Form Six leavers studying in Tanzania. SERA does not award these. Always apply on the official website.</p></div></div>

        <section class="feature" aria-labelledby="samia-h">
          <div class="l">
            <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag black" style="background:#fff;color:#000">Government scholarship</span>${samiaFit === true ? `<span class="tag ok">${icon("check")}Your combination qualifies</span>` : ""}</div>
            <h2 id="samia-h">${esc(samia.name)}</h2>
            <p>${esc(samia.sponsor)}</p>
            <dl>
              <div><dt>Who can apply</dt><dd>${esc(samia.eligibility)}</dd></div>
              <div><dt>What it covers</dt><dd>${esc(samia.covers)}</dd></div>
            </dl>
          </div>
          <div class="r">
            <dl>
              <div><dt>Status</dt><dd><strong>${esc(samia.status_oct_2026)}</strong></dd></div>
              <div><dt>When</dt><dd>${esc(samia.timing)}</dd></div>
              <div><dt>How to apply</dt><dd>${esc(samia.how_to_apply)}</dd></div>
            </dl>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
              <a class="btn btn-light" href="${esc(samia.url)}" target="_blank" rel="noopener">Ministry of Education ${icon("external", "sm")}</a>
              <a class="btn btn-line" href="${OLAMS_URL}" target="_blank" rel="noopener">Apply on OLAMS ${icon("external", "sm")}</a>
            </div>
          </div>
        </section>

        <section class="heslb" aria-labelledby="heslb-h">
          <div><h3 id="heslb-h">HESLB student loan</h3><p>Apply for the Higher Education Students' Loans Board loan on OLAMS, the official online system.</p></div>
          <a class="btn btn-dark" href="${OLAMS_URL}" target="_blank" rel="noopener">Open OLAMS ${icon("external", "sm")}</a>
        </section>

        <hr class="divider">
        <div class="toolbar" style="margin-top:0">
          <h2 class="h2">All scholarships</h2>
          <div class="seg" role="group" aria-label="Filter scholarships">
            <button data-act="aid-filter" data-f="all" aria-pressed="${ui.aidFilter === "all"}">All <span class="n">${others.length}</span></button>
            <button data-act="aid-filter" data-f="fit" aria-pressed="${ui.aidFilter === "fit"}">May fit me <span class="n">${others.filter((s) => scholarshipFit(s, p)).length}</span></button>
          </div>
        </div>
        ${ui.aidFilter === "fit" && !acseeSummary(p).complete ? `<div class="notice blue" style="margin-bottom:16px">Add your ACSEE results to see which scholarships may fit you. <a href="#/apply/grades">Add results</a></div>` : ""}
        ${shown.length ? `<div class="sch-grid">${cards}</div>` : (acseeSummary(p).complete ? `<p class="muted">None of these match your results yet. Check each one's rules on the official website.</p>` : "")}
        <p class="small muted" style="margin-top:20px">Information checked by SERA in October 2026. Rules and dates change, so confirm on the sponsor's website before you apply.</p>
      </div>`;
  }

  // ---------- Settings ----------
  function viewSettings() {
    const u = me(), p = u.profile;
    const pending = u.applications.filter((a) => a.status === "pending");
    return `
      <div class="page">
        <div class="page-head"><h1 class="title">Settings</h1></div>
        <div style="display:grid;gap:20px;max-width:760px">
          <section class="card card-pad">
            <h2 class="h3" style="margin-bottom:14px">Your account</h2>
            <div class="kv">
              <div class="k">SERA ID</div><div class="srid" style="font-size:16px">${u.srid}</div>
              <div class="k">Name</div><div>${esc([p.personal.first, p.personal.middle, p.personal.last].filter(Boolean).join(" "))}</div>
              <div class="k">Sign-in email</div><div>${esc(u.email)}</div>
              <div class="k">Joined</div><div>${fmtDate(u.createdAt)}</div>
            </div>
          </section>
          <section class="card card-pad" style="display:grid;gap:14px">
            <h2 class="h3" id="theme-h">Theme</h2>
            <p class="muted" style="margin:0">Choose how SERA Apply looks on this device.</p>
            <div class="theme-grid" role="radiogroup" aria-labelledby="theme-h">${themePicker()}</div>
          </section>
          <section class="card card-pad" style="display:grid;gap:14px">
            <h2 class="h3">Your data</h2>
            <p class="muted" style="margin:0">Under Tanzania's Personal Data Protection Act, 2022, you can download or delete your data at any time.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-ghost" data-act="download">${icon("download")}Download my data</button>
              <button class="btn btn-danger" data-act="delete-account">${icon("trash")}Delete my account</button>
            </div>
          </section>
          <section class="card card-pad" style="display:grid;gap:14px">
            <h2 class="h3">Prototype tools</h2>
            <p class="muted" style="margin:0">Partner universities are not connected yet. Use these buttons to stand in for a university's decision and see how admissions will look.</p>
            ${pending.length ? pending.map((a) => `
              <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;border-top:1px solid var(--line);padding-top:12px">
                <div><strong>${esc(INST[a.instId].short || INST[a.instId].name)}</strong> <span class="muted">· ${esc(a.programme)}</span></div>
                <div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" data-act="decide" data-id="${a.id}" data-d="admitted">Mark admitted</button><button class="btn btn-ghost btn-sm" data-act="decide" data-id="${a.id}" data-d="not_admitted">Mark not admitted</button></div>
              </div>`).join("") : `<p class="small muted" style="margin:0">No pending applications.</p>`}
          </section>
          <button class="btn btn-dark" style="justify-self:start" data-act="signout">${icon("logout")}Sign out</button>
        </div>
      </div>`;
  }

  // ---------- Theme (per device) ----------
  const THEME_KEY = "sera-apply.theme";
  const THEMES = [
    { id: "light", name: "Light", note: "Bright and clear. The standard SERA look.", c: ["#000000", "#FFFFFF", "#F6F7F9", "#0046FF", "#CDD2DC"] },
    { id: "dark", name: "Dark", note: "Easier at night and saves battery on many phones.", c: ["#000000", "#15171C", "#1C1F26", "#3A6DFF", "#3A404C"] },
    { id: "eyecare", name: "Eye care", note: "Warm paper tones with less blue light for long sessions.", c: ["#3B3225", "#FBF5E6", "#F3EAD3", "#2A55C8", "#CDBF9F"] },
  ];
  const currentTheme = () => document.documentElement.dataset.theme
    || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  function applyTheme(id) {
    const root = document.documentElement;
    root.dataset.theme = id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = THEMES.find((t) => t.id === id).c[0];
  }

  function setTheme(id) {
    applyTheme(id);
    try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* theme still applies for this visit */ }
    toast(`${THEMES.find((t) => t.id === id).name} theme on`);
  }

  function themePicker() {
    const now = currentTheme();
    return THEMES.map((t) => {
      const [frame, side, pane, accent, bar] = t.c;
      return `
        <label class="theme-opt">
          <input type="radio" name="theme" value="${t.id}" ${now === t.id ? "checked" : ""}>
          <span class="theme-card">
            <span class="theme-prev" style="background:${frame}" aria-hidden="true">
              <i style="background:${side}"></i>
              <span class="pane" style="background:${side}"><span class="bar" style="background:${accent};width:60%"></span><span class="bar" style="background:${bar}"></span><span class="bar" style="background:${bar};width:80%"></span><span class="bar" style="background:${pane};height:14px"></span></span>
            </span>
            <span class="theme-name">${t.name}${icon("check", "sm")}</span>
            <span class="small muted">${t.note}</span>
          </span>
        </label>`;
    }).join("");
  }

  // Shared pages cannot start downloads, so show the data with a copy button instead.
  function showDataCopy(json) {
    openModal(`
      ${modalHead("Your data")}
      <div class="modal-body">
        <p style="margin:0">Copy this text and save it in a file on your device.</p>
        <textarea class="textarea" id="data-copy" readonly rows="12" style="font-family:ui-monospace,Consolas,monospace;font-size:13px">${esc(json)}</textarea>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-act="close">Close</button><button class="btn btn-primary" data-act="copy-data">${icon("copy", "sm")}Copy</button></div>`, { label: "Your data" });
  }

  // ---------- Modals ----------
  let lastFocus = null;
  function openModal(html, { wide = false, label = "Dialog" } = {}) {
    lastFocus = document.activeElement;
    $("#modal-root").innerHTML = `<div class="modal-back" data-act="backdrop"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div></div>`;
    const f = $("#modal-root input, #modal-root button.btn, #modal-root a.btn");
    if (f) f.focus();
  }
  function closeModal() {
    const mr = $("#modal-root");
    if (mr && mr.innerHTML) {
      mr.innerHTML = "";
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }
  }
  const modalHead = (title, sub = "") => `
    <div class="modal-head"><div>${sub ? `<div class="eyebrow" style="margin-bottom:4px">${sub}</div>` : ""}<h2>${title}</h2></div>
    <button class="icon-btn" data-act="close" aria-label="Close">${icon("x")}</button></div>`;

  function openInstitution(id) {
    const i = INST[id];
    const a = appFor(id);
    const added = me().myUnis.includes(id);
    let actions = `<button class="btn btn-ghost" data-act="close">Close</button>`;
    if (i.admits) {
      if (a) actions += `<button class="btn btn-primary" data-act="view-app" data-id="${a.id}">View my application</button>`;
      else {
        actions += added
          ? `<button class="btn btn-ghost" data-act="toggle-uni" data-id="${id}">Remove from my list</button>`
          : `<button class="btn btn-outline" data-act="toggle-uni" data-id="${id}">${icon("plus", "sm")}Add to my list</button>`;
        actions += `<button class="btn btn-primary" data-act="apply" data-id="${id}">Apply</button>`;
      }
    }
    openModal(`
      ${modalHead(esc(i.name), esc(i.typeLabel))}
      <div class="modal-body">
        <div class="kv">
          <div class="k">Short name</div><div>${esc(i.short || "—")}</div>
          <div class="k">Location</div><div>${esc(i.location)}</div>
          <div class="k">Ownership</div><div>${esc(i.ownership || "—")}</div>
          <div class="k">2026/27 intake</div><div>${i.admits ? `<span class="tag ok">${icon("check")}Admits Form Six leavers</span>` : `<span class="tag">Registered, not admitting</span>`}</div>
        </div>
        <div class="notice blue">
          <strong>Minimum entry (TCU):</strong> two principal passes with at least 4.0 points in the subjects that define the programme. Health programmes need three principal passes and at least 6.0 points.
        </div>
        <p class="small muted" style="margin:0">Programme lists and fees for 2027/28 come out in the TCU guidebook, usually in July. Source: TCU Admission Guidebook 2026/2027 and TCU list of university institutions, 11 Aug 2026.</p>
      </div>
      <div class="modal-foot">${actions}</div>`, { label: i.name });
  }

  function openRequirements() {
    const w = D.rules.tcu_2026_27_windows;
    const win = (s) => s.split("/").map(fmtDate).join(" – ");
    openModal(`
      ${modalHead("Application requirements", "TCU 2026/27")}
      <div class="modal-body">
        <div class="kv">
          <div class="k">Most programmes</div><div>${esc(D.rules.tcu_minimum.general)}</div>
          <div class="k">Health programmes</div><div>${esc(D.rules.tcu_minimum.health)}</div>
          <div class="k">Grade points</div><div>${Object.entries(TCU_POINTS).map(([g, v]) => `${g} = ${v}`).join(", ")}</div>
          <div class="k">First window</div><div>${win(w.window_1)} <span class="tag">Closed</span></div>
          <div class="k">Second window</div><div>${win(w.window_2)} <span class="tag">Closed</span></div>
        </div>
        <p class="small muted" style="margin:0">You apply to each institution on its own admission portal. Check the 2027/28 TCU guidebook, usually out in July, for next year's dates.</p>
      </div>
      <div class="modal-foot"><a class="btn btn-ghost" href="https://www.tcu.go.tz" target="_blank" rel="noopener">TCU website ${icon("external", "sm")}</a><button class="btn btn-primary" data-act="close">Done</button></div>`, { label: "Application requirements" });
  }

  function openApply(id) {
    const i = INST[id], p = P(), u = me();
    const existing = appFor(id);
    if (existing) return openApplication(existing.id);
    const missing = SECTIONS.filter((s) => !s.done(p));
    if (missing.length) {
      openModal(`
        ${modalHead("Finish your profile first", esc(i.short || i.name))}
        <div class="modal-body">
          <p style="margin:0">Universities need your full profile. These sections are not complete yet:</p>
          <ul style="margin:0;padding:0;list-style:none;display:grid;gap:8px">
            ${missing.map((s) => `<li><a href="#/apply/${s.id}" style="display:flex;gap:10px;align-items:center">${statusIcon(false)}${s.label}</a></li>`).join("")}
          </ul>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" data-act="close">Not now</button><a class="btn btn-primary" href="#/apply/${missing[0].id}">Go to ${missing[0].label}</a></div>`, { label: "Finish your profile" });
      return;
    }
    const a = acseeSummary(p);
    const name = [p.personal.first, p.personal.middle, p.personal.last].filter(Boolean).join(" ");
    const age = ageOf(p.personal.dob);
    openModal(`
      ${modalHead(`Apply to ${esc(i.short || i.name)}`, "2027/28 intake")}
      <form class="modal-body" id="apply-form-modal" data-id="${id}" novalidate>
        <div class="err" id="apply-err" role="alert"></div>
        <div class="field"><label for="ap-1">First choice programme<span class="req">*</span></label>
          <input class="input" id="ap-1" name="programme" placeholder="For example: BSc in Computer Science"></div>
        <div class="field"><label for="ap-2">Second choice programme</label>
          <input class="input" id="ap-2" name="programme2" placeholder="Optional"></div>
        <div>
          <div class="eyebrow" style="margin-bottom:8px">What ${esc(i.short || "the university")} will see</div>
          <div class="kv">
            <div class="k">Name</div><div>${esc(name)}</div>
            <div class="k">SERA ID</div><div class="srid" style="font-size:16px">${u.srid}</div>
            <div class="k">Contact</div><div>${esc(p.contact.phone)} · ${esc(p.contact.email)}</div>
            <div class="k">A-level school</div><div>${esc(p.education.alevelSchoolName)}</div>
            <div class="k">ACSEE index</div><div>${esc(p.education.acseeIndex.toUpperCase())}</div>
            <div class="k">Combination</div><div>${esc(p.education.combination)}</div>
            <div class="k">ACSEE results</div><div>${a.subjects.map((s) => `${esc(s)} ${p.grades.acsee[s]}`).join(", ")} · Division ${a.division} · ${a.tcuPoints} points <span class="tag">Self-reported</span></div>
          </div>
        </div>
        ${age !== null && age < 18 ? `<label class="check"><input type="checkbox" name="guardian"> <span>My parent or guardian agrees to this application.</span></label>` : ""}
        <label class="check"><input type="checkbox" name="confirm"> <span>The details above are true and match my certificates.</span></label>
      </form>
      <div class="modal-foot"><button class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary" data-act="submit-apply">${icon("send", "sm")}Submit to ${esc(i.short || "university")}</button></div>`, { wide: true, label: `Apply to ${i.name}` });
  }

  function submitApply() {
    const form = $("#apply-form-modal");
    const err = $("#apply-err");
    const programme = form.programme.value.trim();
    if (!programme) { err.innerHTML = icon("alert", "sm") + "Write the programme you want to study."; form.programme.focus(); return; }
    if (form.guardian && !form.guardian.checked) { err.innerHTML = icon("alert", "sm") + "Because you are under 18, tick the box to show your parent or guardian agrees."; return; }
    if (!form.confirm.checked) { err.innerHTML = icon("alert", "sm") + "Tick the box to confirm your details are true."; return; }
    const u = me(), id = form.dataset.id;
    const seq = u.applications.length + 1;
    const app = {
      id: "a" + Date.now().toString(36),
      instId: id,
      programme,
      programme2: form.programme2.value.trim(),
      intake: "2027/28",
      status: "pending",
      ref: `SA27-${u.srid.slice(4)}-${String(seq).padStart(3, "0")}`,
      submittedAt: new Date().toISOString(),
    };
    u.applications.push(app);
    if (!u.myUnis.includes(id)) u.myUnis.push(id);
    persist();
    render();
    const i = INST[id];
    openModal(`
      <div class="modal-body receipt" style="padding-top:34px">
        <div class="ok-ring">${icon("check")}</div>
        <h2 class="h2">Application saved</h2>
        <p class="muted" style="margin:0">Your application to ${esc(i.name)} is now <strong>pending</strong>. Keep this reference number.</p>
        <div class="big">${app.ref}</div>
        <div class="notice" style="text-align:left">${esc(i.short || "This university")} is not yet a SERA partner. Also apply on its own admission portal before the deadline. Use the details in SERA Apply to fill it in.</div>
      </div>
      <div class="modal-foot"><a class="btn btn-ghost" href="#/applications">See my applications</a><button class="btn btn-primary" data-act="close">Done</button></div>`, { label: "Application saved" });
  }

  function openApplication(appId) {
    const a = me().applications.find((x) => x.id === appId);
    const i = INST[a.instId];
    openModal(`
      ${modalHead(esc(i.name), "Application " + esc(a.ref))}
      <div class="modal-body">
        <div class="kv">
          <div class="k">Status</div><div>${statusTag(a.status)}</div>
          <div class="k">Programme</div><div>${esc(a.programme)}</div>
          ${a.programme2 ? `<div class="k">Second choice</div><div>${esc(a.programme2)}</div>` : ""}
          <div class="k">Intake</div><div>${esc(a.intake)}</div>
          <div class="k">Submitted</div><div>${fmtDate(a.submittedAt)}</div>
          ${a.decidedAt ? `<div class="k">Decision</div><div>${fmtDate(a.decidedAt)}</div>` : ""}
        </div>
      </div>
      <div class="modal-foot">
        ${a.status === "pending" ? `<button class="btn btn-danger" data-act="withdraw" data-id="${a.id}">Withdraw</button>` : ""}
        ${a.status === "admitted" ? `<a class="btn btn-outline" href="#/admissions">Go to direct admissions</a>` : ""}
        <button class="btn btn-primary" data-act="close">Close</button>
      </div>`, { label: "Application" });
  }

  function confirmDialog(title, text, okLabel, onOk, danger = false) {
    openModal(`
      ${modalHead(esc(title))}
      <div class="modal-body"><p style="margin:0">${text}</p></div>
      <div class="modal-foot"><button class="btn btn-ghost" data-act="close">Cancel</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="dialog-ok">${esc(okLabel)}</button></div>`, { label: title });
    pendingOk = onOk;
  }
  let pendingOk = null;

  // ---------- Saving profile fields ----------
  let saveTimer;
  function queueSave() {
    const st = $("#save-state");
    if (st) { st.classList.remove("on"); st.textContent = "Saving…"; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (persist() && st) {
        st.classList.add("on");
        const sec = sectionById($("#apply-form")?.dataset.section);
        st.innerHTML = icon("check", "sm") + (sec && sec.done(P()) ? "Section complete" : "Saved");
      }
      const nav = $("#apply-nav");
      if (nav) nav.innerHTML = applyNav($("#apply-form").dataset.section);
    }, 350);
  }

  function rerenderSection(focusId) {
    const form = $("#apply-form");
    if (!form) return;
    const sec = sectionById(form.dataset.section);
    form.innerHTML = sectionForm(sec);
    $("#apply-nav").innerHTML = applyNav(sec.id);
    const el = focusId && document.getElementById(focusId);
    if (el) {
      el.focus();
      if (el.tagName === "INPUT" && el.type === "text") el.setSelectionRange(el.value.length, el.value.length);
    }
  }

  // School search for the education section.
  function showCombo(input) {
    const list = document.getElementById(input.id + "-list");
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { list.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
    const hits = SCHOOLS.filter((s) => s.name.toLowerCase().includes(q) || s.index.toLowerCase().startsWith(q)).slice(0, 30);
    list.innerHTML = hits.length
      ? hits.map((s, n) => `<li role="option" id="${input.id}-o${n}" data-pick-school="${s.index}" data-target="${input.dataset.combo}">${esc(s.name)}<span class="code">${s.index}</span></li>`).join("")
      : `<li class="none">No school found. Keep typing your full school name.</li>`;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    ui.combo = { input, n: -1 };
  }

  function pickSchool(index, target) {
    const s = SCHOOLS.find((x) => x.index === index);
    const ed = P().education;
    const title = s.name.toLowerCase().replace(/(^|[\s.'-])\S/g, (m) => m.toUpperCase());
    if (target === "alevel") {
      ed.alevelSchoolName = title;
      ed.alevelSchoolIndex = s.index;
      if (!ed.acseeIndex) ed.acseeIndex = s.index + "/";
      persist();
      rerenderSection("f-education-acseeIndex");
    } else {
      ed.olevelSchool = title;
      if (!ed.cseeIndex) ed.cseeIndex = s.index + "/";
      persist();
      rerenderSection("f-education-cseeIndex");
    }
  }

  // ---------- Events ----------
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.id === "signin") onSignin(e.target);
    if (e.target.id === "signup") onSignup(e.target);
    if (e.target.id === "apply-form-modal") submitApply();
  });

  document.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick-school]");
    if (pick) { pickSchool(pick.dataset.pickSchool, pick.dataset.target); return; }

    const sb = $("#sidebar");
    if (sb?.classList.contains("open") && !e.target.closest("#sidebar") && !e.target.closest('[data-act="menu"]')) sb.classList.remove("open");

    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act, id = t.dataset.id;
    const u = me();

    switch (act) {
      case "nav": go(t.dataset.href); break;
      case "backdrop": if (e.target === t) closeModal(); break;
      case "close": closeModal(); break;
      case "menu": $("#sidebar").classList.toggle("open"); break;
      case "showpw": { const f = document.getElementById(t.dataset.for); f.type = t.checked ? "text" : "password"; break; }
      case "pick-account": {
        e.preventDefault();
        if (route().name !== "welcome") location.hash = "#/welcome";
        setTimeout(() => {
          const l = document.getElementById("si-login"), u = db.users[t.dataset.srid];
          if (l && u) { l.value = u.srid; const pw = document.getElementById("si-pw"); if (pw) pw.focus(); }
        }, 30);
        break;
      }
      case "signout": e.preventDefault(); db.session = null; persist(); go("#/welcome"); break;
      case "collapse": ui.collapsed[id] = !ui.collapsed[id]; t.setAttribute("aria-expanded", String(!ui.collapsed[id])); break;
      case "copy": {
        const text = t.dataset.text;
        (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => toast("SERA ID copied"), () => toast(text));
        break;
      }
      case "inst": openInstitution(id); break;
      case "requirements": openRequirements(); break;
      case "toggle-filters": ui.showFilters = !ui.showFilters; $("#filters").hidden = !ui.showFilters; t.setAttribute("aria-expanded", String(ui.showFilters)); break;
      case "clear-search": ui.q = ""; ui.f = { type: "", own: "", region: "", admits: false }; render(); break;
      case "toggle-uni": {
        const i = INST[id];
        if (u.myUnis.includes(id)) {
          if (appFor(id)) { toast("You have an application here. Withdraw it first."); break; }
          u.myUnis = u.myUnis.filter((x) => x !== id);
          toast(`${i.short || i.name} removed from your list`);
        } else {
          u.myUnis.push(id);
          toast(`${i.short || i.name} added to your list`);
        }
        persist();
        if ($("#modal-root").innerHTML) { render(); openInstitution(id); }
        else if (route().name === "search") renderResults();
        else render();
        break;
      }
      case "apply": openApply(id); break;
      case "submit-apply": submitApply(); break;
      case "view-app": openApplication(id); break;
      case "withdraw":
        confirmDialog("Withdraw this application?", "The university will no longer see it in SERA Apply. You can apply again later.", "Withdraw", () => {
          const a = u.applications.find((x) => x.id === id);
          a.status = "withdrawn";
          persist(); render(); toast("Application withdrawn");
        }, true);
        break;
      case "app-filter": ui.appFilter = t.dataset.f; render(); break;
      case "aid-filter": ui.aidFilter = t.dataset.f; render(); break;
      case "toggle-sch": ui.openSch[t.dataset.name] = !ui.openSch[t.dataset.name]; {
        const card = t.closest(".sch"); card.classList.toggle("open");
        t.textContent = card.classList.contains("open") ? "Show less" : "Show details";
        t.setAttribute("aria-expanded", String(card.classList.contains("open")));
      } break;
      case "rm-subject": delete P().grades.csee[t.dataset.s]; persist(); rerenderSection("add-subject"); break;
      case "confirm-offer": {
        const a = u.applications.find((x) => x.id === id);
        const others = u.applications.filter((x) => x.status === "admitted" && x.id !== id);
        confirmDialog(`Confirm ${INST[a.instId].short || INST[a.instId].name}?`,
          others.length ? `This releases your ${others.length === 1 ? "other offer" : `other ${others.length} offers`}: ${others.map((x) => esc(INST[x.instId].short || INST[x.instId].name)).join(", ")}. You cannot undo this here.` : "You will take this place. You cannot undo this here.",
          "Confirm this one", () => {
            a.status = "confirmed"; a.decidedAt ??= new Date().toISOString();
            others.forEach((x) => { x.status = "released"; });
            persist(); render(); toast("Place confirmed");
          });
        break;
      }
      case "decide": {
        const a = u.applications.find((x) => x.id === id);
        a.status = t.dataset.d; a.decidedAt = new Date().toISOString();
        persist(); render(); toast(a.status === "admitted" ? "Marked as admitted" : "Marked as not admitted");
        break;
      }
      case "download": {
        const { pass, ...data } = u;
        if (window.SERA_EMBED) { showDataCopy(JSON.stringify(data, null, 2)); break; }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `sera-apply-${u.srid}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        break;
      }
      case "delete-account":
        confirmDialog("Delete your account?", `This removes your profile, results and applications for <strong>${u.srid}</strong> from this device. You cannot undo this.`, "Delete my account", () => {
          delete db.users[u.srid]; db.session = null; persist(); go("#/welcome");
        }, true);
        break;
      case "copy-data": {
        const ta = $("#data-copy");
        (navigator.clipboard?.writeText(ta.value) || Promise.reject()).then(() => toast("Copied"), () => { ta.focus(); ta.select(); toast("Selected. Press Ctrl+C to copy."); });
        break;
      }
      case "dialog-ok": { const fn = pendingOk; pendingOk = null; closeModal(); if (fn) fn(); break; }
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id !== "su-cc") return;
    const ph = document.getElementById("su-phone");
    const rest = normPhone(ph.value).slice(1).replace(new RegExp("^(" + CC_ALT + ")"), "");
    ph.value = "+" + e.target.value + " " + rest;
    ph.focus();
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "q") { ui.q = el.value; renderResults(); return; }
    if (!el.dataset.k || !me()) return;
    const val = el.type === "checkbox" ? el.checked : el.value;
    setPath(P(), el.dataset.k, val);
    if (el.dataset.k === "education.alevelSchoolName") delete P().education.alevelSchoolIndex;
    const errEl = document.getElementById("err-" + el.id);
    if (errEl && VALIDATE[el.dataset.k]) {
      const m = VALIDATE[el.dataset.k](val);
      errEl.innerHTML = m ? icon("alert", "sm") + esc(m) : "";
      el.setAttribute("aria-invalid", m ? "true" : "false");
    }
    if (el.dataset.combo) showCombo(el);
    queueSave();
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.name === "theme") { setTheme(el.value); return; }
    if (el.dataset.filter) {
      const k = el.dataset.filter;
      if (k === "sort") ui.sort = el.value;
      else ui.f[k] = el.type === "checkbox" ? el.checked : el.value;
      renderResults();
      const btn = $('[data-act="toggle-filters"]');
      const n = Object.values(ui.f).filter(Boolean).length;
      if (btn) btn.innerHTML = icon("filter") + "More filters" + (n ? ` (${n})` : "");
      return;
    }
    if (el.dataset.actChange === "add-subject" && el.value) {
      P().grades.csee[el.value] = "";
      persist();
      rerenderSection("g-grades-csee-" + el.value.replace(/[.\s]/g, "-"));
      return;
    }
    if (el.dataset.k && el.hasAttribute("data-rerender")) {
      clearTimeout(saveTimer);
      persist();
      rerenderSection(el.id);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#modal-root").innerHTML) closeModal();
      const list = document.querySelector(".combo-list:not([hidden])");
      if (list) list.hidden = true;
      $("#sidebar")?.classList.remove("open");
    }
    // Arrow keys and Enter for the school list.
    const c = ui.combo;
    if (c && e.target === c.input) {
      const list = document.getElementById(c.input.id + "-list");
      const items = [...list.querySelectorAll("[data-pick-school]")];
      if (list.hidden || !items.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        c.n = (c.n + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((li, n) => li.setAttribute("aria-selected", String(n === c.n)));
        items[c.n].scrollIntoView({ block: "nearest" });
        c.input.setAttribute("aria-activedescendant", items[c.n].id);
      } else if (e.key === "Enter" && c.n >= 0) {
        e.preventDefault();
        pickSchool(items[c.n].dataset.pickSchool, items[c.n].dataset.target);
      }
    }
  });

  document.addEventListener("focusout", (e) => {
    if (e.target.dataset?.combo) {
      setTimeout(() => {
        const list = document.getElementById(e.target.id + "-list");
        if (list) list.hidden = true;
      }, 180);
    }
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) { db = load(); render(); }
    if (e.key === THEME_KEY) applyTheme(THEMES.some((t) => t.id === e.newValue) ? e.newValue : "light");
  });
  render();
})();
