import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      include: { therapist: true, note: true },
    });

    if (!session || session.therapist.profileId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    if (!session.notesGenerated || !session.note) {
      return NextResponse.json({
        success: true,
        data: { ready: false, sessionId: session.id },
      });
    }

    let noteContent: unknown;
    try {
      noteContent = JSON.parse(session.note.noteContent);
    } catch {
      noteContent = null;
    }

    return NextResponse.json({
      success: true,
      data: {
        ready: true,
        sessionId: session.id,
        noteType: session.note.noteType,
        noteContent,
        generatedAt: session.notesGeneratedAt?.toISOString() ?? null,
        isEdited: session.note.isEdited,
      },
    });
  } catch (e) {
    console.error("Therapist note GET:", e);
    return NextResponse.json(
      { success: false, error: "Failed to fetch note" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      include: { therapist: true, note: true },
    });

    if (!session || session.therapist.profileId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as { noteContent?: unknown };
    if (body.noteContent === undefined) {
      return NextResponse.json(
        { success: false, error: "noteContent required" },
        { status: 400 },
      );
    }

    if (!session.note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 },
      );
    }

    await prisma.therapySessionNote.update({
      where: { id: session.note.id },
      data: {
        noteContent: JSON.stringify(body.noteContent),
        isEdited: true,
        editedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Therapist note PUT:", e);
    return NextResponse.json(
      { success: false, error: "Failed to update note" },
      { status: 500 },
    );
  }
}
