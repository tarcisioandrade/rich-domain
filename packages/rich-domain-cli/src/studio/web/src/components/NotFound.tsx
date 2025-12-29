export function NotFound() {
  return (
    <div className="mx-auto max-w-2xl h-screen grid place-items-center px-4">
      <div className="border border-border rounded-lg p-8 text-pretty leading-relaxed shadow-lg bg-card">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Package not found
            </h1>
            <p className="text-muted-foreground">
              The package{" "}
              <code className="text-primary font-semibold">
                @woltz/rich-domain
              </code>{" "}
              is not installed in your project.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Installation
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              To use Rich Domain Studio, you need to install the package in your
              project:
            </p>
            <div className="bg-muted rounded-md p-4 font-mono text-sm overflow-x-auto">
              <div className="text-muted-foreground mb-2"># npm</div>
              <code className="text-foreground">
                npm install @woltz/rich-domain
              </code>

              <div className="text-muted-foreground mt-4 mb-2"># yarn</div>
              <code className="text-foreground">
                yarn add @woltz/rich-domain
              </code>

              <div className="text-muted-foreground mt-4 mb-2"># pnpm</div>
              <code className="text-foreground">
                pnpm add @woltz/rich-domain
              </code>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Next steps
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Install the package using one of the commands above</li>
              <li>Restart Rich Domain Studio</li>
              <li>Start creating your domain entities</li>
            </ol>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Need help? Consult the{" "}
              <a
                href="https://woltz.mintlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                official documentation
              </a>{" "}
              for more information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
