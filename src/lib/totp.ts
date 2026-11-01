import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Clarify";

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function buildTotp(secretBase32: string, label: string) {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function totpUri(secretBase32: string, accountEmail: string): string {
  return buildTotp(secretBase32, accountEmail).toString();
}

export function verifyTotpCode(
  secretBase32: string,
  code: string,
  accountEmail = "user",
): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const delta = buildTotp(secretBase32, accountEmail).validate({
    token: cleaned,
    window: 1,
  });
  return delta !== null;
}

export async function totpQrDataUrl(
  secretBase32: string,
  accountEmail: string,
): Promise<string> {
  return QRCode.toDataURL(totpUri(secretBase32, accountEmail), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}

export function formatTotpSecretForDisplay(secretBase32: string): string {
  return secretBase32.replace(/(.{4})/g, "$1 ").trim();
}
