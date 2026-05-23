import Link from "next/link";
import { cn } from "@/lib/utils";

const DEVELOPER_URL = "https://ecards-two.vercel.app/";

interface SiteFooterProps {
  variant?: "light" | "dark";
  className?: string;
}

export function SiteFooter({ variant = "light", className }: SiteFooterProps) {
  const isDark = variant === "dark";

  return (
    <footer
      className={cn(
        "mt-auto border-t px-4 py-6 text-center text-sm sm:px-6",
        isDark
          ? "border-slate-700 text-slate-400"
          : "border-slate-200 bg-white text-slate-500",
        className
      )}
    >
      <p>
        © 2026. Developed by{" "}
        <Link
          href={DEVELOPER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "font-medium underline-offset-2 hover:underline",
            isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600"
          )}
        >
          Manyika
        </Link>
        .
      </p>
    </footer>
  );
}
