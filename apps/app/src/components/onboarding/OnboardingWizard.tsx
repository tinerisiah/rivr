"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";

export function OnboardingWizard({ subdomain }: { subdomain?: string }) {
  const [step, setStep] = React.useState(1);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome to RIVR • Onboarding</CardTitle>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <p>Subdomain: {subdomain || "(not provided)"}</p>
            <p>Step 1: Set your brand details and logo.</p>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p>Step 2: Invite your team members (optional).</p>
            <Button onClick={() => setStep(3)}>Continue</Button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <p>Step 3: Create your first pickup request or driver.</p>
            <Button onClick={() => setStep(4)}>Finish</Button>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <p>All set! You can now access your admin dashboard.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OnboardingWizard;
