import { classifyContextNote, type ContextNoteKind } from "@/lib/context-notes";

const iconClass = "mt-0.5 size-4 shrink-0 text-slate-500";

export function ContextNoteIcon({ kind }: { kind: ContextNoteKind }) {
  switch (kind) {
    case "altitude":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M10 2.5 3 16h14L10 2.5Zm0 3.2 4.6 9.3H5.4L10 5.7Z" />
        </svg>
      );
    case "travel":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M8.5 3a1 1 0 0 0-.8.4L2.4 9.7a1 1 0 0 0 .8 1.6h3.1l1.2 5.2a1 1 0 0 0 1.94 0l1.2-5.2h3.1a1 1 0 0 0 .8-1.6l-5.3-6.3A1 1 0 0 0 11.5 3h-3Z" />
        </svg>
      );
    case "climate":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M10 2a1 1 0 0 1 1 1v1.05a5.5 5.5 0 0 1 3.45 9.45 1 1 0 1 1-1.4-1.4A3.5 3.5 0 1 0 10 6.5V5a1 1 0 0 1 1-1Zm-6.5 7a1 1 0 0 1 1 1 5.5 5.5 0 0 0 9.45 3.45 1 1 0 1 1 1.4 1.4A7.5 7.5 0 0 1 2.5 10a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "heat":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M10 2a1 1 0 0 1 .894.553l1.618 3.236 3.236 1.618a1 1 0 0 1 0 1.788l-3.236 1.618-1.618 3.236a1 1 0 0 1-1.788 0l-1.618-3.236-3.236-1.618a1 1 0 0 1 0-1.788l3.236-1.618 1.618-3.236A1 1 0 0 1 10 2Z" />
        </svg>
      );
    case "tournament":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm-.75 2.5a.75.75 0 0 0-1.5 0v4.19l2.72 2.72a.75.75 0 1 1-1.06 1.06l-2.94-2.94A.75.75 0 0 1 9.25 10V6Zm0 8.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        </svg>
      );
    case "air":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M3 8.5a1 1 0 0 1 1-1h8.5a2.5 2.5 0 1 0 0-5H11a1 1 0 1 1 0-2h1.5a4.5 4.5 0 1 1 0 9H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h10a2 2 0 1 0 0-4H12a1 1 0 1 1 0-2h2a4 4 0 1 1 0 8H4a1 1 0 0 1-1-1Z" />
        </svg>
      );
    case "venue":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M10 2 3 7v11h4v-6h6v6h4V7l-7-5Zm0 2.2L15 8.5V16h-2v-6H7v6H5V8.5L10 4.2Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={iconClass}>
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4a.75.75 0 0 0-1.5 0v4.06a2.75 2.75 0 1 0 1.5 0V6Zm0 8.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        </svg>
      );
  }
}

export function ContextNoteRow({ text }: { text: string }) {
  const kind = classifyContextNote(text);
  return (
    <li className="flex gap-2.5 text-sm leading-relaxed text-slate-800">
      <ContextNoteIcon kind={kind} />
      <span>{text}</span>
    </li>
  );
}
