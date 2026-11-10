// Small building blocks for the committee registration form on /join.

import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClassName = "w-full rounded-xl border border-[var(--primary)]/15 bg-white px-4 py-3.5 text-[var(--dark)] outline-none transition-colors placeholder:text-[var(--gray)]/70 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
export const inputErrorClassName = "border-red-400 focus:border-red-500 focus:ring-red-200";
export const labelClassName = "mb-2 block text-sm font-semibold text-[var(--dark)]";
export const hintClassName = "mt-1.5 text-xs leading-5 text-[var(--gray)]";

// Text-style buttons such as "Clear selection", sized for a fingertip.
export const textButtonClassName = "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--primary)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40";

export function RequiredMark() {
  return <span aria-hidden="true" className="text-red-600"> *</span>;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

interface RadioGroupProps<T extends string> {
  name: string;
  legend: React.ReactNode;
  /** Options that share a `group` are listed together under that heading. */
  options: readonly { value: T; label: string; group?: string }[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Lay the options out in two columns from the `sm` breakpoint up. */
  twoColumns?: boolean;
  /** Optional questions can be cleared again once answered. */
  onClear?: () => void;
  /** An option that cannot be picked here, with the reason shown beside it. */
  unavailable?: { value: string; reason: string };
}

/** A single-choice question shown as tappable cards. */
export function RadioGroup<T extends string>({
  name, legend, options, value, onChange, required, hint, error, twoColumns, onClear, unavailable,
}: RadioGroupProps<T>) {
  const groups = [...new Set(options.map((option) => option.group || ""))];
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className={labelClassName}>
        {legend}
        {required && <RequiredMark />}
      </legend>
      {hint && <p id={`${name}-hint`} className="-mt-1 mb-2.5 text-xs leading-5 text-[var(--gray)]">{hint}</p>}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group || "all"}>
            {group && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gray)]">{group}</p>}
            <div className={cn("grid gap-2.5", twoColumns && "sm:grid-cols-2")}>
              {options.filter((option) => (option.group || "") === group).map((option) => {
                const selected = value === option.value;
                const disabled = !selected && unavailable?.value === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-[var(--primary)]/30",
                      disabled ? "cursor-not-allowed border-dashed border-[var(--primary)]/15 bg-[var(--light)] text-[var(--gray-dark)]" : "cursor-pointer",
                      disabled ? "" : selected
                        ? "border-[var(--primary)] bg-[var(--primary)]/5 font-semibold text-[var(--dark)]"
                        : error ? "border-red-300 text-[var(--dark)]" : "border-[var(--primary)]/15 text-[var(--dark)] hover:border-[var(--primary)]/40"
                    )}
                  >
                    <input
                      type="radio"
                      id={`${name}-${option.value}`}
                      name={name}
                      value={option.value}
                      checked={selected}
                      onChange={onChange}
                      required={required}
                      disabled={disabled}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                        selected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--primary)]/30 bg-white"
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <span>
                      {option.label}
                      {disabled && <span className="block text-xs">{unavailable?.reason}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {onClear && value && (
        <button type="button" onClick={onClear} className={cn(textButtonClassName, "mt-1")}>
          Clear selection
        </button>
      )}
      <FieldError id={name} message={error} />
    </fieldset>
  );
}

interface StepProgressProps {
  steps: readonly { id: string; title: string }[];
  current: number;
  /** Steps before the current one can be revisited. */
  onSelect: (index: number) => void;
}

export function StepProgress({ steps, current, onSelect }: StepProgressProps) {
  return (
    <nav aria-label="Application progress">
      <p className="text-sm font-semibold text-[var(--dark)]">
        Step {current + 1} of {steps.length}
        <span className="font-normal text-[var(--gray)]"> · {steps[current].title}</span>
      </p>
      <ol className="mt-3 flex items-start gap-2">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const marker = (
            <span
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                done && "bg-[var(--primary)] text-white",
                active && "bg-[var(--secondary)] text-[var(--dark)] ring-4 ring-[var(--secondary)]/25",
                !done && !active && "bg-[var(--primary)]/10 text-[var(--gray)]"
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
          );
          const title = (
            <span className={cn("mt-1.5 hidden text-xs leading-4 sm:block", active ? "font-semibold text-[var(--dark)]" : "text-[var(--gray)]")}>
              {step.title}
            </span>
          );
          return (
            <li key={step.id} aria-current={active ? "step" : undefined} className="flex min-w-0 flex-1 flex-col">
              <span className={cn("mb-2 h-1 rounded-full", done || active ? "bg-[var(--primary)]" : "bg-[var(--primary)]/15")} aria-hidden="true" />
              {done ? (
                <button type="button" onClick={() => onSelect(index)} className="flex flex-col items-start rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40">
                  {marker}
                  {title}
                  <span className="sr-only">Completed: go back to {step.title}</span>
                </button>
              ) : (
                <span className="flex flex-col items-start">
                  {marker}
                  {title}
                  <span className="sr-only sm:hidden">{step.title}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
