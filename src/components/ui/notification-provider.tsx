"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";

export type NotificationType = "success" | "warning" | "error" | "info";

interface NotificationInput {
  type: NotificationType;
  message: string;
  title?: string;
}

interface NotificationItem extends NotificationInput {
  id: string;
}

const NOTIFICATION_EVENT = "alqisc:notification";

function notificationId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function showNotification(input: NotificationInput) {
  if (typeof window === "undefined" || !input.message.trim()) return;
  window.dispatchEvent(new CustomEvent<NotificationInput>(NOTIFICATION_EVENT, { detail: input }));
}

export const notifications = {
  success: (message: string, title?: string) => showNotification({ type: "success", message, title }),
  warning: (message: string, title?: string) => showNotification({ type: "warning", message, title }),
  error: (message: string, title?: string) => showNotification({ type: "error", message, title }),
  info: (message: string, title?: string) => showNotification({ type: "info", message, title }),
};

const dialogStyles = {
  success: {
    Icon: Check,
    title: "Completed successfully",
    circle: "bg-emerald-500 text-white shadow-[0_14px_35px_rgba(16,185,129,0.35)]",
    halo: "border-emerald-500/10 bg-emerald-500/5",
  },
  warning: {
    Icon: AlertTriangle,
    title: "Please review",
    circle: "bg-[var(--secondary)] text-[var(--dark)] shadow-[0_14px_35px_rgba(251,183,0,0.32)]",
    halo: "border-[var(--secondary)]/15 bg-[var(--secondary)]/5",
  },
  error: {
    Icon: XCircle,
    title: "Action could not be completed",
    circle: "bg-red-600 text-white shadow-[0_14px_35px_rgba(220,38,38,0.32)]",
    halo: "border-red-500/10 bg-red-500/5",
  },
  info: {
    Icon: Info,
    title: "Information",
    circle: "bg-[var(--primary)] text-white shadow-[0_14px_35px_rgba(44,113,142,0.32)]",
    halo: "border-[var(--primary)]/10 bg-[var(--primary)]/5",
  },
} as const;

interface MessageDialogProps {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}

function MessageDialog({ item, onDismiss }: MessageDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const style = dialogStyles[item.type];
  const { Icon } = style;
  const titleId = `message-title-${item.id}`;
  const descriptionId = `message-description-${item.id}`;

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss(item.id);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item.id, onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-5 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDismiss(item.id);
      }}
    >
      <div
        ref={dialogRef}
        role={item.type === "error" || item.type === "warning" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-[440px] text-center"
      >
        <div className="relative mt-14 rounded-[24px] bg-white px-6 pb-10 pt-24 shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:px-10 sm:pb-12 sm:pt-28">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <span className={`absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border ${style.halo}`} />
            <span className={`absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border ${style.halo}`} />
            <span className={`relative flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32 ${style.circle}`}>
              <Icon className="h-14 w-14 stroke-[2.5] sm:h-16 sm:w-16" />
            </span>
          </div>
          <h2 id={titleId} className="text-base font-medium leading-6 text-[var(--gray)] sm:text-lg">
            {item.title || style.title}
          </h2>
          <p id={descriptionId} className="mt-3 break-words font-heading text-xl font-bold leading-8 text-[var(--dark)] sm:text-2xl sm:leading-9">
            {item.message}
          </p>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Close dialog"
          className="mx-auto mt-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 text-white transition-colors hover:border-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-4 focus:ring-offset-black/60"
        >
          <X className="h-8 w-8 stroke-[1.6]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activeItem = items[0];
  const isOpen = Boolean(activeItem);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const input = (event as CustomEvent<NotificationInput>).detail;
      if (!input?.message?.trim()) return;

      setItems((current) => {
        const duplicateExists = current.some(
          (item) => item.type === input.type && item.message === input.message,
        );
        if (duplicateExists) return current;
        return [...current, { ...input, id: notificationId() }].slice(0, 4);
      });
    };

    const originalAlert = window.alert;
    window.alert = (message?: unknown) => {
      showNotification({ type: "warning", message: String(message ?? "Please check the information and try again.") });
    };
    window.addEventListener(NOTIFICATION_EVENT, handleNotification);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
    };
  }, []);

  return (
    <>
      {children}
      {activeItem ? <MessageDialog item={activeItem} onDismiss={dismiss} /> : null}
    </>
  );
}
