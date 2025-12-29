import { useEffect, useState } from "react";
import { NotFound } from "./NotFound";

const API_URL = "http://localhost:6699";

interface PackageStatus {
  success: boolean;
  installed: boolean;
  packageName: string;
}

interface PackageGuardProps {
  children: React.ReactNode;
}

export function PackageGuard({ children }: PackageGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPackageStatus() {
      try {
        const response = await fetch(`${API_URL}/api/package-status`);

        if (!response.ok) {
          throw new Error("Failed to check package status");
        }

        const data: PackageStatus = await response.json();
        setIsInstalled(data.installed);
      } catch (err) {
        console.error("Error checking package status:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        // If we can't check, assume it's not installed to be safe
        setIsInstalled(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkPackageStatus();
  }, []);

  if (isChecking) {
    return (
      <div className="h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking installation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen grid place-items-center">
        <div className="text-center max-w-md p-6">
          <p className="text-red-500 mb-2">Error checking package status</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return <NotFound />;
  }

  return <>{children}</>;
}
