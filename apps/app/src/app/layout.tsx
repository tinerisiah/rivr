import "./styles.css";
import { Providers } from "./providers";
import { TenantProvider } from "../lib/tenant-context";
import { TenantHeader } from "../components/tenant-branding";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <TenantProvider>
          <TenantHeader />
          <Providers>{children}</Providers>
        </TenantProvider>
      </body>
    </html>
  );
}
