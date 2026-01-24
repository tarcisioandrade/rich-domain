import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "~/components/hero";
import { Packages } from "~/components/packages";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-background">
      <Hero />
      <Packages />
    </main>
  );
}
