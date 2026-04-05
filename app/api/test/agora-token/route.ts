import { RtcRole, RtcTokenBuilder } from "agora-token";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json()) as {
      channelName?: string;
      uid?: number;
    };
    const channelName =
      typeof body.channelName === "string" && body.channelName.trim()
        ? body.channelName.trim()
        : "test-channel-001";
    const uid =
      typeof body.uid === "number" && Number.isFinite(body.uid)
        ? Math.floor(body.uid)
        : 1;

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID?.trim() ?? "";
    const appCertificate = process.env.AGORA_APP_CERTIFICATE?.trim() ?? "";

    if (!appId) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_AGORA_APP_ID is not set" },
        { status: 500 },
      );
    }

    if (!appCertificate || appCertificate === "your_certificate") {
      return NextResponse.json({
        success: true,
        data: { token: "", appId, channelName, uid },
      });
    }

    const tokenExpireSec = 7200;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      tokenExpireSec,
      tokenExpireSec,
    );

    return NextResponse.json({
      success: true,
      data: { token, appId, channelName, uid },
    });
  } catch (e) {
    console.error("test/agora-token:", e);
    return NextResponse.json(
      { success: false, error: "Token generation failed" },
      { status: 500 },
    );
  }
}
