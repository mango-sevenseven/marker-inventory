import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { RoughBox } from "./sketch/RoughBox";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <RoughBox variant="input" className="w-full">
      <div className="relative w-full">
        <select
          className={cn(
            "w-full cursor-pointer appearance-none bg-transparent py-1.5 pl-2.5 pr-9 text-sm font-sketch outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2.25} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground" />
      </div>
    </RoughBox>
  );
}
