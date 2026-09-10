const API_PATH = "/api/snapshot";
const PUBLIC_STATES = new Set(["snapshot", "clarification_needed", "insufficient_evidence", "unavailable"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isSafeSourceUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sourceHostname(sourceUrl) {
  if (!isSafeSourceUrl(sourceUrl)) return "Source unavailable";
  return new URL(sourceUrl).hostname.replace(/^www\./i, "");
}

export function formatPublishedDate(value) {
  if (!isNonEmptyString(value)) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function isValidCompany(company) {
  return Boolean(company && typeof company === "object" && isNonEmptyString(company.name) && isNonEmptyString(company.domain) && isNonEmptyString(company.description));
}

function isValidSignal(signal) {
  return Boolean(
    signal &&
      typeof signal === "object" &&
      isNonEmptyString(signal.title) &&
      isNonEmptyString(signal.publishedDate) &&
      isSafeSourceUrl(signal.sourceUrl) &&
      (signal.recencyBucket === "RECENT" || signal.recencyBucket === "FALLBACK"),
  );
}

export function isValidPublicResult(result) {
  if (!result || typeof result !== "object" || !PUBLIC_STATES.has(result.state)) return false;
  if (result.state === "clarification_needed") return result.reason === "invalid_input" || result.reason === "company_ambiguous";
  if (result.state === "unavailable") return true;
  if (!isValidCompany(result.company) || !Array.isArray(result.signals) || !result.signals.every(isValidSignal)) return false;
  return result.state === "snapshot" ? result.signals.length === 3 : result.signals.length <= 2;
}

export function unavailableResult() {
  return { state: "unavailable" };
}

export function createSnapshotController({ fetchImpl = fetch, onUpdate = () => {} } = {}) {
  let inFlight = false;

  return {
    get inFlight() {
      return inFlight;
    },
    async submit(rawInput) {
      if (inFlight) return false;
      if (!isNonEmptyString(rawInput)) {
        onUpdate({ kind: "result", result: { state: "clarification_needed", reason: "invalid_input" } });
        return false;
      }

      inFlight = true;
      onUpdate({ kind: "loading" });
      try {
        const response = await fetchImpl(API_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: rawInput }),
        });
        const result = await response.json();
        onUpdate({ kind: "result", result: isValidPublicResult(result) ? result : unavailableResult() });
      } catch {
        onUpdate({ kind: "result", result: unavailableResult() });
      } finally {
        inFlight = false;
        onUpdate({ kind: "settled" });
      }
      return true;
    },
  };
}

function element(tagName, { className, text } = {}) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderSignals(signals) {
  const list = element("ol", { className: "signal-list" });
  signals.forEach((signal, index) => {
    const item = element("li", { className: "signal-row" });
    item.append(element("span", { className: "signal-number", text: String(index + 1).padStart(2, "0") }));
    const content = element("div");
    content.append(element("p", { className: "signal-title", text: signal.title }));
    const meta = element("p", { className: "signal-meta" });
    meta.append(document.createTextNode(formatPublishedDate(signal.publishedDate)));
    meta.append(document.createTextNode(" · "));
    const source = element("a", { className: "source-link", text: `${sourceHostname(signal.sourceUrl)} ↗` });
    source.setAttribute("href", signal.sourceUrl);
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    meta.append(source);
    if (signal.recencyBucket === "FALLBACK") {
      meta.append(element("span", { className: "fallback-badge", text: "Older fallback" }));
    }
    content.append(meta);
    item.append(content);
    list.append(item);
  });
  return list;
}

function renderCompanyResult(result) {
  const card = element("article", { className: "result-card" });
  card.append(element("p", { className: "eyebrow", text: "Company snapshot" }));
  const heading = element("div", { className: "company-heading" });
  heading.append(element("h2", { text: result.company.name }));
  heading.append(element("p", { className: "company-domain", text: result.company.domain }));
  card.append(heading);

  const overview = element("section", { className: "overview" });
  overview.append(element("h3", { text: "Overview" }));
  overview.append(element("p", { text: result.company.description }));
  card.append(overview);

  const signals = element("section", { className: "signals-section" });
  signals.append(element("h3", { className: "signals-heading", text: "Recent signals" }));
  if (result.signals.length > 0) signals.append(renderSignals(result.signals));
  card.append(signals);

  if (result.state === "insufficient_evidence") {
    const limited = element("section", { className: "limited-evidence" });
    limited.append(element("h3", { text: "Limited recent evidence" }));
    limited.append(element("p", { text: "We identified this company, but couldn't verify three recent signals strongly enough." }));
    card.append(limited);
  }
  return card;
}

function renderStatus(result) {
  const card = element("section", { className: "status-card" });
  if (result.state === "clarification_needed" && result.reason === "company_ambiguous") {
    card.append(element("h2", { text: "We couldn't confidently identify that company." }));
    card.append(element("p", { className: "status-copy", text: "Try entering its website instead." }));
    return card;
  }
  if (result.state === "clarification_needed") {
    card.append(element("h2", { text: "Enter a company name or website to continue." }));
    card.append(element("p", { className: "status-copy", text: "Use a company name or its website, then build a new snapshot." }));
    return card;
  }
  card.append(element("h2", { text: "Company information is temporarily unavailable." }));
  card.append(element("p", { className: "status-copy", text: "You can try again or search for another company." }));
  return card;
}

function renderLoading() {
  const card = element("section", { className: "loading-card" });
  card.append(element("div", { className: "loading-mark" }));
  card.append(element("h2", { text: "Building company snapshot…" }));
  card.append(element("p", { className: "status-copy", text: "Checking recent public information and sources." }));
  return card;
}

export function renderResult(panel, result) {
  panel.replaceChildren(result.state === "snapshot" || result.state === "insufficient_evidence" ? renderCompanyResult(result) : renderStatus(result));
}

function initializeApp() {
  const form = document.querySelector("#snapshot-form");
  const input = document.querySelector("#company-input");
  const button = document.querySelector("#submit-button");
  const panel = document.querySelector("#result-panel");
  const shell = document.querySelector(".app-shell");
  if (!form || !input || !button || !panel || !shell) return;

  const controller = createSnapshotController({
    onUpdate(update) {
      if (update.kind === "loading") {
        button.disabled = true;
        shell.setAttribute("aria-busy", "true");
        panel.replaceChildren(renderLoading());
      } else if (update.kind === "result") {
        renderResult(panel, update.result);
      } else if (update.kind === "settled") {
        button.disabled = false;
        shell.setAttribute("aria-busy", "false");
      }
    },
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    controller.submit(input.value);
  });
}

if (typeof document !== "undefined") initializeApp();
