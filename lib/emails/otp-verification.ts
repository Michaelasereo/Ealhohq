export interface OTPEmailParams {
  recipientEmail: string;
  recipientName: string;
  otpCode: string;
  type: "signup" | "login" | "password_reset";
  expiresInMinutes: number;
}

const SUBJECTS: Record<OTPEmailParams["type"], string> = {
  signup: "Your Ealho verification code",
  login: "Your Ealho sign in code",
  password_reset: "Reset your Ealho password",
};

const HEADINGS: Record<OTPEmailParams["type"], string> = {
  signup: "Verify your email address",
  login: "Sign in to Ealho",
  password_reset: "Reset your password",
};

export function buildOTPEmail(params: OTPEmailParams) {
  const { recipientName, otpCode, type, expiresInMinutes } = params;
  const firstName = recipientName.trim().split(/\s+/)[0] || "there";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${SUBJECTS[type]}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;
          overflow:hidden;max-width:480px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:#292612;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#d6eae1;font-size:24px;
                font-weight:700;letter-spacing:-0.5px;">
                ealho
              </h1>
              <p style="margin:4px 0 0;color:#b8ccc4;font-size:13px;">
                Nigeria's first therapy platform for clinicians
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 8px;color:#666;font-size:15px;">
                Hi ${firstName},
              </p>
              <h2 style="margin:0 0 24px;color:#1a1a1a;font-size:22px;
                font-weight:700;">
                ${HEADINGS[type]}
              </h2>
              <p style="margin:0 0 32px;color:#555;font-size:15px;
                line-height:1.6;">
                Use this code to ${type === "signup" ? "complete your registration" : type === "login" ? "sign in to your account" : "reset your password"}.
              </p>

              <!-- OTP Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <div style="background:#f4f3ef;border:2px solid #292612;
                      border-radius:12px;padding:24px 40px;display:inline-block;">
                      <p style="margin:0 0 8px;color:#666;font-size:13px;
                        text-align:center;text-transform:uppercase;
                        letter-spacing:2px;">
                        Your verification code
                      </p>
                      <p style="margin:0;color:#292612;font-size:48px;
                        font-weight:800;letter-spacing:12px;
                        text-align:center;font-family:monospace;">
                        ${otpCode}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#888;font-size:13px;
                text-align:center;">
                This code expires in ${expiresInMinutes} minutes.
              </p>
              <p style="margin:0;color:#888;font-size:13px;
                text-align:center;">
                Never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:24px 32px;
              border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;
                text-align:center;">
                If you did not request this code, ignore this email.<br>
                © 2026 Ealho Technologies · 
                <a href="https://ealho.com" 
                  style="color:#292612;text-decoration:none;">
                  ealho.com
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Hi ${firstName},

${HEADINGS[type]}

Your code: ${otpCode}

This code expires in ${expiresInMinutes} minutes.
Never share this code with anyone.

© 2026 Ealho Technologies
  `.trim();

  return {
    subject: SUBJECTS[type],
    html,
    text,
  };
}
