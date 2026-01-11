export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        MIT License © {new Date().getFullYear()}{" "}
        <a
          href="https://github.com/tarcisioandrade"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Tarcisio Andrade
        </a>
      </p>
    </footer>
  );
}
