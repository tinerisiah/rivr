import { Landing } from "@/components/landing";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "RIVR | Home",
  description: "RIVR Wheel Installation Scheduling System",
};

export default function HomePage() {
  // Show landing page for all users regardless of authentication status
  return <Landing />;
}
