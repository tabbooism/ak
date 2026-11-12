/**
 * Domain Name Generator & IP Address Validator Utility Suite
 *
 * Provides:
 * 1. Domain name generation with keyword permutations, prefixes, suffixes, and TLD expansions.
 * 2. Robust IPv4 and IPv6 format validation.
 */

export interface DomainGeneratorOptions {
  tlds?: string[];
  includeHyphens?: boolean;
  includePrefixes?: boolean;
  includeSuffixes?: boolean;
  maxResults?: number;
}

export interface DomainSuggestion {
  domain: string;
  tld: string;
  pattern: "exact-compound" | "reversed" | "prefix" | "suffix" | "hyphenated" | "single";
  description: string;
}

export const DEFAULT_TLDS = [".com", ".org", ".net", ".io", ".xyz", ".app", ".dev", ".security"];

const COMMON_PREFIXES = ["get", "my", "the", "cyber", "open", "cloud", "meta"];
const COMMON_SUFFIXES = ["hub", "lab", "sec", "ops", "node", "vault", "guard", "link", "gate"];

/**
 * Generates domain name suggestions based on user-provided keywords and TLD variations.
 *
 * @param keywords Array of keywords (e.g. ['rune', 'hall'])
 * @param options Configuration options including TLDs, modifiers, and count limit
 * @returns Array of structured DomainSuggestion objects
 */
export function generateDomainSuggestions(
  keywords: string[],
  options: DomainGeneratorOptions = {}
): DomainSuggestion[] {
  const tlds = options.tlds && options.tlds.length > 0 ? options.tlds : DEFAULT_TLDS;
  const includeHyphens = options.includeHyphens ?? true;
  const includePrefixes = options.includePrefixes ?? true;
  const includeSuffixes = options.includeSuffixes ?? true;
  const maxResults = options.maxResults ?? 50;

  // Clean & sanitize keywords (lowercase alphanumeric only)
  const cleaned = keywords
    .map((k) => k.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((k) => k.length > 0);

  if (cleaned.length === 0) {
    return [];
  }

  const suggestions: DomainSuggestion[] = [];
  const seenDomains = new Set<string>();

  const addSuggestion = (name: string, tld: string, pattern: DomainSuggestion["pattern"], description: string) => {
    const full = `${name}${tld.startsWith(".") ? tld : `.${tld}`}`;
    if (!seenDomains.has(full) && suggestions.length < maxResults) {
      seenDomains.add(full);
      suggestions.push({
        domain: full,
        tld: tld.startsWith(".") ? tld : `.${tld}`,
        pattern,
        description,
      });
    }
  };

  // 1. Direct compound combinations (e.g. "rune" + "hall" = "runehall")
  if (cleaned.length >= 2) {
    const primary = cleaned.join("");
    tlds.forEach((tld) => {
      addSuggestion(primary, tld, "exact-compound", "Direct keyword concatenation");
    });

    // Reversed compound (e.g. "hall" + "rune" = "hallrune")
    const reversed = [...cleaned].reverse().join("");
    if (reversed !== primary) {
      tlds.forEach((tld) => {
        addSuggestion(reversed, tld, "reversed", "Reversed keyword combination");
      });
    }

    // Hyphenated compound (e.g. "rune-hall")
    if (includeHyphens) {
      const hyphenated = cleaned.join("-");
      tlds.forEach((tld) => {
        addSuggestion(hyphenated, tld, "hyphenated", "Hyphenated keyword separation");
      });
    }
  } else if (cleaned.length === 1) {
    // Single keyword base
    tlds.forEach((tld) => {
      addSuggestion(cleaned[0], tld, "single", "Exact keyword brand");
    });
  }

  // 2. Keyword with Brand Suffixes (e.g. "runehallsec.com", "runevault.io")
  if (includeSuffixes) {
    const baseNames = cleaned.length >= 2 ? [cleaned.join(""), cleaned[0]] : [cleaned[0]];
    for (const base of baseNames) {
      for (const suffix of COMMON_SUFFIXES) {
        for (const tld of tlds) {
          addSuggestion(`${base}${suffix}`, tld, "suffix", `Keyword + '${suffix}' industry suffix`);
          if (suggestions.length >= maxResults) break;
        }
        if (suggestions.length >= maxResults) break;
      }
    }
  }

  // 3. Keyword with Brand Prefixes (e.g. "getrunehall.com", "cyberrune.org")
  if (includePrefixes) {
    const baseNames = cleaned.length >= 2 ? [cleaned.join("")] : [cleaned[0]];
    for (const base of baseNames) {
      for (const prefix of COMMON_PREFIXES) {
        for (const tld of tlds) {
          addSuggestion(`${prefix}${base}`, tld, "prefix", `'${prefix}' brand prefix + keyword`);
          if (suggestions.length >= maxResults) break;
        }
        if (suggestions.length >= maxResults) break;
      }
    }
  }

  return suggestions;
}

/**
 * Validates whether an input string is a valid IPv4 address.
 *
 * Rules for valid IPv4:
 * - Exactly 4 decimal numbers separated by '.'
 * - Each octet must be between 0 and 255 inclusive
 * - No leading zeroes allowed for numbers greater than 0 (e.g. "01" is invalid)
 * - No negative values, whitespaces, or letters
 */
export function isValidIPv4(ip: string): boolean {
  if (typeof ip !== "string") return false;
  const trimmed = ip.trim();
  const parts = trimmed.split(".");

  if (parts.length !== 4) {
    return false;
  }

  for (const part of parts) {
    // Empty part or contains non-digits
    if (part.length === 0 || !/^\d+$/.test(part)) {
      return false;
    }

    // Leading zeros check (e.g. "01", "002" are disallowed)
    if (part.length > 1 && part.startsWith("0")) {
      return false;
    }

    const num = Number(part);
    if (num < 0 || num > 255) {
      return false;
    }
  }

  return true;
}

/**
 * Validates whether an input string is a valid IPv6 address.
 *
 * Rules for valid IPv6:
 * - Standard: 8 groups of 1-4 hexadecimal characters separated by ':'
 * - Compressed: Zero-compression '::' allowed at most once
 * - Can represent IPv4-mapped IPv6 (e.g. "::ffff:192.168.1.1")
 */
export function isValidIPv6(ip: string): boolean {
  if (typeof ip !== "string") return false;
  const trimmed = ip.trim();

  // Cannot contain spaces or non-hex characters (except ':' and '.' for IPv4-mapped)
  if (!trimmed || /\s/.test(trimmed)) return false;

  // Check for IPv4-mapped IPv6 (e.g., ::ffff:192.168.0.1)
  const lastColonIndex = trimmed.lastIndexOf(":");
  if (lastColonIndex !== -1 && trimmed.slice(lastColonIndex + 1).includes(".")) {
    const ipv4Part = trimmed.slice(lastColonIndex + 1);
    const ipv6Part = trimmed.slice(0, lastColonIndex);
    if (!isValidIPv4(ipv4Part)) return false;
    // The IPv6 prefix must be valid when ending with a dummy 16-bit block
    return isValidIPv6(`${ipv6Part}:0000`);
  }

  // Check that "::" occurs at most once
  const doubleColonCount = (trimmed.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    return false;
  }

  if (doubleColonCount === 1) {
    // Cannot start or end with a single colon
    if (
      (trimmed.startsWith(":") && !trimmed.startsWith("::")) ||
      (trimmed.endsWith(":") && !trimmed.endsWith("::"))
    ) {
      return false;
    }

    const [left, right] = trimmed.split("::");
    const leftParts = left.length > 0 ? left.split(":") : [];
    const rightParts = right.length > 0 ? right.split(":") : [];

    const totalParts = leftParts.length + rightParts.length;
    // With '::' replacing at least one group of 0000, total explicit groups must be <= 7
    if (totalParts > 7) {
      return false;
    }

    const allParts = [...leftParts, ...rightParts];
    for (const part of allParts) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
        return false;
      }
    }

    return true;
  }

  // Without "::", must have exactly 8 groups of 1-4 hex characters
  const parts = trimmed.split(":");
  if (parts.length !== 8) {
    return false;
  }

  for (const part of parts) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates whether an input string is either a valid IPv4 or IPv6 address.
 *
 * @param input The IP address string to check
 * @returns boolean `true` if valid IPv4 or IPv6, `false` otherwise
 */
export function isValidIP(input: string): boolean {
  if (typeof input !== "string") return false;
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;

  return isValidIPv4(trimmed) || isValidIPv6(trimmed);
}

/**
 * Helper to inspect the IP version and detailed validation diagnostics.
 */
export function inspectIP(input: string): {
  isValid: boolean;
  version: "IPv4" | "IPv6" | null;
  reason?: string;
} {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return { isValid: false, version: null, reason: "Input is empty" };
  }

  if (isValidIPv4(trimmed)) {
    return { isValid: true, version: "IPv4" };
  }

  if (isValidIPv6(trimmed)) {
    return { isValid: true, version: "IPv6" };
  }

  // Diagnostic reason
  if (trimmed.includes(".") && !trimmed.includes(":")) {
    const parts = trimmed.split(".");
    if (parts.length !== 4) {
      return { isValid: false, version: null, reason: `IPv4 requires exactly 4 octets (found ${parts.length})` };
    }
    for (const p of parts) {
      if (!/^\d+$/.test(p)) {
        return { isValid: false, version: null, reason: `Octet '${p}' contains non-decimal characters` };
      }
      if (p.length > 1 && p.startsWith("0")) {
        return { isValid: false, version: null, reason: `Octet '${p}' has leading zero (not allowed in IPv4)` };
      }
      const n = Number(p);
      if (n > 255) {
        return { isValid: false, version: null, reason: `Octet '${p}' exceeds maximum 255 limit` };
      }
    }
  }

  if (trimmed.includes(":")) {
    if ((trimmed.match(/::/g) || []).length > 1) {
      return { isValid: false, version: null, reason: "IPv6 allows zero compression '::' at most once" };
    }
    return { isValid: false, version: null, reason: "Malformed IPv6 hextet segment or segment count" };
  }

  return { isValid: false, version: null, reason: "Unrecognized address format" };
}
