import { Header } from "@/components/ui/header";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Header />

        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">
            About RIVR
          </h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground mb-6">
              RIVR is a comprehensive multi-tenant logistics platform designed
              to streamline wheel pickup and delivery operations for modern
              businesses.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Our Mission
            </h2>
            <p className="text-muted-foreground mb-6">
              We provide professional wheel pickup and delivery solutions that
              help businesses optimize their logistics operations, reduce costs,
              and improve customer satisfaction.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Key Features
            </h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
              <li>Real-time tracking and notifications</li>
              <li>
                Multi-tenant architecture with isolated business environments
              </li>
              <li>Role-based access control for different user types</li>
              <li>Professional driver management and routing</li>
              <li>Comprehensive business portal for service management</li>
              <li>Secure authentication and data protection</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Contact Us
            </h2>
            <p className="text-muted-foreground">
              For more information about our services, please contact our
              support team or visit one of our portal access points above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
