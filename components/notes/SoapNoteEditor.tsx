"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { NoteType } from "./SoapNoteDisplay";

const textareaClass = cn(
  "min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
);

export type SoapNoteEditorProps = {
  note: Record<string, unknown>;
  noteType: NoteType;
  sessionId: string;
  onSave: () => void;
  onCancel: () => void;
  /** Persist via manual SOAP endpoint (create/update + marks session notes ready). */
  useManualPersist?: boolean;
};

function cloneNote(n: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(n)) as Record<string, unknown>;
}

function deepSet(
  root: Record<string, unknown>,
  dotPath: string,
  value: unknown,
): Record<string, unknown> {
  const next = cloneNote(root);
  const keys = dotPath.split(".").filter(Boolean);
  let cur: Record<string, unknown> = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const branch = cur[k];
    if (
      typeof branch !== "object" ||
      branch === null ||
      Array.isArray(branch)
    ) {
      cur[k] = {};
    } else {
      cur[k] = { ...(branch as Record<string, unknown>) };
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value as object;
  return next;
}

function labelize(path: string): string {
  const tail = path.split(".").pop() ?? path;
  return tail.replaceAll("_", " ");
}

function FieldNode({
  path,
  node,
  onPatch,
}: {
  path: string;
  node: unknown;
  onPatch: (dotPath: string, value: unknown) => void;
}) {
  if (node === null || node === undefined) {
    return (
      <textarea
        className={textareaClass}
        rows={2}
        value=""
        placeholder="Not reported"
        onChange={(e) => onPatch(path, e.target.value || "Not reported")}
      />
    );
  }

  if (typeof node === "string" || typeof node === "number") {
    return (
      <textarea
        className={textareaClass}
        rows={2}
        value={String(node)}
        onChange={(e) => onPatch(path, e.target.value)}
      />
    );
  }

  if (typeof node === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={node}
          onChange={(e) => onPatch(path, e.target.checked)}
          className="size-4 rounded border-input"
        />
        {labelize(path)}
      </label>
    );
  }

  if (Array.isArray(node)) {
    const primitiveOnly =
      node.length === 0 ||
      node.every(
        (x) => x === null || ["string", "number", "boolean"].includes(typeof x),
      );
    if (primitiveOnly) {
      return (
        <textarea
          className={cn(textareaClass, "font-mono")}
          rows={Math.max(3, node.length + 1)}
          value={node.map(String).join("\n")}
          onChange={(e) => {
            const lines = e.target.value
              .split("\n")
              .map((s) => s.trimEnd());
            onPatch(path, lines);
          }}
        />
      );
    }
    return (
      <textarea
        className={cn(textareaClass, "font-mono text-xs")}
        rows={8}
        value={JSON.stringify(node, null, 2)}
        onChange={(e) => {
          try {
            onPatch(path, JSON.parse(e.target.value) as unknown);
          } catch {
            /* keep typing */
          }
        }}
      />
    );
  }

  if (typeof node === "object") {
    const entries = Object.entries(node as Record<string, unknown>);
    return (
      <div className="space-y-4 border-l-2 border-border pl-3">
        {entries.map(([k, v]) => {
          const childPath = path ? `${path}.${k}` : k;
          return (
            <div key={childPath} className="space-y-1">
              <p className="text-xs font-medium capitalize text-muted-foreground">
                {labelize(k)}
              </p>
              <FieldNode path={childPath} node={v} onPatch={onPatch} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <textarea
      className={textareaClass}
      rows={2}
      value={String(node)}
      readOnly
    />
  );
}

async function putNote(
  sessionId: string,
  noteContent: Record<string, unknown>,
): Promise<boolean> {
  const res = await fetch(`/api/therapist/sessions/${sessionId}/note`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noteContent }),
  });
  return res.ok;
}

async function postManualNote(
  sessionId: string,
  noteContent: Record<string, unknown>,
): Promise<boolean> {
  const res = await fetch(
    `/api/therapist/sessions/${sessionId}/note/manual`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteContent }),
    },
  );
  return res.ok;
}

export function SoapNoteEditor({
  note,
  noteType: _noteType,
  sessionId,
  onSave,
  onCancel,
  useManualPersist = false,
}: SoapNoteEditorProps) {
  void _noteType;
  const [draft, setDraft] = useState(() => cloneNote(note));
  const [saving, setSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const patch = useCallback((dotPath: string, value: unknown) => {
    setDraft((prev) => deepSet(prev, dotPath, value));
  }, []);

  const persist = useMemo(
    () => (useManualPersist ? postManualNote : putNote),
    [useManualPersist],
  );

  const save = useCallback(
    async (silent: boolean) => {
      if (!silent) setSaving(true);
      else setAutosaveState("saving");
      const ok = await persist(sessionId, draftRef.current);
      if (!silent) setSaving(false);
      if (ok) {
        if (silent) {
          setAutosaveState("saved");
          setTimeout(() => setAutosaveState("idle"), 2000);
        } else {
          onSave();
        }
      } else if (silent) {
        setAutosaveState("error");
      }
    },
    [sessionId, onSave, persist],
  );

  useEffect(() => {
    if (useManualPersist) return;
    const id = setInterval(() => {
      void save(true);
    }, 30_000);
    return () => clearInterval(id);
  }, [save, useManualPersist]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {useManualPersist
            ? "Save when you’re done — manual notes are not auto-saved."
            : autosaveState === "saving"
              ? "Autosaving…"
              : autosaveState === "saved"
                ? "All changes saved"
                : autosaveState === "error"
                  ? "Autosave failed — check connection"
                  : "Edits autosave every 30 seconds"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <FieldNode path="" node={draft} onPatch={patch} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          className="min-h-12 flex-1"
          disabled={saving}
          onClick={() => void save(false)}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 flex-1"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
