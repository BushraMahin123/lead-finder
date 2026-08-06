"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subject = searchParams.get("subject");
    if (!subject) return;

    if (subject === "calling-custom") {
      setFormData((prev) => ({
        ...prev,
        subject: "calling-custom",
        message:
          prev.message ||
          "Hi, I'm interested in a custom calling package for LEADMAGPRO. Please contact me with pricing options.",
      }));
      return;
    }

    const allowed = new Set([
      "general",
      "support",
      "billing",
      "feedback",
      "partnership",
      "calling-custom",
      "other",
    ]);
    if (allowed.has(subject)) {
      setFormData((prev) => ({ ...prev, subject }));
    }
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const subjectOptions = [
    { value: "", label: "Select a subject" },
    { value: "general", label: "General Inquiry" },
    { value: "support", label: "Technical Support" },
    { value: "billing", label: "Billing Question" },
    { value: "calling-custom", label: "Custom calling package" },
    { value: "feedback", label: "Feedback" },
    { value: "partnership", label: "Partnership" },
    { value: "other", label: "Other" },
  ];

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error("Contact form error:", error);
      alert(error instanceof Error ? error.message : "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-slate-600">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          {submitted ? (
            <div className="card-elevated p-8 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 animate-in spin-in-1 duration-500">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                Message Sent!
              </h2>
              <p className="text-slate-600 mb-6">
                Thank you for reaching out. We'll get back to you within 24 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn btn-primary hover:scale-105 active:scale-95 transition-transform"
              >
                Send another message
              </button>
            </div>
          ) : (
            <div className="card-elevated p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="group">
                    <label htmlFor="name" className="label mb-2 group-hover:text-indigo-600 transition-colors">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input-field hover:border-indigo-400 transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="group">
                    <label htmlFor="email" className="label mb-2 group-hover:text-indigo-600 transition-colors">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="input-field hover:border-indigo-400 transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="subject" className="label mb-2 group-hover:text-indigo-600 transition-colors">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <div ref={dropdownRef} className="relative">
                    <input type="hidden" name="subject" value={formData.subject} required />
                    <button
                      type="button"
                      id="subject"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="input-field hover:border-indigo-400 transition-colors cursor-pointer text-left flex items-center justify-between w-full"
                    >
                      <span className={formData.subject ? "" : "text-slate-400"}>
                        {subjectOptions.find(opt => opt.value === formData.subject)?.label || "Select a subject"}
                      </span>
                      <svg
                        className={`w-5 h-5 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {subjectOptions.map((option) => (
                          <div
                            key={option.value}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, subject: option.value }));
                              setIsDropdownOpen(false);
                            }}
                            className={`custom-dropdown-item cursor-pointer hover:bg-indigo-50 transition-colors px-4 py-3 ${
                              formData.subject === option.value ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700'
                            } text-sm sm:text-base`}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="message" className="label mb-2 group-hover:text-indigo-600 transition-colors">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="input-field resize-none hover:border-indigo-400 transition-colors"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          )}

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 max-w-lg mx-auto">
            <div className="text-center group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 group-hover:bg-indigo-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <svg
                  className="h-6 w-6 text-indigo-600 group-hover:text-indigo-700 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">Email</h3>
              <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors">contact@leadmagpro.com</p>
            </div>

            <div className="text-center group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 group-hover:bg-indigo-200 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <svg
                  className="h-6 w-6 text-indigo-600 group-hover:text-indigo-700 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">Response Time</h3>
              <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors">Within 24 hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
