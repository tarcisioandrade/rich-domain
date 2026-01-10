import { ArrowUpRight } from "lucide-react";

const packages = [
  {
    name: "@woltz/rich-domain",
    description:
      "Core DDD library with entities, aggregates, value objects, and automatic change tracking",
    href: "https://www.npmjs.com/package/@woltz/rich-domain",
    badge: "Core",
  },
  {
    name: "@woltz/rich-domain-prisma",
    description: "Prisma adapter with Unit of Work and batch operations",
    href: "https://www.npmjs.com/package/@woltz/rich-domain-prisma",
    badge: "Adapter",
  },
  {
    name: "@woltz/rich-domain-typeorm",
    description: "TypeORM adapter with transaction support",
    href: "https://www.npmjs.com/package/@woltz/rich-domain-typeorm",
    badge: "Adapter",
  },
  {
    name: "@woltz/rich-domain-cli",
    description: "CLI for project scaffolding and code generation",
    href: "https://www.npmjs.com/package/@woltz/rich-domain-cli",
    badge: "Tool",
  },
  {
    name: "@woltz/rich-domain-criteria-zod",
    description: "Zod-based criteria builder for type-safe queries",
    href: "https://www.npmjs.com/package/@woltz/rich-domain-criteria-zod",
    badge: "Extension",
  },
  {
    name: "@woltz/rich-domain-export",
    description: "Export data to various formats from your repositories",
    href: "https://www.npmjs.com/package/@woltz/rich-domain-export",
    badge: "Extension",
  },
];

export function Packages() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Ecosystem packages
          </h2>
          <p className="text-lg text-muted-foreground">
            A comprehensive monorepo with everything you need for enterprise DDD
            applications.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          {packages.map((pkg) => (
            <a
              key={pkg.name}
              href={pkg.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {pkg.badge}
                  </span>
                </div>
                <h3 className="mb-1 font-mono text-sm font-medium text-foreground">
                  {pkg.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {pkg.description}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
