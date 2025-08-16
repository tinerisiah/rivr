import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface RivrLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  customLogo?: string | null;
  isLoading?: boolean;
}

export function RivrLogo({
  className,
  size = "md",
  customLogo,
  isLoading = false,
}: RivrLogoProps) {
  const sizeClasses = {
    sm: { width: 75, height: 75 },
    md: { width: 120, height: 120 },
    lg: { width: 160, height: 160 },
    xl: { width: 224, height: 224 },
  };

  const logoPath = customLogo || "/rivr-logo.png";

  return (
    <Link href="/" className={cn("flex items-center", className)}>
      {isLoading ? (
        <div
          className={cn(
            "bg-muted rounded-lg animate-pulse",
            "flex items-center justify-center"
          )}
          style={{
            width: sizeClasses[size].width,
            height: sizeClasses[size].height,
          }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Image
          src={logoPath}
          alt="Rivr - Professional On-Demand Service Solutions"
          width={sizeClasses[size].width}
          height={sizeClasses[size].height}
          className={cn(
            "object-contain drop-shadow-lg",
            "transition-all duration-200 hover:scale-105"
          )}
          priority={size === "lg" || size === "xl"}
        />
      )}
    </Link>
  );
}
