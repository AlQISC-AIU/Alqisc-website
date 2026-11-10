"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, ArrowRight, CalendarClock, Camera, CheckCircle2, ExternalLink, FileText, Loader2, Lock, Paperclip, Send, ShieldCheck,
} from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { Button } from "@/components/ui/button";
import { notifications } from "@/components/ui/notification-provider";
import {
  FieldError,
  hintClassName,
  inputClassName,
  inputErrorClassName,
  labelClassName,
  RadioGroup,
  RequiredMark,
  StepProgress,
  textButtonClassName,
} from "@/components/join/form-controls";
import { cn } from "@/lib/utils";
import {
  DEPARTMENT_POSITION_LABELS,
  detectPhotoType,
  DOCUMENT_TYPES,
  documentProblem,
  EDUCATION_LEVEL_LABELS,
  EDUCATION_LEVELS,
  formatDeadline,
  formatFileSize,
  getApplicationErrors,
  isDepartment,
  isPastDeadline,
  JOINED_PROGRAMS_LABELS,
  JOINED_PROGRAMS_OPTIONS,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  needsWorkSamples,
  normalizeApplicationInput,
  openAppliedPositions,
  openDepartmentPositions,
  OTHER_CLUB_COMMITMENT_LABELS,
  OTHER_CLUB_COMMITMENTS,
  PHOTO_REQUIRED,
  PHOTO_TYPES,
  photoProblem,
  POSITION_LABELS,
  positionLabel,
  STUDENT_EMAIL_DOMAIN,
  WORK_SAMPLES_URL,
  YEARS_OF_STUDY,
  YES_NO_LABELS,
  YES_NO_OPTIONS,
  type ApplicationErrors,
  type ApplicationField,
  type PhotoType,
  type PublicRegistrationInfo,
} from "@/lib/committee-registration";

const emptyForm: Record<ApplicationField, string> = {
  student_email: "",
  full_name: "",
  student_id: "",
  education_level: "",
  year_of_study: "",
  programme: "",
  phone: "",
  nationality: "",
  about_alqisc: "",
  joined_programs: "",
  programs_joined: "",
  experience: "",
  applied_position: "",
  department_position: "",
  motivation: "",
  accept_other_position: "",
  other_club_commitment: "",
};

type FormField = ApplicationField | "photo" | "document";

// The sections of the committee's official form, one per step. Fields are
// listed in the order they appear, which is also the order errors are focused.
const STEPS: readonly { id: string; title: string; description: string; fields: readonly FormField[] }[] = [
  {
    id: "details",
    title: "Applicant details",
    description: "Tell us who you are and how to reach you.",
    fields: ["student_email", "full_name", "student_id", "phone", "nationality", "education_level", "year_of_study", "programme", "photo"],
  },
  {
    id: "about",
    title: "Getting to know you",
    description: "Please answer these questions sincerely.",
    fields: ["about_alqisc", "joined_programs", "programs_joined", "experience"],
  },
  {
    id: "position",
    title: "Line of leadership",
    description: "Choose the one position you would like to apply for.",
    fields: ["applied_position", "department_position"],
  },
  {
    id: "commitment",
    title: "Motivation and commitment",
    description: "Tell us why you are a good fit and how much you can commit.",
    fields: ["motivation", "accept_other_position", "other_club_commitment", "document"],
  },
];

// From the official form: "General Requirements for all Candidates".
const GENERAL_REQUIREMENTS = [
  "Had experience in leadership.",
  "Someone who can activate and develop the club from various aspects.",
  "Always carry out tasks with full responsibility and dedication without deviating and being careless.",
  "Be honest and loyal to the organization without abusing authority.",
  "Possess fundamental Islamic knowledge and are eager to learn more for prosperity of the Club.",
  "Who can consistently generate new ideas to advance the club's progress.",
  "Understand gender limitations in Islam and respectful towards the sisters.",
  "Someone who practice the 5A's core values in daily life.",
];

const options = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }));

function stepOf(field: FormField) {
  return STEPS.findIndex((step) => step.fields.includes(field));
}

function focusField(field: FormField) {
  const element = document.getElementById(field) || document.querySelector<HTMLElement>(`[name="${field}"]`);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  element?.focus({ preventScroll: true });
}

/** The first bytes of a file, enough to tell what kind of file it really is. */
async function fileHead(file: File) {
  return new Uint8Array(await file.slice(0, 16).arrayBuffer());
}

/** Sends the photo straight to Storage, at the one path the server allowed. */
async function uploadPhoto(path: string, file: File, contentType: PhotoType, onProgress: (percent: number) => void) {
  const [{ ref, uploadBytesResumable }, { getFirebaseStorage }] = await Promise.all([
    import("firebase/storage"),
    import("@/lib/firebase/app"),
  ]);
  const storage = getFirebaseStorage();
  // Give up after a short while instead of the default ten minutes, so a lost
  // connection is reported while the applicant is still looking at the form.
  storage.maxUploadRetryTime = 20_000;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType });
  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => onProgress(snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0),
      reject,
      () => resolve(),
    );
  });
}

type Rejection = { error?: string; errors?: ApplicationErrors; code?: string } | null;

export default function JoinPage() {
  const [info, setInfo] = useState<PublicRegistrationInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  // Never shown to people; see the hidden field at the end of the form.
  const [website, setWebsite] = useState("");
  const [step, setStep] = useState(0);
  // "" when idle, otherwise what the form is doing, e.g. "Uploading photo... 40%".
  const [progress, setProgress] = useState("");
  // Set once an application has been stored; shown on the confirmation screen.
  const [submitted, setSubmitted] = useState<{ email: string; position: string; workSamples: boolean } | null>(null);
  const [photo, setPhoto] = useState<{ file: File; type: PhotoType } | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  // A rejected file is simply not attached, so these are notices, not blockers.
  const [photoNotice, setPhotoNotice] = useState("");
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
  const [documentNotice, setDocumentNotice] = useState("");
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});
  // Steps the applicant has tried to leave; all of their errors are shown.
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [serverErrors, setServerErrors] = useState<ApplicationErrors>({});
  const stepHeading = useRef<HTMLHeadingElement>(null);
  // What to focus once a newly shown step has rendered.
  const pendingFocus = useRef<FormField | "heading" | null>(null);
  // The photo already sitting in Storage, so a retry does not upload it again.
  const uploadedPhoto = useRef<{ file: File; uploadId: string } | null>(null);
  const isSubmitting = progress !== "";

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photo.file);
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

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "heading") {
      // Jump straight there: the step's content has just been swapped, and an
      // animated scroll would move the questions under the applicant's pointer.
      stepHeading.current?.scrollIntoView({ block: "start" });
      stepHeading.current?.focus({ preventScroll: true });
    } else if (target) {
      focusField(target);
    }
  }, [step]);

  const errors = useMemo(() => {
    const fieldErrors: Partial<Record<FormField, string>> = {
      ...getApplicationErrors(normalizeApplicationInput(formData)),
      ...serverErrors,
    };
    if (PHOTO_REQUIRED && !photo) fieldErrors.photo = "Upload your formal picture.";
    return fieldErrors;
  }, [formData, serverErrors, photo]);

  const errorFor = (field: FormField) => (attempted[stepOf(field)] || touched[field] ? errors[field] : undefined);
  const stepErrors = (index: number) => STEPS[index].fields.filter((field) => errors[field]);

  const markTouched = (field: FormField) => setTouched((current) => (current[field] ? current : { ...current, [field]: true }));

  const setField = (field: ApplicationField, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
      // Each department opens its own positions, and a Top Committee position
      // has none, so an earlier answer never carries over to a new choice.
      ...(field === "applied_position" ? { department_position: "" } : {}),
    }));
    // A server-side message is only relevant until the field is edited again.
    setServerErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const field = event.target.name as ApplicationField;
    setField(field, event.target.value);
    if (event.target.type === "radio" || event.target.tagName === "SELECT") markTouched(field);
  }

  const fieldProps = (field: ApplicationField, required = false) => ({
    id: field,
    name: field,
    value: formData[field],
    onChange: handleChange,
    onBlur: () => markTouched(field),
    required,
    "aria-invalid": errorFor(field) ? true : undefined,
    "aria-describedby": errorFor(field) ? `${field}-error` : undefined,
    className: cn(inputClassName, errorFor(field) && inputErrorClassName),
  });

  const radioProps = (field: ApplicationField) => ({
    name: field,
    value: formData[field],
    onChange: handleChange,
    error: errorFor(field),
  });

  // Both files are checked the moment they are chosen, by size and by what the
  // file really contains, so a problem is reported before anything is uploaded.
  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    const head = await fileHead(file);
    const problem = photoProblem(file, head);
    const type = detectPhotoType(head);
    if (problem || !type) {
      setPhotoNotice(`That file was not attached. ${problem || "This file is not a JPG, PNG, or WebP image."}`);
      return;
    }
    setPhotoNotice("");
    setPhoto({ file, type });
  };

  const handleDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    const problem = documentProblem(file, await fileHead(file));
    if (problem) {
      setDocumentNotice(`That file was not attached. ${problem}`);
      return;
    }
    setDocumentNotice("");
    setSupportingDocument(file);
  };

  const goToStep = (index: number, focus: FormField | "heading") => {
    if (index === step) {
      if (focus !== "heading") focusField(focus);
      return;
    }
    pendingFocus.current = focus;
    setStep(index);
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setPhoto(null);
    setPhotoNotice("");
    setSupportingDocument(null);
    setDocumentNotice("");
    setTouched({});
    setAttempted({});
    setServerErrors({});
    setStep(0);
    uploadedPhoto.current = null;
  };

  /** Shows what the server refused, on the step it belongs to, and returns the message. */
  const explainRejection = (body: Rejection) => {
    const rejected = body?.errors ? STEPS.flatMap((item) => item.fields).find((field) => body.errors?.[field as ApplicationField]) : undefined;
    if (body?.errors && rejected) {
      setServerErrors(body.errors);
      setAttempted((current) => ({ ...current, [stepOf(rejected)]: true }));
      goToStep(stepOf(rejected), rejected);
    }
    if (body?.code === "photo") {
      // The upload is no longer usable; the next attempt sends the photo again.
      uploadedPhoto.current = null;
      setPhotoNotice(body.error || "");
    }
    return body?.error || "Your application could not be submitted.";
  };

  /** Uploads the photo, unless this same photo is already uploaded. Returns its upload id. */
  const sendPhoto = async (chosen: { file: File; type: PhotoType }) => {
    if (uploadedPhoto.current?.file === chosen.file) return uploadedPhoto.current.uploadId;

    setProgress("Preparing your photo...");
    const response = await fetch("/api/committee-registration/photo-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, website, photo_size: chosen.file.size, photo_type: chosen.type }),
    });
    const body = await response.json().catch(() => null) as (Rejection & { upload_id?: string; path?: string }) | null;
    if (!response.ok || !body?.upload_id || !body.path) throw new Error(explainRejection(body));

    setProgress("Uploading your photo... 0%");
    try {
      await uploadPhoto(body.path, chosen.file, chosen.type, (percent) => setProgress(`Uploading your photo... ${percent}%`));
    } catch {
      throw new Error("Your photo could not be uploaded, so your application has not been sent. Check your connection and try again.");
    }
    uploadedPhoto.current = { file: chosen.file, uploadId: body.upload_id };
    return body.upload_id;
  };

  const submitApplication = async () => {
    setProgress("Submitting...");
    try {
      const payload = new FormData();
      for (const [key, value] of Object.entries(formData)) payload.append(key, value);
      payload.append("website", website);
      if (photo) payload.append("photo_upload_id", await sendPhoto(photo));
      if (supportingDocument) payload.append("document", supportingDocument);

      setProgress("Submitting...");
      const response = await fetch("/api/committee-registration", { method: "POST", body: payload });
      const body = await response.json().catch(() => null) as Rejection;
      if (!response.ok) throw new Error(explainRejection(body));

      setSubmitted({
        email: formData.student_email.trim().toLowerCase(),
        position: positionLabel(formData.applied_position, formData.department_position),
        workSamples: needsWorkSamples(formData),
      });
      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Your application could not be submitted.", "Application not sent");
    } finally {
      setProgress("");
    }
  };

  /** "Next" on the earlier steps, "Submit application" on the last one. */
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setAttempted((current) => ({ ...current, [step]: true }));
    const invalid = stepErrors(step);
    if (invalid.length > 0) {
      focusField(invalid[0]);
      return;
    }
    if (step < STEPS.length - 1) {
      goToStep(step + 1, "heading");
      return;
    }
    // Every step was checked on the way here; this catches anything changed since.
    const firstInvalidStep = STEPS.findIndex((_, index) => stepErrors(index).length > 0);
    if (firstInvalidStep !== -1) {
      setAttempted((current) => ({ ...current, [firstInvalidStep]: true }));
      goToStep(firstInvalidStep, stepErrors(firstInvalidStep)[0]);
      notifications.error("Please correct the highlighted fields.", "Application incomplete");
      return;
    }
    void submitApplication();
  };

  const isBachelor = formData.education_level === "bachelor";
  const isLastStep = step === STEPS.length - 1;
  const currentStep = STEPS[step];
  const invalidCount = attempted[step] ? stepErrors(step).length : 0;
  const deadline = info ? formatDeadline(info.config.deadline) : "";
  // Only positions the admin has opened are offered.
  const positionOptions = info
    ? openAppliedPositions(info.config).map((position) => ({
      value: position,
      label: POSITION_LABELS[position],
      group: isDepartment(position) ? "Departments" : "Top Committee",
    }))
    : [];
  const departmentPositions = info ? openDepartmentPositions(info.config, formData.applied_position) : [];
  const fileButtonClassName = "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2";
  const removeButtonClassName = cn(textButtonClassName, "text-[var(--gray)] hover:text-red-600");

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
              <div className="flex justify-center py-16" role="status">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" aria-hidden="true" />
                <span className="sr-only">Loading the registration form</span>
              </div>
            )}

            {loadError && (
              <div role="alert" className="rounded-2xl border border-red-100 bg-white p-8 text-center text-[var(--gray)] shadow-sm">{loadError}</div>
            )}

            {info && !info.accepting && !submitted && (
              <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-8 text-center shadow-sm sm:p-12">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Lock className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-heading text-2xl font-bold text-[var(--dark)] sm:text-3xl">Registration is currently closed</h2>
                <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--gray)]">
                  {info.config.is_open && deadline && isPastDeadline(info.config.deadline)
                    ? `Applications for the ${info.config.term} committee closed on ${deadline}. Follow our announcements to find out when the next intake begins.`
                    : "Committee registration opens once a year. Follow our announcements to find out when the next intake begins."}
                </p>
                <Link href="/contact" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]">
                  Contact us
                </Link>
              </div>
            )}

            {submitted && (
              <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-8 text-center shadow-sm sm:p-12">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-heading text-2xl font-bold text-[var(--dark)] sm:text-3xl" tabIndex={-1}>Thank you for your application</h2>
                <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--dark)]" role="status">
                  Your application for <strong>{submitted.position}</strong> has been received and saved under{" "}
                  <strong className="break-all">{submitted.email}</strong>. You do not need to submit it again.
                </p>
                <p className="mx-auto mt-3 max-w-lg leading-7 text-[var(--gray)]">
                  JazakAllahu khairan for applying. Shortlisted applicants will be contacted via email to join the interview session.
                </p>
                {submitted.workSamples && (
                  <p className="mx-auto mt-5 max-w-lg rounded-xl border border-[var(--secondary)]/40 bg-[var(--secondary)]/10 p-4 text-sm leading-6 text-[var(--dark)]">
                    You applied for Multimedia or ICT. If you have not done so yet, please add your design or relevant proof to the{" "}
                    <a href={WORK_SAMPLES_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--primary)] underline underline-offset-2">
                      work samples folder
                    </a>.
                  </p>
                )}
                <figure className="mx-auto mt-8 max-w-xl border-t border-[var(--primary)]/10 pt-7">
                  <figcaption className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Final message</figcaption>
                  <p className="mt-3 leading-7 text-[var(--dark)]">
                    A leader who has faith in Allah SWT and His Messenger will never betray the responsibility he bears.
                  </p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gray)]">Surah Al-Anfal, verse 27</p>
                  {/*
                    The verse as printed in the committee's form. The form's text could not be
                    copied reliably, so this was typed out and compared with the printed page.
                    The committee should confirm it against a mushaf before it goes live.
                  */}
                  <p lang="ar" dir="rtl" className="mt-3 text-2xl leading-[2.2] text-[var(--dark)]">
                    يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تَخُونُوا۟ ٱللَّهَ وَٱلرَّسُولَ وَتَخُونُوٓا۟ أَمَـٰنَـٰتِكُمْ وَأَنتُمْ تَعْلَمُونَ
                  </p>
                  <blockquote className="mt-3 text-sm leading-6 text-[var(--gray)]">
                    &ldquo;O believer, do not betray Allah &amp; the Messenger (Muhammad) and (also) do not betray the trust entrusted to you, while you know.&rdquo;
                  </blockquote>
                </figure>
              </div>
            )}

            {info?.accepting && !submitted && (
              <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  New committee recruitment {info.config.term}
                </p>
                <h2 className="font-heading text-3xl font-bold text-[var(--dark)]">Apply to join</h2>
                {info.config.intro && (
                  <p className="mt-3 whitespace-pre-line leading-7 text-[var(--gray)]">{info.config.intro}</p>
                )}
                {deadline && (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--secondary)]/15 px-4 py-1.5 text-sm font-medium text-[var(--dark)]">
                    <CalendarClock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    Applications close on {deadline}
                  </p>
                )}

                {step === 0 && (
                  <details open className="group mt-6 rounded-xl border border-[var(--primary)]/15 bg-[var(--light)] p-4 sm:p-5">
                    <summary className="cursor-pointer text-sm font-bold text-[var(--dark)] marker:text-[var(--primary)]">
                      General requirements for all candidates
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-[var(--gray)]">
                      Before you apply, please ensure that you have read the handbook and understand the responsibilities and
                      requirements of the position you would like to apply for.
                    </p>
                    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-[var(--dark)] marker:font-semibold marker:text-[var(--primary)]">
                      {GENERAL_REQUIREMENTS.map((requirement) => <li key={requirement}>{requirement}</li>)}
                    </ol>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[var(--dark)]">
                      You are strongly encouraged to apply if you fulfil these qualifications for the available positions.
                    </p>
                  </details>
                )}

                <div className="mt-8">
                  <StepProgress steps={STEPS} current={step} onSelect={(index) => goToStep(index, "heading")} />
                </div>

                <form onSubmit={handleSubmit} noValidate className="mt-8" aria-labelledby="step-heading">
                  <h3 id="step-heading" ref={stepHeading} tabIndex={-1} className="scroll-mt-28 font-heading text-xl font-bold text-[var(--dark)] outline-none">
                    {currentStep.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--gray)]">
                    {currentStep.description} Questions marked <span className="font-semibold text-red-600">*</span> are required.
                  </p>

                  <div className="mt-6 space-y-6">
                    {step === 0 && (
                      <>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label htmlFor="student_email" className={labelClassName}>Student email<RequiredMark /></label>
                            <input {...fieldProps("student_email", true)} type="email" inputMode="email" maxLength={254} autoComplete="email" placeholder={`yourname@${STUDENT_EMAIL_DOMAIN}`} />
                            {errorFor("student_email")
                              ? <FieldError id="student_email" message={errorFor("student_email")} />
                              : <p className={hintClassName}>Please use your student email, ending in @{STUDENT_EMAIL_DOMAIN}.</p>}
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor="full_name" className={labelClassName}>Full name (all uppercase)<RequiredMark /></label>
                            {/* Shown in capitals as it is typed; it is stored in capitals too. */}
                            <input {...fieldProps("full_name", true)} maxLength={100} autoComplete="name" autoCapitalize="characters" placeholder="e.g. Abdullah bin Ahmad" className={cn(fieldProps("full_name").className, "uppercase placeholder:normal-case")} />
                            <FieldError id="full_name" message={errorFor("full_name")} />
                          </div>
                          <div>
                            <label htmlFor="student_id" className={labelClassName}>Student ID<RequiredMark /></label>
                            <input {...fieldProps("student_id", true)} maxLength={20} autoComplete="off" placeholder="e.g. AIU21011234" />
                            <FieldError id="student_id" message={errorFor("student_id")} />
                          </div>
                          <div>
                            <label htmlFor="phone" className={labelClassName}>Contact number<RequiredMark /></label>
                            <input {...fieldProps("phone", true)} type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="e.g. +60 11-2233 5566" />
                            <FieldError id="phone" message={errorFor("phone")} />
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor="nationality" className={labelClassName}>Nationality<RequiredMark /></label>
                            <input {...fieldProps("nationality", true)} maxLength={60} autoComplete="country-name" placeholder="e.g. Malaysian" />
                            <FieldError id="nationality" message={errorFor("nationality")} />
                          </div>
                        </div>

                        <RadioGroup
                          {...radioProps("education_level")}
                          legend="Level of education"
                          required
                          options={options(EDUCATION_LEVELS, EDUCATION_LEVEL_LABELS)}
                        />

                        {isBachelor && (
                          <div className="grid gap-5 rounded-xl border border-[var(--secondary)]/40 bg-[var(--secondary)]/10 p-4 sm:grid-cols-2 sm:p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gray)] sm:col-span-2">For Bachelor students only</p>
                            <div>
                              <label htmlFor="year_of_study" className={labelClassName}>Year of study</label>
                              <select {...fieldProps("year_of_study")}>
                                <option value="">Select your year</option>
                                {YEARS_OF_STUDY.map((year) => <option key={year} value={year}>{year}</option>)}
                              </select>
                              <FieldError id="year_of_study" message={errorFor("year_of_study")} />
                            </div>
                            <div>
                              <label htmlFor="programme" className={labelClassName}>School, programme &amp; cohort</label>
                              <input {...fieldProps("programme")} maxLength={150} placeholder="e.g. SBSS & BBAM & Cohort 5" />
                              <FieldError id="programme" message={errorFor("programme")} />
                            </div>
                          </div>
                        )}

                        <div>
                          <p className={labelClassName}>Formal picture{PHOTO_REQUIRED && <RequiredMark />}</p>
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
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                                <label htmlFor="photo" className={fileButtonClassName}>
                                  {photo ? "Change photo" : "Upload photo"}
                                  <input
                                    id="photo"
                                    type="file"
                                    accept={PHOTO_TYPES.join(",")}
                                    onChange={(event) => void handlePhotoChange(event)}
                                    aria-invalid={errorFor("photo") ? true : undefined}
                                    aria-describedby="photo-hint"
                                    className="sr-only"
                                  />
                                </label>
                                {photo && (
                                  <button type="button" onClick={() => setPhoto(null)} className={removeButtonClassName}>Remove photo</button>
                                )}
                              </div>
                              <p id="photo-hint" className={hintClassName}>
                                {photo ? `${photo.file.name} · ${formatFileSize(photo.file.size)}. ` : ""}
                                Your formal picture, with a white background recommended. JPG, PNG, or WebP, up to {formatFileSize(MAX_PHOTO_BYTES)}.
                                It is saved with your application, so there is no need to rename the file.
                              </p>
                              <FieldError id="photo" message={errorFor("photo")} />
                              {!errorFor("photo") && <div role="status"><FieldError id="photo-notice" message={photoNotice} /></div>}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {step === 1 && (
                      <>
                        <div>
                          <label htmlFor="about_alqisc" className={labelClassName}>What do you know about Al-Qur&apos;an and Islamic Club (Al-Qisc)?<RequiredMark /></label>
                          <textarea {...fieldProps("about_alqisc", true)} maxLength={3000} rows={5} className={cn(fieldProps("about_alqisc").className, "resize-y")} />
                          <FieldError id="about_alqisc" message={errorFor("about_alqisc")} />
                        </div>

                        <RadioGroup
                          {...radioProps("joined_programs")}
                          legend="Have you ever joined any of our programs?"
                          required
                          twoColumns
                          options={options(JOINED_PROGRAMS_OPTIONS, JOINED_PROGRAMS_LABELS)}
                        />

                        {formData.joined_programs === "yes" && (
                          <div>
                            <label htmlFor="programs_joined" className={labelClassName}>Which Al-Qisc programs have you joined before?</label>
                            <textarea {...fieldProps("programs_joined")} maxLength={3000} rows={3} className={cn(fieldProps("programs_joined").className, "resize-y")} />
                            <FieldError id="programs_joined" message={errorFor("programs_joined")} />
                          </div>
                        )}

                        <div>
                          <label htmlFor="experience" className={labelClassName}>
                            Have you ever experienced being a committee member of any club or association before?
                          </label>
                          <textarea
                            {...fieldProps("experience")}
                            maxLength={3000}
                            rows={5}
                            aria-describedby={errorFor("experience") ? "experience-error" : "experience-hint"}
                            className={cn(fieldProps("experience").className, "resize-y")}
                          />
                          {errorFor("experience")
                            ? <FieldError id="experience" message={errorFor("experience")} />
                            : <p id="experience-hint" className={hintClassName}>If yes, what was your role and what responsibilities did you contribute to the club or association? Leave this blank if you have not.</p>}
                        </div>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <RadioGroup
                          {...radioProps("applied_position")}
                          legend="Position you are applying for"
                          hint="You can apply for one position only. Only positions that are open for applications are listed."
                          required
                          twoColumns
                          options={positionOptions}
                        />

                        {isDepartment(formData.applied_position) && (
                          <RadioGroup
                            {...radioProps("department_position")}
                            legend="Department position"
                            hint={`The positions open in ${POSITION_LABELS[formData.applied_position]}.`}
                            required
                            twoColumns
                            options={options(departmentPositions, DEPARTMENT_POSITION_LABELS)}
                          />
                        )}

                        {needsWorkSamples(formData) && (
                          <div className="rounded-xl border border-[var(--secondary)]/40 bg-[var(--secondary)]/10 p-4 sm:p-5">
                            <p className="text-sm font-bold text-[var(--dark)]">For those who apply for Multimedia and ICT department only</p>
                            <p className="mt-1.5 text-sm leading-6 text-[var(--dark)]">
                              Please provide your design or relevant proof in the shared folder below.
                            </p>
                            <a href={WORK_SAMPLES_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]">
                              Open the work samples folder
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">(opens Google Drive in a new tab)</span>
                            </a>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-[var(--gray)]">
                              <li>The folder is on Google Drive and is separate from this form, so adding files there does not submit your application.</li>
                              <li>Start each file name with your full name and student ID, so we can match it to your application.</li>
                              <li>Add your own files only, and please do not open, move or remove anyone else&apos;s.</li>
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <div>
                          <label htmlFor="motivation" className={labelClassName}>What makes you suitable and motivates you to take this position?<RequiredMark /></label>
                          <textarea {...fieldProps("motivation", true)} maxLength={3000} rows={6} className={cn(fieldProps("motivation").className, "resize-y")} />
                          <FieldError id="motivation" message={errorFor("motivation")} />
                        </div>

                        <RadioGroup
                          {...radioProps("accept_other_position")}
                          legend="If you are selected for another position other than what you apply for, will you agree?"
                          required
                          twoColumns
                          options={options(YES_NO_OPTIONS, YES_NO_LABELS)}
                        />

                        <RadioGroup
                          {...radioProps("other_club_commitment")}
                          legend="If you are selected to serve in another club, will you still be able to fulfill your responsibilities and commitments to Al-QISC?"
                          options={options(OTHER_CLUB_COMMITMENTS, OTHER_CLUB_COMMITMENT_LABELS)}
                          onClear={() => setField("other_club_commitment", "")}
                        />

                        <div>
                          <p className={labelClassName}>Supporting documents, if any</p>
                          {supportingDocument && (
                            <p className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--primary)]/15 bg-[var(--light)] px-4 py-3 text-sm text-[var(--dark)]">
                              <FileText className="h-4 w-4 flex-shrink-0 text-[var(--primary)]" aria-hidden="true" />
                              <span className="min-w-0 flex-1 truncate">{supportingDocument.name}</span>
                              <span className="flex-shrink-0 text-xs text-[var(--gray)]">{formatFileSize(supportingDocument.size)}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                            <label htmlFor="document" className={fileButtonClassName}>
                              <Paperclip className="mr-2 h-4 w-4" aria-hidden="true" />
                              {supportingDocument ? "Change document" : "Attach a document"}
                              <input
                                id="document"
                                type="file"
                                accept={DOCUMENT_TYPES.join(",")}
                                onChange={(event) => void handleDocumentChange(event)}
                                aria-describedby="document-hint"
                                className="sr-only"
                              />
                            </label>
                            {supportingDocument && (
                              <button type="button" onClick={() => setSupportingDocument(null)} className={removeButtonClassName}>Remove document</button>
                            )}
                          </div>
                          <p id="document-hint" className={hintClassName}>
                            Optional. A portfolio, certificates or similar, as one PDF, JPG, PNG, or WebP file up to {formatFileSize(MAX_DOCUMENT_BYTES)}.
                            To send several certificates, combine them into one PDF.
                          </p>
                          <div role="status"><FieldError id="document-notice" message={documentNotice} /></div>
                        </div>

                        <div className="flex gap-3 rounded-xl border border-[var(--primary)]/15 bg-[var(--light)] p-4 text-sm leading-6 text-[var(--gray)]">
                          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--primary)]" aria-hidden="true" />
                          <div>
                            <p className="font-semibold text-[var(--dark)]">How your information is used</p>
                            <p className="mt-1">
                              The details, picture and documents you submit are used by the AL-QISC committee to review your
                              application and to contact you about it. They are stored privately and can be viewed only by
                              authorised AL-QISC administrators. To ask about your application or to withdraw it,{" "}
                              <Link href="/contact" className="font-semibold text-[var(--primary)] underline underline-offset-2">contact us</Link>.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Left empty by people: it is off screen, skipped by the keyboard and hidden from screen readers. */}
                  <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
                    <label htmlFor="website">Leave this field empty</label>
                    <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                  </div>

                  {invalidCount > 0 && (
                    <p role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {invalidCount === 1 ? "Please correct the highlighted question to continue." : `Please correct the ${invalidCount} highlighted questions to continue.`}
                    </p>
                  )}

                  {isLastStep && deadline && (
                    <p className="mt-6 text-sm leading-6 text-[var(--gray)]">
                      Applications close on <strong className="text-[var(--dark)]">{deadline}</strong>, at the end of the day in Malaysia.
                    </p>
                  )}

                  <div className={cn("flex flex-col-reverse gap-3 border-t border-[var(--primary)]/10 pt-6 sm:flex-row sm:items-center sm:justify-between", isLastStep && deadline ? "mt-4" : "mt-8")}>
                    {step > 0 ? (
                      <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => goToStep(step - 1, "heading")} className="w-full sm:w-auto">
                        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                        Back
                      </Button>
                    ) : <span />}
                    <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full sm:w-auto">
                      {isLastStep ? (
                        <>
                          {isSubmitting
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
                          {isSubmitting ? progress : "Submit application"}
                        </>
                      ) : (
                        <>
                          Next: {STEPS[step + 1].title}
                          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="sr-only" role="status">{progress}</p>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
