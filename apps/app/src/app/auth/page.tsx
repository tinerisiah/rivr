import { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageContent } from "./_auth-page-content";

export const metadata: Metadata = {
  title: "RIVR | Auth",
  description: "RIVR | Auth",
};

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
