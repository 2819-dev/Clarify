import { NextResponse } from "next/server";
import {
  formatTotpSecretForDisplay,
  generateTotpSecret,
  totpQrDataUrl,
  totpUri,
} from "@/lib/totp";
import { getCurrentUser, setPendingTotpSecret } from "@/lib/user-auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    if (user.totp_enabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled." },
        { status: 400 },
      );
    }
    const secret = generateTotpSecret();
    await setPendingTotpSecret(user.id, secret);
    const otpauthUrl = totpUri(secret, user.email);
    const qrDataUrl = await totpQrDataUrl(secret, user.email);
    return NextResponse.json({
      secret,
      secretDisplay: formatTotpSecretForDisplay(secret),
      otpauthUrl,
      qrDataUrl,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start two-factor setup.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
