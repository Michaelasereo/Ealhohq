import Anthropic from "@anthropic-ai/sdk";

import { INTAKE_PROMPT, SOAP_PROMPT } from "@/lib/prompts/therapy-notes";
import { prisma } from "@/lib/prisma/client";
import { getClientId } from "@/lib/utils/patient-display";

function stripJsonFence(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
  }
  return t;
}

export async function generateNoteAsync(
  sessionId: string,
  transcript: string,
  sessionNumber: number,
  options?: { isAnonymous?: boolean; bookingId?: string },
): Promise<void> {
  const noteType = sessionNumber === 1 ? "intake" : "soap";
  const base = process.env.FASTAPI_URL?.replace(/\/$/, "");

  if (base) {
    try {
      const response = await fetch(`${base}/api/sessions/generate-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          transcript,
          noteType,
          isAnonymous: options?.isAnonymous,
          bookingId: options?.bookingId,
        }),
      });
      if (response.ok) return;
    } catch {
      /* fall through */
    }
  }

  await generateNoteDirectly(sessionId, transcript, noteType, options);
}

export async function generateNoteDirectly(
  sessionId: string,
  transcript: string,
  noteType: "soap" | "intake",
  options?: { isAnonymous?: boolean; bookingId?: string },
): Promise<void> {
  const session = await prisma.therapySession.findUnique({
    where: { id: sessionId },
    include: { booking: true },
  });
  if (!session) return;

  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    console.error("ANTHROPIC_API_KEY missing; cannot generate note");
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { agoraTranscript: null },
    });
    return;
  }

  const client = new Anthropic({ apiKey: key });
  const systemPrompt = noteType === "intake" ? INTAKE_PROMPT : SOAP_PROMPT;
  const bookingId = options?.bookingId ?? session.booking.id;
  const isAnonymous =
    options?.isAnonymous ?? session.booking.isAnonymous ?? false;
  const clientIdLabel = getClientId(bookingId);

  const anonymousBlock = isAnonymous
    ? `

IMPORTANT: This is an anonymous session. Do not reference any personal identifiers. Use ONLY the client_id in all references. Do not include alias or any name whatsoever.`
    : "";

  const professionalBlock = session.booking.professionalType?.trim()
    ? `

Client professional background: ${session.booking.professionalType.trim()}`
    : "";

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: noteType === "intake" ? 4000 : 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Session number: ${session.sessionNumber}
Date: ${session.booking.date.toISOString().split("T")[0]}
Client ID: ${clientIdLabel}
Format: telehealth
${anonymousBlock}${professionalBlock}

Transcript:
${transcript}

Generate the clinical note now. Output valid JSON only.`,
        },
      ],
    });

    const block = response.content[0];
    const raw =
      block.type === "text" ? stripJsonFence(block.text) : "";
    const noteContent = JSON.parse(raw) as object;

    await prisma.therapySessionNote.upsert({
      where: { sessionId },
      create: {
        sessionId,
        therapistId: session.therapistId,
        noteType,
        noteContent: JSON.stringify(noteContent),
      },
      update: {
        noteType,
        noteContent: JSON.stringify(noteContent),
        isEdited: false,
        editedAt: null,
      },
    });

    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        agoraTranscript: null,
        notesGenerated: true,
        notesGeneratedAt: new Date(),
        generatedBy: "claude",
      },
    });
  } catch (e) {
    console.error("Direct note generation failed:", e);
    await prisma.therapySession.update({
      where: { id: sessionId },
      data: { agoraTranscript: null },
    });
  }
}
