import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Check, Copy, ArrowRight } from "lucide-react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCommand = "npm install @woltz/rich-domain";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden border-b border-border/40 py-24 md:py-32">
      {/* Background grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[64px_64px] opacity-30" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <a
            href="https://woltz.mintlify.app/CLI"
            className="group mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            CLI is now live!
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>

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
            <Button size="lg" asChild>
              <a href="https://woltz.mintlify.app/quickstart">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>

            {/* Install command */}
            <button
              onClick={handleCopy}
              className="group flex h-11 items-center gap-3 rounded-lg border border-border bg-card px-4 font-mono text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card/80"
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
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Type-Safe", value: "100%" },
              { label: "Bundle Size", value: "~12KB" },
              { label: "ORM Agnostic", value: "Yes" },
              { label: "License", value: "MIT" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border/60 bg-card/50 p-4"
              >
                <div className="text-2xl font-bold text-primary">
                  {item.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
