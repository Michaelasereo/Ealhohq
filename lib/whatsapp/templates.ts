const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://ealho.com";

export const templates = {
  bookingConfirmed: (params: {
    patientName: string;
    therapistName: string;
    date: string;
    time: string;
    duration: number;
    sessionLink: string;
    isAnonymous?: boolean;
    packageInfo?: {
      totalSessions: number;
      remainingSessions: number;
    };
  }) => `Hi ${params.isAnonymous ? "there" : params.patientName}! ✅

Your Ealho Therapy session is confirmed.

${params.therapistName}
📅 Date: ${params.date}
🕐 Time: ${params.time} WAT
⏱ Duration: ${params.duration} minutes

Join your session here:
${params.sessionLink}

${params.packageInfo ? `\nYour ${params.packageInfo.totalSessions}-session package is active. You have ${params.packageInfo.remainingSessions} session${params.packageInfo.remainingSessions === 1 ? "" : "s"} remaining.\n` : ""}

This link is unique to you. Please do not share it.

Reply HELP if you need assistance.`,

  sessionReminder24h: (params: {
    patientName: string;
    therapistName: string;
    date: string;
    time: string;
    sessionLink: string;
    isAnonymous?: boolean;
  }) => `Hi ${params.isAnonymous ? "there" : params.patientName}! 👋

Reminder: You have a therapy session tomorrow.

${params.therapistName}
📅 ${params.date}
🕐 ${params.time} WAT

Join here: ${params.sessionLink}

Reply HELP to reschedule.`,

  sessionReminder1h: (params: {
    patientName: string;
    therapistName: string;
    time: string;
    sessionLink: string;
    isAnonymous?: boolean;
  }) => `Hi ${params.isAnonymous ? "there" : params.patientName}! ⏰

Your session starts in 1 hour.

${params.therapistName}
🕐 ${params.time} WAT

Join here: ${params.sessionLink}

See you soon! 💙`,

  sessionCancelled: (params: {
    patientName: string;
    therapistName: string;
    date: string;
    time: string;
    isAnonymous?: boolean;
  }) => `Hi ${params.isAnonymous ? "there" : params.patientName}.

Your session on ${params.date} at ${params.time} WAT with ${params.therapistName} has been cancelled.

To rebook, visit: ${appUrl()}/book

If you have questions, reply to this message.`,

  therapistSessionBooked: (params: {
    therapistGreetingName: string;
    patientDisplay: string;
    date: string;
    time: string;
    sessionType: string;
    isAnonymous?: boolean;
    /** Why they’re booking (guest flow / intake selection) */
    bookingReason?: string | null;
    /** Client’s professional background (healthcare role, etc.) */
    professionalType?: string | null;
  }) => {
    const reason = params.bookingReason?.trim();
    const pro = params.professionalType?.trim();
    const reasonLine = reason
      ? `📝 Reason: ${reason.length > 420 ? `${reason.slice(0, 419)}…` : reason}`
      : "";
    const proLine = pro
      ? `🏥 Client background: ${pro.length > 280 ? `${pro.slice(0, 279)}…` : pro}`
      : "";

    return `Hi ${params.therapistGreetingName}! 📅

New session booked.

${params.isAnonymous ? `🔒 Anonymous — alias: ${params.patientDisplay}` : `👤 ${params.patientDisplay}`}
${reasonLine ? `${reasonLine}\n` : ""}${proLine ? `${proLine}\n` : ""}📅 ${params.date}
🕐 ${params.time} WAT
📋 ${params.sessionType === "intake" ? "Intake Assessment" : "Follow-up Session"}

View your schedule:
${appUrl()}/therapist/dashboard`;
  },

  inviteSetup: (params: {
    name: string;
    code: string;
    setupLink: string;
    role: "therapist" | "patient";
  }) => `Hi ${params.name.split(" ")[0]}! 👋

You've been invited to join Ealho Therapy as a ${params.role}.

Your verification code: *${params.code}*

Set up your account here:
${params.setupLink}

Code expires in 48 hours.`,

  creditsAdded: (params: {
    patientName: string;
    amount: number;
    balance: number;
  }) => `Hi ${params.patientName}! 💳

${params.amount} credit${params.amount > 1 ? "s" : ""} have been added to your Ealho account.

New balance: ${params.balance} credits

Book a session: ${appUrl()}/book`,
};
