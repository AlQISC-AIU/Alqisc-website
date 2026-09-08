interface IconProps {
  className?: string;
}

export function SeedlingIcon({ className = "h-16 w-16" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M31.5 56V29" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M29.5 31C17 31.4 7.6 24.2 7 10c13.9-.5 23.5 6.2 22.5 21Z" fill="currentColor" />
      <path d="M34 27.5C35.2 14.7 44.1 7.4 58 8c.1 13.6-8.8 21.1-24 19.5Z" fill="currentColor" />
    </svg>
  );
}

export function DoveIcon({ className = "h-16 w-16" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <path d="M57.6 9.2c-5.1.9-9.5 3.7-12.4 7.7C38.8 9.6 29.4 6.2 19.7 7.7c2.8 5.1 6.7 9.5 11.5 12.8-8.5.2-16.5-2.5-23-7.7.1 11.4 5.7 21.3 15.1 26.5-4.8 3.4-10.3 5.8-16.1 7 10.2 8.5 24.8 10.2 36.2 3.3C54 43.2 59.6 30.7 57.7 18l5.3-5.6-8.2.2 2.8-3.4Z" />
      <path d="M27.7 39.2 22.4 55l13.2-9.2-7.9-6.6Z" />
      <circle cx="49.5" cy="20.5" r="1.8" fill="white" />
    </svg>
  );
}
