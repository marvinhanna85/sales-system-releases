const SWEDEN_COUNTRY_CODE = "46";

function stripExtension(value) {
  return String(value ?? "")
    .replace(/\b(?:ext|extension|ank|anknytning)\.?\s*[:#]?\s*\d{1,6}\b/gi, "")
    .replace(/\b(?:x|#)\s*\d{1,6}\b/gi, "");
}

function extractPhoneCandidates(text) {
  const source = stripExtension(text);
  return source.match(/(?:\+|00)?\d[\d\s()./-]{5,}\d/g) || [];
}

function normalizePhoneNumber(value, options = {}) {
  const originalNumber = String(value ?? "").trim();
  const defaultCountryCode = String(options.defaultCountryCode || SWEDEN_COUNTRY_CODE).replace(/\D/g, "") || SWEDEN_COUNTRY_CODE;
  const candidate = extractPhoneCandidates(originalNumber)[0] || originalNumber;
  let cleaned = stripExtension(candidate).trim();

  if (!cleaned) {
    return {
      originalNumber,
      normalizedNumber: "",
      displayNumber: originalNumber
    };
  }

  cleaned = cleaned
    .replace(/[^\d+]/g, "")
    .replace(/^\++/, "+")
    .replace(/^00/, "+");

  let digits = cleaned.replace(/\D/g, "");
  if (!digits) {
    return {
      originalNumber,
      normalizedNumber: "",
      displayNumber: originalNumber
    };
  }

  if (cleaned.startsWith("+")) {
    if (digits.startsWith(`${defaultCountryCode}0`)) {
      digits = `${defaultCountryCode}${digits.slice(defaultCountryCode.length + 1)}`;
    }
  } else if (digits.startsWith(`${defaultCountryCode}0`)) {
    digits = `${defaultCountryCode}${digits.slice(defaultCountryCode.length + 1)}`;
  } else if (digits.startsWith("0") && digits.length >= 7) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  } else if (defaultCountryCode === SWEDEN_COUNTRY_CODE && /^7\d{8}$/.test(digits)) {
    digits = `${defaultCountryCode}${digits}`;
  }

  return {
    originalNumber,
    normalizedNumber: digits,
    displayNumber: formatDisplayNumber(digits, originalNumber)
  };
}

function normalizePhone(value, options = {}) {
  return normalizePhoneNumber(value, options).normalizedNumber;
}

function formatDisplayNumber(normalizedNumber, fallback = "") {
  const digits = String(normalizedNumber || "").replace(/\D/g, "");
  if (!digits) {
    return String(fallback || "");
  }

  if (digits.startsWith(SWEDEN_COUNTRY_CODE) && digits.length >= 10) {
    const national = digits.slice(SWEDEN_COUNTRY_CODE.length);
    if (national.startsWith("7") && national.length === 9) {
      return `+46 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
    }
    return `+46 ${national}`;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

function phonesMatch(left, right) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const tailLength = Math.min(9, a.length, b.length);
  return tailLength >= 7 && a.slice(-tailLength) === b.slice(-tailLength);
}

function textMentionsPhone(text, phone) {
  const target = normalizePhone(phone);
  if (!target) {
    return false;
  }
  return extractPhoneCandidates(text).some((candidate) => phonesMatch(candidate, target));
}

module.exports = {
  extractPhoneCandidates,
  formatDisplayNumber,
  normalizePhone,
  normalizePhoneNumber,
  phonesMatch,
  textMentionsPhone
};
