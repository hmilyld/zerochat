import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function findNull(bytes: Uint8Array, start: number): number {
  for (let i = start; i < bytes.length; i++) {
    if (bytes[i] === 0) return i;
  }
  return bytes.length;
}
