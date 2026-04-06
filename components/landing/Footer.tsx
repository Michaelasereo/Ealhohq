import { Instagram, Linkedin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FooterBookSessionTrigger } from "@/components/landing/FooterBookSessionTrigger";

const EALHO_LOGO = "/Ealho-logo.svg";

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const platformLinks = [
  { href: "/book", label: "Book a Session" },
  { href: "/therapist/enroll", label: "For Therapists" },
  { href: "/#notes-ai", label: "Ealho Notes AI" },
  { href: "/for-organisations", label: "For Organisations" },
] as const;

const resourceLinks = [
  { href: "/#faq", label: "FAQ" },
  { href: "/therapist-standards", label: "Therapist Standards" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

export function Footer() {
  return (
    <footer className="w-full bg-[#1A1A1A] text-white/60">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          <div className="max-w-sm lg:w-[40%]">
            <div className="flex items-center">
              <Image
                src={EALHO_LOGO}
                alt="Ealho"
                width={40}
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
            </div>
            <p className="mt-4 text-[15px] leading-relaxed sm:text-[16px]">
              Mental health support for those who heal others.
            </p>
            <p className="mt-3 text-sm text-white/60">Lagos, Nigeria</p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 transition-opacity hover:opacity-100"
                aria-label="X"
              >
                <XIcon className="size-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 transition-opacity hover:opacity-100"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} strokeWidth={1.5} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 transition-opacity hover:opacity-100"
                aria-label="Instagram"
              >
                <Instagram size={16} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-10 sm:grid-cols-3 lg:w-[60%]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                Platform
              </p>
              <ul className="mt-4 space-y-3">
                {platformLinks.map((item) => (
                  <li key={item.href}>
                    {item.href === "/book" ? (
                      <FooterBookSessionTrigger className="min-h-11 inline-flex text-[15px] text-white/60 transition-opacity hover:text-white" />
                    ) : (
                      <Link
                        href={item.href}
                        className="min-h-11 inline-flex text-[15px] text-white/60 transition-opacity hover:text-white"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                Resources
              </p>
              <ul className="mt-4 space-y-3">
                {resourceLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="min-h-11 inline-flex text-[15px] text-white/60 transition-opacity hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                Contact
              </p>
              <ul className="mt-4 space-y-3 text-[15px]">
                <li>hello@ealhohq.com</li>
                <li>privacy@ealhohq.com</li>
                <li>Lagos, Nigeria</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/60">
              © 2026 Ealho Technologies Limited. All rights reserved.
            </p>
            <p className="text-sm text-white/60">
              NDPA Compliant · Built in Nigeria
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
