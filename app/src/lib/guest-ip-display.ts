type BuildGuestIpMetaInput = {
  ip: string;
  fingerprint?: string;
  userAgent?: string;
};

function trimIp(input: string) {
  const value = input.trim();
  if (!value || value === "anonymous") {
    return "";
  }

  if (value.startsWith("::ffff:")) {
    return value.replace("::ffff:", "");
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }

  const ipv4WithPort = /^(\d+\.\d+\.\d+\.\d+):(\d+)$/;
  const matchedV4 = value.match(ipv4WithPort);
  if (matchedV4) {
    return matchedV4[1];
  }

  return value;
}

function maskIpv4(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return `${octets[0]}.${octets[1]}`;
}

function maskIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  if (!normalized.includes(":")) {
    return null;
  }

  const segments = normalized.split(":").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  return `${segments[0]}:${segments[1]}`;
}

export function toGuestIpDisplay(ip: string) {
  const normalized = trimIp(ip);
  if (!normalized) {
    return null;
  }

  const maskedV4 = maskIpv4(normalized);
  if (maskedV4) {
    return maskedV4;
  }

  return maskIpv6(normalized);
}

export function toGuestIpLabel(userAgent?: string) {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua.includes("android") || ua.includes("iphone") || ua.includes("mobile")) {
    return "통피";
  }

  return "아이피";
}

export function buildGuestIpMeta({ ip, fingerprint, userAgent }: BuildGuestIpMetaInput) {
  let display = toGuestIpDisplay(ip);
  if (!display) {
    const fp = fingerprint?.trim() ?? "";
    if (fp) {
      display = `0.${fp.slice(0, 3)}`;
    }
  }
  if (!display) {
    return {
      guestIpDisplay: null,
      guestIpLabel: null,
    };
  }

  return {
    guestIpDisplay: display,
    guestIpLabel: toGuestIpLabel(userAgent),
  };
}
