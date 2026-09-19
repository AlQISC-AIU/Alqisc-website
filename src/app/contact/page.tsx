"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { Button } from "@/components/ui/button";
import { notifications } from "@/components/ui/notification-provider";
import { useSiteSettings } from "@/components/layout/layout-shell";

const fallbackAddress = "Albukhary International University\nJalan Tun Abdul Razak, 05200\nAlor Setar, Kedah Darul Aman, Malaysia";
const fallbackPhone = "+60 17-731 6088";
const fallbackEmail = "alqiscpersonal@gmail.com";
const fallbackHours = "Sunday - Thursday: 9:00 AM - 5:00 PM";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settings = useSiteSettings();

  const address = settings.contact_address || fallbackAddress;
  const phone = settings.contact_phone || fallbackPhone;
  const email = settings.contact_email || fallbackEmail;
  const officeHours = settings.contact_hours || fallbackHours;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, website: "" }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Your message could not be delivered.");

      setFormData({ name: "", email: "", subject: "", message: "" });
      notifications.success("Thank you for reaching out. We'll get back to you soon.", "Message sent");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Your message could not be delivered.", "Message not sent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const contactItems = [
    {
      title: "Visit us",
      value: address,
      Icon: MapPin,
      href: "https://maps.google.com/?q=Albukhary+International+University",
    },
    {
      title: "Call us",
      value: phone,
      Icon: Phone,
      href: `tel:${phone.replace(/[\s-]/g, "")}`,
    },
    {
      title: "Email us",
      value: email,
      Icon: Mail,
      href: `mailto:${email}`,
    },
    {
      title: "Office hours",
      value: officeHours,
      Icon: Clock,
    },
  ];

  const inputClassName = "w-full rounded-xl border border-[var(--primary)]/15 bg-white px-4 py-3.5 text-[var(--dark)] outline-none transition-colors placeholder:text-[var(--gray)]/70 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

  return (
    <>
      <InnerPageHero
        image="/images/committee2.jpg"
        title="Contact AL-QISC"
        description="Questions about our programmes or membership? Our team is ready to help."
        imagePosition="center 45%"
      />

      <main>
        <section className="bg-white py-20 md:py-24">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Get in touch</p>
              <h2 className="font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">Choose the easiest way to reach us</h2>
              <p className="mt-4 text-base leading-7 text-[var(--gray)] sm:text-lg">We welcome enquiries from students, members, partners, and the wider community.</p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {contactItems.map(({ title, value, Icon, href }) => {
                const content = (
                  <>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-heading text-lg font-bold text-[var(--dark)]">{title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--gray)]">{value}</p>
                  </>
                );

                return href ? (
                  <a
                    key={title}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="rounded-2xl border border-[var(--primary)]/10 bg-white p-6 shadow-sm transition-colors hover:border-[var(--primary)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                  >
                    {content}
                  </a>
                ) : (
                  <article key={title} className="rounded-2xl border border-[var(--primary)]/10 bg-white p-6 shadow-sm">{content}</article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[var(--light)] py-20 md:py-24 lg:py-28">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
              <div className="p-6 sm:p-8 lg:p-10 xl:p-12">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Send a message</p>
                <h2 className="font-heading text-3xl font-bold text-[var(--dark)]">How can we help?</h2>
                <p className="mt-3 max-w-xl leading-7 text-[var(--gray)]">Share a few details and the appropriate team member will respond as soon as possible.</p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[var(--dark)]">Name <span aria-hidden="true">*</span></label>
                        <input id="name" name="name" value={formData.name} onChange={handleChange} required minLength={2} maxLength={100} autoComplete="name" className={inputClassName} placeholder="Your name" />
                      </div>
                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[var(--dark)]">Email <span aria-hidden="true">*</span></label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required maxLength={254} autoComplete="email" className={inputClassName} placeholder="you@example.com" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="subject" className="mb-2 block text-sm font-semibold text-[var(--dark)]">Subject <span aria-hidden="true">*</span></label>
                      <input id="subject" name="subject" value={formData.subject} onChange={handleChange} required minLength={2} maxLength={150} className={inputClassName} placeholder="What is your enquiry about?" />
                    </div>
                    <div>
                      <label htmlFor="message" className="mb-2 block text-sm font-semibold text-[var(--dark)]">Message <span aria-hidden="true">*</span></label>
                      <textarea id="message" name="message" value={formData.message} onChange={handleChange} required minLength={10} maxLength={5000} rows={6} className={`${inputClassName} resize-y`} placeholder="Tell us how we can help (at least 10 characters)" />
                    </div>
                    <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isSubmitting ? "Sending..." : "Send message"}
                    </Button>
                </form>
              </div>

              <div className="relative isolate flex min-h-[420px] items-end overflow-hidden border-t border-[var(--primary)]/10 bg-[var(--primary)] lg:min-h-full lg:border-l lg:border-t-0">
                <Image src="/images/backround.JPG" alt="" fill sizes="(max-width: 1024px) 100vw, 45vw" className="-z-20 object-cover" />
                <div className="absolute inset-0 -z-10 bg-black/65" aria-hidden="true" />
                <div className="p-8 text-white sm:p-10 lg:p-12">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--dark)]">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Our location</p>
                  <h2 className="mt-3 font-heading text-3xl font-bold">Visit us at AIU</h2>
                  <p className="mt-4 max-w-md whitespace-pre-line leading-7 text-white/80">{address}</p>
                  <a
                    href="https://maps.google.com/?q=Albukhary+International+University"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--secondary)] px-6 py-2.5 font-semibold text-[var(--dark)] transition-colors hover:bg-[var(--secondary-dark)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
