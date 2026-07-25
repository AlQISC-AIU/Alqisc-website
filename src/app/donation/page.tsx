"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Copy, HandHeart, Smartphone } from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { getSettings } from "@/lib/firebase/settings";
import { notifications } from "@/components/ui/notification-provider";

const supportedPrograms = [
  "Weekly and monthly Islamic talks",
  "Quran competition prizes",
  "Class materials and learning resources",
  "Ramadan programs and community iftar",
  "Community outreach events",
  "Student welfare activities",
];

export default function DonationPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    getSettings()
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  const donationPhone = settings.donation_phone || "+60 17-731 6088";
  const donationQr = settings.donation_qr || "/images/tng-qr.jpg";

  const copyDonationNumber = async () => {
    try {
      await navigator.clipboard.writeText(donationPhone.replace(/[\s-]/g, ""));
      notifications.success("The donation phone number was copied to your clipboard.", "Number copied");
    } catch {
      notifications.error("The phone number could not be copied. Please select and copy it manually.", "Copy failed");
    }
  };

  return (
    <>
      <InnerPageHero
        image="/images/donation-banner.jpg"
        title="Support AL-QISC"
        description="Help sustain Islamic learning, student welfare, and community programmes."
      />

      <main>
        <section className="bg-white py-20 md:py-24 lg:py-28">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex items-center justify-center gap-3 text-[var(--primary)]">
                  <HandHeart className="h-5 w-5" aria-hidden="true" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">Your contribution matters</p>
                </div>
                <h2 className="mt-4 font-heading text-3xl font-bold leading-tight text-[var(--dark)] sm:text-4xl">
                  Help us serve students and strengthen our community
                </h2>
                <p className="mt-6 text-base leading-8 text-[var(--gray)] sm:text-lg">
                  Every contribution supports practical programs that make Islamic education more accessible, build stronger relationships, and care for students across the university community.
                </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-6xl items-stretch gap-8 lg:grid-cols-2">
              <aside className="overflow-hidden rounded-2xl border border-[var(--primary)]/15 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]" aria-labelledby="donation-method-heading">
                <div className="bg-[var(--primary)] px-6 py-6 text-white sm:px-8">
                  <div className="flex items-center justify-center gap-4 text-center sm:justify-start sm:text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Smartphone className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm text-white/70">Donation method</p>
                      <h2 id="donation-method-heading" className="font-heading text-xl font-bold">Touch &apos;n Go eWallet</h2>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="mx-auto w-fit rounded-xl border border-[var(--primary)]/10 bg-white p-3 shadow-sm">
                    <Image
                      src={donationQr}
                      alt="Touch 'n Go donation QR code"
                      width={248}
                      height={248}
                      className="h-auto w-[220px] sm:w-[248px]"
                    />
                  </div>
                  <p className="mt-4 text-center text-sm leading-6 text-[var(--gray)]">
                    Open Touch &apos;n Go eWallet and scan this QR code to donate.
                  </p>

                  <div className="mx-auto mt-7 max-w-sm border-t border-[var(--primary)]/10 pt-6">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gray)]">Transfer by phone number</p>
                    <div className="mt-3 flex items-center gap-3 rounded-xl bg-[var(--light)] p-3">
                      <span className="min-w-0 flex-1 break-all text-center font-mono text-lg font-bold text-[var(--primary)]">
                        {donationPhone}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyDonationNumber()}
                        aria-label="Copy donation phone number"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-white transition-colors hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="flex flex-col rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] p-7 sm:p-9">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Direct impact</p>
                  <h3 className="mt-3 font-heading text-2xl font-bold text-[var(--dark)]">Where your donation goes</h3>
                  <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {supportedPrograms.map((program) => (
                      <li key={program} className="flex items-start gap-3 text-sm leading-6 text-[var(--gray)] sm:text-base">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--dark)]">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span>{program}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ol className="mt-8 space-y-3 border-t border-[var(--primary)]/10 pt-7 text-sm leading-6 text-[var(--gray)]">
                  <li className="flex gap-3"><span className="font-bold text-[var(--primary)]">1.</span><span>Scan the QR code or copy the phone number.</span></li>
                  <li className="flex gap-3"><span className="font-bold text-[var(--primary)]">2.</span><span>Enter the amount you wish to contribute.</span></li>
                  <li className="flex gap-3"><span className="font-bold text-[var(--primary)]">3.</span><span>Review the recipient details before confirming.</span></li>
                </ol>

                <blockquote className="mt-auto border-l-4 border-[var(--secondary)] bg-white px-6 py-6">
                  <p className="text-lg italic leading-8 text-[var(--gray)]">
                    &ldquo;The believer&apos;s shade on the Day of Resurrection will be his charity.&rdquo;
                  </p>
                  <footer className="mt-3 text-sm font-semibold text-[var(--primary)]">
                    Prophet Muhammad ﷺ · Al-Tirmidhi
                  </footer>
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--primary)]/10 bg-[var(--light)] py-14 md:py-16">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <div>
                <h2 className="font-heading text-2xl font-bold text-[var(--dark)] sm:text-3xl">Need help with your donation?</h2>
                <p className="mt-2 leading-7 text-[var(--gray)]">Contact the club if you need confirmation or would like to contribute another way.</p>
              </div>
              <Link
                href="/contact"
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3 font-semibold text-white transition-colors hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
              >
                Contact us
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
