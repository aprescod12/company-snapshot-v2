const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;

function isBlockedHostname(hostname) {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (value === "localhost" || value.endsWith(".localhost")) return true;
  // Literal IPv6 targets are unnecessary for this exact public-source boundary
  // and cannot be safely classified without a DNS/network policy layer.
  if (value.includes(":")) return true;
  if (value === "0.0.0.0") return true;
  const ipv4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  // DNS names are the normal public-web source form. Reject every IPv4 literal
  // rather than maintaining an incomplete public/private address policy.
  return true;
}

export function parseSafeSourceUrl(value) {
  if (typeof value !== "string" || value.trim() !== value) return null;
  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      isBlockedHostname(parsed.hostname)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function header(response, name) {
  return response?.headers?.get?.(name) ?? response?.headers?.[name] ?? "";
}

async function readBoundedBody(response, maxBodyBytes) {
  const declared = Number(header(response, "content-length"));
  if (Number.isFinite(declared) && declared > maxBodyBytes) return { tooLarge: true };
  if (!response.body?.getReader) {
    const text = await response.text();
    return Buffer.byteLength(text, "utf8") > maxBodyBytes ? { tooLarge: true } : { text };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBodyBytes) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(bytes) };
}

function isChallengePage(html) {
  return /(?:captcha|cf-chl|verify (?:you are )?human|access denied|security challenge)/i.test(html);
}

/**
 * Bounded, cookie-free, exact-URL HTML retrieval. Results never persist a body.
 */
export async function fetchHtmlSource(
  sourceUrl,
  {
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  } = {},
) {
  if (!Number.isInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > DEFAULT_MAX_REDIRECTS) {
    throw new TypeError(`maxRedirects must be between 0 and ${DEFAULT_MAX_REDIRECTS}.`);
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > DEFAULT_TIMEOUT_MS) {
    throw new TypeError(`timeoutMs must be between 1 and ${DEFAULT_TIMEOUT_MS}.`);
  }
  if (!Number.isFinite(maxBodyBytes) || maxBodyBytes <= 0 || maxBodyBytes > DEFAULT_MAX_BODY_BYTES) {
    throw new TypeError(`maxBodyBytes must be between 1 and ${DEFAULT_MAX_BODY_BYTES}.`);
  }

  let current = parseSafeSourceUrl(sourceUrl);
  if (!current) return { ok: false, reason: "inaccessible" };

  for (let redirects = 0; ; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(current.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
    } catch {
      return { ok: false, reason: "inaccessible" };
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      if (redirects >= maxRedirects) return { ok: false, reason: "inaccessible" };
      const location = header(response, "location");
      let next;
      try {
        next = new URL(location, current);
      } catch {
        return { ok: false, reason: "inaccessible" };
      }
      current = parseSafeSourceUrl(next.href);
      if (!current) return { ok: false, reason: "inaccessible" };
      continue;
    }

    if (!response.ok || response.status === 403 || response.status === 429) {
      return { ok: false, reason: "inaccessible" };
    }
    const contentType = String(header(response, "content-type")).toLowerCase();
    if (!/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/.test(contentType)) {
      return { ok: false, reason: "unsupported_source_type" };
    }
    try {
      const body = await readBoundedBody(response, maxBodyBytes);
      if (body.tooLarge) return { ok: false, reason: "inaccessible" };
      if (isChallengePage(body.text)) return { ok: false, reason: "inaccessible" };
      return { ok: true, sourceUrl, resolvedUrl: current.href, html: body.text };
    } catch {
      return { ok: false, reason: "inaccessible" };
    }
  }
}
