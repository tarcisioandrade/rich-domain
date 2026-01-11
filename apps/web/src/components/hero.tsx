import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Check, Copy } from "lucide-react";
import { LightRays } from "./ui/light-rays";

const highlights = [
  {
    title: "Delightful DX",
    description:
      "Intuitive APIs with full TypeScript inference and autocompletion out of the box.",
    icon: (
      <svg
        className="h-5 w-5 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
        />
      </svg>
    ),
  },
  {
    title: "Zero Dependencies",
    description:
      "No external runtime dependencies. Just pure TypeScript that runs anywhere.",
    icon: (
      <svg
        className="h-5 w-5 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
        />
      </svg>
    ),
  },
  {
    title: "Lightweight",
    description:
      "Tiny bundle size (~12KB gzip). Performance-first without sacrificing features.",
    icon: (
      <svg
        className="h-5 w-5 text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
  {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        stroke-linecap="round"
        stroke-linejoin="round"
        className="lucide lucide-git-branch-icon lucide-git-branch h-5 w-5 text-primary"
      >
        <line x1="6" x2="6" y1="3" y2="15" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
    ),
    title: "Change Tracking",
    description:
      "Automatically track all changes across nested entities and collections for efficient persistence.",
  },
];

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCommand = "npm install @woltz/rich-domain";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden border-b border-border/40 pb-24 md:pb-32 pt-[calc(64px*3)] -mt-[64px]">
      {/* Background grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[64px_64px] opacity-30" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Main heading */}
          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            The DDD Toolkit for{" "}
            <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              TypeScript
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            A TypeScript library for Domain-Driven Design with Standard Schema
            validation, automatic change tracking, and enterprise-ready
            repositories.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="text-primary-foreground">
              <a href="https://woltz.mintlify.app/quickstart">Get Started</a>
            </Button>

            {/* Install command */}
            <button
              onClick={handleCopy}
              className="group flex h-11 items-center gap-3 rounded-lg border border-border bg-card px-4 font-mono text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card/80 cursor-pointer"
            >
              <span className="text-primary">$</span>
              {installCommand}
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          </div>

          {/* Highlights */}
          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((h, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-5 text-left"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {h.icon}
                </div>
                <h3 className="mb-1 font-semibold text-foreground">
                  {h.title}
                </h3>
                <p className="text-sm text-muted-foreground">{h.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <LightRays />
    </section>
  );
}
