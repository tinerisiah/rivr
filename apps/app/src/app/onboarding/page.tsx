import OnboardingWizard from "../../components/onboarding/OnboardingWizard";

export default function OnboardingPage({
  searchParams,
}: {
  searchParams?: { [k: string]: string };
}) {
  const sub = searchParams?.subdomain;
  return <OnboardingWizard subdomain={sub} />;
}
