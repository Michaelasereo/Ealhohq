import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as { noteContent?: unknown };
    if (
      body.noteContent === undefined ||
      typeof body.noteContent !== "object" ||
      body.noteContent === null
    ) {
      return NextResponse.json(
        { error: "noteContent object required" },
        { status: 400 },
      );
    }

    const session = await prisma.therapySession.findFirst({
      where: { id: sessionId, therapistId: therapist.id },
      include: { note: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const serialized = JSON.stringify(body.noteContent);

    await prisma.$transaction(async (tx) => {
      if (session.note) {
        await tx.therapySessionNote.update({
          where: { id: session.note.id },
          data: {
            noteContent: serialized,
            isEdited: true,
            editedAt: new Date(),
          },
        });
      } else {
        await tx.therapySessionNote.create({
          data: {
            sessionId: session.id,
            therapistId: therapist.id,
            noteType: "soap",
            noteContent: serialized,
            isEdited: true,
            editedAt: new Date(),
          },
        });
      }

      await tx.therapySession.update({
        where: { id: session.id },
        data: {
          notesGenerated: true,
          notesGeneratedAt: new Date(),
          generatedBy: "manual",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("manual note POST:", e);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 },
    );
  }
}
