import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface RivrLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  customLogo?: string | null;
}

export function RivrLogo({
  className,
  size = "md",
  customLogo,
}: RivrLogoProps) {
  const sizeClasses = {
    sm: { width: 160, height: 160 },
    md: { width: 224, height: 224 },
    lg: { width: 320, height: 320 },
    xl: { width: 448, height: 448 },
  };

  const logoPath = customLogo || "/rivr-logo.png";

  return (
    <Link href="/" className={cn("flex items-center", className)}>
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
    </Link>
  );
}
