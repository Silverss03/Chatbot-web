import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets the site URL considering the current environment
 */
export function getSiteUrl(): string {
  // First priority is the environment variable
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // For server-side
  if (typeof window === "undefined") {
    // Development fallback
    return process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://chatbot-web-yjh4.vercel.app"; // Hardcoded production fallback
  }

  // Client-side - use the current origin
  return window.location.origin;
}
