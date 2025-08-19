import { TenantProvider } from "../lib/tenant-context";
import { Providers } from "./providers";
import "./styles.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <TenantProvider>
          <Providers>{children}</Providers>
        </TenantProvider>
      </body>
    </html>
  );
}
