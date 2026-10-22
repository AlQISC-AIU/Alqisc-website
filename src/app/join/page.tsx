"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CalendarClock, Camera, CheckCircle2, Crown, Loader2, Lock, Send, Users } from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { Button } from "@/components/ui/button";
import { notifications } from "@/components/ui/notification-provider";
import { cn } from "@/lib/utils";
import {
  DEPARTMENT_POSITIONS,
  EXCO_POSITIONS,
  getApplicationErrors,
  isDepartmentPosition,
  isLeadershipPosition,
  MAX_ORIGINAL_PHOTO_BYTES,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_DIMENSION,
  normalizeApplicationInput,
  PHOTO_TYPES,
  POSITION_LABELS,
  STUDENT_EMAIL_DOMAIN,
  type ApplicationErrors,
  type ApplicationField,
  type CommitteePosition,
  type PublicRegistrationInfo,
} from "@/lib/committee-registration";

const emptyForm = {
  full_name: "",
  student_email: "",
  personal_email: "",
  phone: "",
  student_id: "",
  programme: "",
  year_of_study: "",
  position: "" as CommitteePosition | "",
  current_member_id: "",
  first_choice: "",
  second_choice: "",
  motivation: "",
  experience: "",
};

type FormField = ApplicationField | "photo";

// Order in which invalid fields are focused on submit.
const FIELD_ORDER: FormField[] = [
  "full_name", "student_email", "personal_email", "phone", "student_id", "programme", "year_of_study",
  "photo", "position", "current_member_id", "first_choice", "second_choice", "motivation", "experience",
];

const yearOptions = ["Foundation", "Year 1", "Year 2", "Year 3", "Year 4", "Postgraduate"];

function formatDeadline(deadline: string) {
  const date = new Date(`${deadline}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
}

/** Downscales large photos to a JPEG so uploads stay small; falls back to the original. */
async function preparePhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_PHOTO_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export default function JoinPage() {
  const [info, setInfo] = useState<PublicRegistrationInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<ApplicationErrors>({});

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/committee-registration", { cache: "no-store" });
        if (!response.ok) throw new Error();
        setInfo((await response.json()) as PublicRegistrationInfo);
      } catch {
        setLoadError("We couldn't load the registration form. Please refresh the page.");
      }
    })();
  }, []);

  const errors = useMemo(() => {
    const fieldErrors: Partial<Record<FormField, string>> = {
      ...getApplicationErrors(normalizeApplicationInput(formData)),
      ...serverErrors,
    };
    const photoMessage = photoError || (photo ? "" : "Upload a clear photo of yourself.");
    if (photoMessage) fieldErrors.photo = photoMessage;
    return fieldErrors;
  }, [formData, serverErrors, photo, photoError]);

  const errorFor = (field: FormField) => (showAllErrors || touched[field] ? errors[field] : undefined);

  const markTouched = (field: FormField) => setTouched((current) => (current[field] ? current : { ...current, [field]: true }));

  const fieldProps = (field: ApplicationField) => ({
    id: field,
    name: field,
    value: formData[field],
    onChange: handleChange,
    onBlur: () => markTouched(field),
    "aria-invalid": errorFor(field) ? true : undefined,
    "aria-describedby": errorFor(field) ? `${field}-error` : undefined,
    className: cn(inputClassName, errorFor(field) && "border-red-400 focus:border-red-500 focus:ring-red-200"),
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const field = event.target.name as ApplicationField;
    setFormData((current) => ({ ...current, [field]: event.target.value }));
    // A server-side message is only relevant until the field is edited again.
    setServerErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (event.target.type === "radio" || event.target.tagName === "SELECT") markTouched(field);
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    markTouched("photo");
    if (!file) return;
    if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_ORIGINAL_PHOTO_BYTES) {
      setPhotoError("Your photo must be 20 MB or smaller.");
      return;
    }
    const prepared = await preparePhoto(file);
    if (prepared.size > MAX_PHOTO_BYTES) {
      setPhotoError("This photo is too large to upload. Please choose a smaller one.");
      return;
    }
    setPhotoError("");
    setPhoto(prepared);
  };

  const focusFirstError = (fieldErrors: Partial<Record<FormField, string>>) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (!first) return;
    const element = document.getElementById(first === "position" ? `position-${formData.position || "group"}` : first)
      || document.querySelector<HTMLElement>(`[name="${first}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setShowAllErrors(true);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      notifications.error("Please correct the highlighted fields.", "Application incomplete");
      return;
    }
    if (!photo) return;

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      for (const [key, value] of Object.entries(formData)) payload.append(key, value);
      payload.append("photo", photo);
      payload.append("website", "");
      const response = await fetch("/api/committee-registration", { method: "POST", body: payload });
      const body = await response.json().catch(() => null) as { error?: string; errors?: ApplicationErrors } | null;
      if (!response.ok) {
        if (body?.errors) {
          setServerErrors(body.errors);
          focusFirstError(body.errors);
        }
        throw new Error(body?.error || "Your application could not be submitted.");
      }
      setSubmitted(true);
      setFormData(emptyForm);
      setPhoto(null);
      setTouched({});
      setShowAllErrors(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Your application could not be submitted.", "Application not sent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const position = formData.position || null;
  const openPositions = info?.config.open_positions ?? [];
  const positionGroups = [
    { title: "Executive Committee", positions: EXCO_POSITIONS.filter((item) => openPositions.includes(item)) },
    {
      title: "Department roles",
      // Department roles need at least one department to apply to.
      positions: info?.departments.length ? DEPARTMENT_POSITIONS.filter((item) => openPositions.includes(item)) : [],
    },
  ].filter((group) => group.positions.length > 0);

  const positionHint = (item: CommitteePosition) => {
    if (isLeadershipPosition(item)) return "Current committee members only";
    if (isDepartmentPosition(item)) return "Open to all students · choose a department";
    return "Open to all students";
  };
  const inputClassName = "w-full rounded-xl border border-[var(--primary)]/15 bg-white px-4 py-3.5 text-[var(--dark)] outline-none transition-colors placeholder:text-[var(--gray)]/70 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
  const labelClassName = "mb-2 block text-sm font-semibold text-[var(--dark)]";
  const hintClassName = "mt-1.5 text-xs leading-5 text-[var(--gray)]";

  return (
    <>
      <InnerPageHero
        image="/images/committee1.jpg"
        title="Join the AL-QISC Committee"
        description="Serve the community, grow as a leader, and help shape the club's programmes for the coming term."
        // The committee stands in the lower half of this portrait photo; keep
        // their faces above the curved divider.
        imagePosition="center 62%"
        curveColor="var(--light)"
      />

      <main className="bg-[var(--light)] pb-20 pt-10 md:pb-24 md:pt-12">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {!info && !loadError && (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" /></div>
            )}

            {loadError && (
              <div className="rounded-2xl border border-red-100 bg-white p-8 text-center text-[var(--gray)] shadow-sm">{loadError}</div>
            )}

            {info && !info.accepting && (
              <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-8 text-center shadow-sm sm:p-12">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Lock className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-heading text-2xl font-bold text-[var(--dark)] sm:text-3xl">Registration is currently closed</h2>
                <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--gray)]">
                  Committee registration opens once a year. Follow our announcements to find out when the next intake begins.
                </p>
                <Link href="/contact" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]">
                  Contact us
                </Link>
              </div>
            )}

            {info?.accepting && submitted && (
              <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-8 text-center shadow-sm sm:p-12">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-heading text-2xl font-bold text-[var(--dark)] sm:text-3xl">Application received</h2>
                <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--gray)]">
                  JazakAllahu khairan for applying. The committee will review your application and contact you by email or phone.
                </p>
                <Button type="button" variant="outline" className="mt-7" onClick={() => setSubmitted(false)}>
                  Submit another application
                </Button>
              </div>
            )}

            {info?.accepting && !submitted && (
              <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  Committee registration {info.config.term}
                </p>
                <h2 className="font-heading text-3xl font-bold text-[var(--dark)]">Apply to join</h2>
                {info.config.intro && (
                  <p className="mt-3 whitespace-pre-line leading-7 text-[var(--gray)]">{info.config.intro}</p>
                )}
                {info.config.deadline && (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--secondary)]/15 px-4 py-1.5 text-sm font-medium text-[var(--dark)]">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    Applications close on {formatDeadline(info.config.deadline)}
                  </p>
                )}

                <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-8">
                  <fieldset className="space-y-5">
                    <legend className="mb-4 font-heading text-lg font-bold text-[var(--dark)]">Your details</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="full_name" className={labelClassName}>Full name <span aria-hidden="true">*</span></label>
                        <input {...fieldProps("full_name")} maxLength={100} autoComplete="name" placeholder="As shown on your student card" />
                        <FieldError id="full_name" message={errorFor("full_name")} />
                      </div>
                      <div>
                        <label htmlFor="student_email" className={labelClassName}>Student email <span aria-hidden="true">*</span></label>
                        <input {...fieldProps("student_email")} type="email" inputMode="email" maxLength={254} autoComplete="off" placeholder={`yourname@${STUDENT_EMAIL_DOMAIN}`} />
                        {errorFor("student_email")
                          ? <FieldError id="student_email" message={errorFor("student_email")} />
                          : <p className={hintClassName}>Must end in @{STUDENT_EMAIL_DOMAIN}</p>}
                      </div>
                      <div>
                        <label htmlFor="personal_email" className={labelClassName}>Personal email <span aria-hidden="true">*</span></label>
                        <input {...fieldProps("personal_email")} type="email" inputMode="email" maxLength={254} autoComplete="email" placeholder="you@gmail.com" />
                        {errorFor("personal_email")
                          ? <FieldError id="personal_email" message={errorFor("personal_email")} />
                          : <p className={hintClassName}>We&apos;ll use this if your student email stops working.</p>}
                      </div>
                      <div>
                        <label htmlFor="phone" className={labelClassName}>Phone / WhatsApp <span aria-hidden="true">*</span></label>
                        <input {...fieldProps("phone")} type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="+60 12-345 6789" />
                        <FieldError id="phone" message={errorFor("phone")} />
                      </div>
                      <div>
                        <label htmlFor="student_id" className={labelClassName}>Student ID <span aria-hidden="true">*</span></label>
                        <input {...fieldProps("student_id")} maxLength={20} autoComplete="off" placeholder="e.g. AIU21011234" />
                        <FieldError id="student_id" message={errorFor("student_id")} />
                      </div>
                      <div>
                        <label htmlFor="programme" className={labelClassName}>Programme <span aria-hidden="true">*</span></label>
                        <input {...fieldProps("programme")} maxLength={150} placeholder="e.g. Bachelor of Computer Science" />
                        <FieldError id="programme" message={errorFor("programme")} />
                      </div>
                      <div>
                        <label htmlFor="year_of_study" className={labelClassName}>Year of study <span aria-hidden="true">*</span></label>
                        <select {...fieldProps("year_of_study")}>
                          <option value="" disabled>Select your year</option>
                          {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                        <FieldError id="year_of_study" message={errorFor("year_of_study")} />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="mb-4 font-heading text-lg font-bold text-[var(--dark)]">Your photo</legend>
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <div className={cn(
                        "relative flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-[var(--light)]",
                        errorFor("photo") ? "border-red-400" : "border-[var(--primary)]/30"
                      )}>
                        {photoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                          <img src={photoPreview} alt="Your photo preview" className="h-full w-full object-cover" />
                        ) : (
                          <Camera className="h-8 w-8 text-[var(--primary)]/40" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <label htmlFor="photo" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2">
                          {photo ? "Change photo" : "Upload photo"}
                          <input
                            id="photo"
                            type="file"
                            accept={PHOTO_TYPES.join(",")}
                            onChange={(event) => void handlePhotoChange(event)}
                            aria-invalid={errorFor("photo") ? true : undefined}
                            aria-describedby={errorFor("photo") ? "photo-error" : undefined}
                            className="sr-only"
                          />
                        </label>
                        <p className={hintClassName}>
                          Required. A clear, recent photo of your face. JPG, PNG, or WebP. If you are selected, it may appear on the website.
                        </p>
                        <FieldError id="photo" message={errorFor("photo")} />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset aria-describedby={errorFor("position") ? "position-error" : undefined}>
                    <legend className="mb-4 font-heading text-lg font-bold text-[var(--dark)]">Position <span aria-hidden="true">*</span></legend>
                    <div className="space-y-5">
                      {positionGroups.map((group, groupIndex) => (
                        <div key={group.title}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gray)]">{group.title}</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {group.positions.map((item, index) => {
                              const Icon = isDepartmentPosition(item) ? Users : Crown;
                              const selected = position === item;
                              return (
                                <label
                                  key={item}
                                  className={cn(
                                    "flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[var(--primary)]/30",
                                    selected
                                      ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/15"
                                      : errorFor("position") ? "border-red-300" : "border-[var(--primary)]/15 hover:border-[var(--primary)]/40"
                                  )}
                                >
                                  <input
                                    type="radio"
                                    // The first card doubles as the focus target when no position is chosen.
                                    id={groupIndex === 0 && index === 0 && !position ? "position-group" : `position-${item}`}
                                    name="position"
                                    value={item}
                                    checked={selected}
                                    onChange={handleChange}
                                    className="sr-only"
                                  />
                                  <Icon className={cn("h-5 w-5", selected ? "text-[var(--primary)]" : "text-[var(--gray)]")} aria-hidden="true" />
                                  <span className="text-sm font-semibold text-[var(--dark)]">{POSITION_LABELS[item]}</span>
                                  <span className="text-xs leading-5 text-[var(--gray)]">{positionHint(item)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <FieldError id="position" message={errorFor("position")} />

                    {position && isLeadershipPosition(position) && (
                      <div className="mt-5 rounded-xl border border-[var(--secondary)]/40 bg-[var(--secondary)]/10 p-4 sm:p-5">
                        <label htmlFor="current_member_id" className={labelClassName}>Select your name from the current committee <span aria-hidden="true">*</span></label>
                        <select {...fieldProps("current_member_id")}>
                          <option value="" disabled>Choose your name</option>
                          {info.eligible_members.map((member) => (
                            <option key={member.id} value={member.id}>{member.name}{member.role ? ` (${member.role})` : ""}</option>
                          ))}
                        </select>
                        <FieldError id="current_member_id" message={errorFor("current_member_id")} />
                        <p className="mt-2 text-xs leading-5 text-[var(--gray)]">
                          The {POSITION_LABELS[position]} position is reserved for current committee members. Your membership will be verified by the committee.
                        </p>
                      </div>
                    )}

                    {position && isDepartmentPosition(position) && (
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="first_choice" className={labelClassName}>Department (first choice) <span aria-hidden="true">*</span></label>
                          <select {...fieldProps("first_choice")}>
                            <option value="" disabled>Select a department</option>
                            {info.departments.map((department) => (
                              <option key={department.slug} value={department.slug}>{department.full_name}</option>
                            ))}
                          </select>
                          <FieldError id="first_choice" message={errorFor("first_choice")} />
                        </div>
                        <div>
                          <label htmlFor="second_choice" className={labelClassName}>Second choice (optional)</label>
                          <select {...fieldProps("second_choice")}>
                            <option value="">No second choice</option>
                            {info.departments.filter((department) => department.slug !== formData.first_choice).map((department) => (
                              <option key={department.slug} value={department.slug}>{department.full_name}</option>
                            ))}
                          </select>
                          <FieldError id="second_choice" message={errorFor("second_choice")} />
                        </div>
                      </div>
                    )}
                  </fieldset>

                  <fieldset className="space-y-5">
                    <legend className="mb-4 font-heading text-lg font-bold text-[var(--dark)]">About you</legend>
                    <div>
                      <label htmlFor="motivation" className={labelClassName}>Why do you want to join? <span aria-hidden="true">*</span></label>
                      <textarea
                        {...fieldProps("motivation")}
                        maxLength={3000}
                        rows={5}
                        className={cn(fieldProps("motivation").className, "resize-y")}
                        placeholder={position && !isDepartmentPosition(position) ? "Share your vision for the club and what you would do in this role" : "Tell us what motivates you and what you hope to contribute"}
                      />
                      {errorFor("motivation")
                        ? <FieldError id="motivation" message={errorFor("motivation")} />
                        : <p className={hintClassName}>At least 50 characters · {formData.motivation.trim().length}/3000</p>}
                    </div>
                    <div>
                      <label htmlFor="experience" className={labelClassName}>Relevant experience or skills (optional)</label>
                      <textarea
                        {...fieldProps("experience")}
                        maxLength={3000}
                        rows={4}
                        className={cn(fieldProps("experience").className, "resize-y")}
                        placeholder="Previous roles, volunteering, design, media, event management..."
                      />
                      <FieldError id="experience" message={errorFor("experience")} />
                    </div>
                  </fieldset>

                  <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    {isSubmitting ? "Submitting..." : "Submit application"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
