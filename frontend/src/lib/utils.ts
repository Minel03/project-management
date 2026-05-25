import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(username: string | null | undefined) {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
}

