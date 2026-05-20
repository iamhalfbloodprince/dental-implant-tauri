import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }
>(function Button({ className, variant = "primary", ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[oklch(0.45_0.12_250)] text-white hover:opacity-90",
        variant === "ghost" &&
          "bg-transparent text-inherit hover:bg-[oklch(0.94_0.01_95)]",
        className,
      )}
      {...props}
    />
  );
});

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[oklch(0.9_0.01_260)] bg-white p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
  },
) {
  const { label, className, id, ...rest } = props;
  const i = id ?? rest.name;
  return (
    <label className="block space-y-1 text-sm">
      {label ? <span className="text-[oklch(0.35_0.02_260)]">{label}</span> : null}
      <input
        id={i}
        className={cn(
          "w-full rounded-md border border-[oklch(0.9_0.01_260)] bg-white px-2 py-1.5 text-sm",
          className,
        )}
        {...rest}
      />
    </label>
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
  },
) {
  const { label, className, id, ...rest } = props;
  const i = id ?? rest.name;
  return (
    <label className="block space-y-1 text-sm">
      {label ? <span className="text-[oklch(0.35_0.02_260)]">{label}</span> : null}
      <textarea
        id={i}
        className={cn(
          "min-h-[100px] w-full rounded-md border border-[oklch(0.9_0.01_260)] bg-white px-2 py-1.5 text-sm",
          className,
        )}
        {...rest}
      />
    </label>
  );
}
