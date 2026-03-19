"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { useAutocomplete } from "@/hooks/use-autocomplete";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminAutocompleteOption } from "@/lib/admin-autocomplete";

type AutocompleteInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onSelect"
> & {
  value: string;
  onValueChange: (value: string) => void;
  options: AdminAutocompleteOption[];
  onSelect?: (option: AdminAutocompleteOption) => void;
  loading?: boolean;
  emptyMessage?: string;
  minQueryLength?: number;
  leadingIcon?: ReactNode;
  inputClassName?: string;
  dropdownClassName?: string;
};

export function AutocompleteInput({
  value,
  onValueChange,
  options,
  onSelect,
  loading = false,
  emptyMessage = "Sin resultados",
  minQueryLength = 1,
  leadingIcon,
  className,
  inputClassName,
  dropdownClassName,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: AutocompleteInputProps) {
  const {
    inputId,
    listboxId,
    isOpen,
    activeIndex,
    canOpen,
    activeDescendantId,
    handleInputFocus,
    handleInputBlur,
    handleInputValueChange,
    handleKeyDown,
    handleOptionMouseEnter,
    handleOptionMouseDown,
    getOptionId,
  } = useAutocomplete<AdminAutocompleteOption>({
    query: value,
    options,
    minQueryLength,
    onSelect: (option) => {
      onValueChange(option.value);
      onSelect?.(option);
    },
  });

  const shouldShowDropdown = isOpen && canOpen;

  return (
    <div className={cn("relative", className)}>
      {leadingIcon ? (
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
          {leadingIcon}
        </div>
      ) : null}

      <Input
        {...props}
        id={inputId}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shouldShowDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        aria-busy={loading}
        onChange={(event) => {
          onValueChange(event.target.value);
          handleInputValueChange(event.target.value);
        }}
        onFocus={(event) => {
          handleInputFocus();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          handleInputBlur();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          handleKeyDown(event);
          onKeyDown?.(event);
        }}
        className={cn(
          leadingIcon && "pl-9",
          loading && "pr-10",
          inputClassName
        )}
      />

      {loading ? (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400 dark:text-zinc-500" />
      ) : null}

      {shouldShowDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-zinc-200/80 bg-white p-1 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-900/95",
            dropdownClassName
          )}
        >
          {loading ? (
            <div className="px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">
              Buscando...
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">
              {emptyMessage}
            </div>
          ) : (
            options.map((option, index) => {
              const isActive = index === activeIndex;

              return (
                <div
                  key={option.id}
                  id={getOptionId(index)}
                  role="option"
                  aria-selected={isActive}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-2.5 transition-colors",
                    isActive
                      ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
                  )}
                  onMouseEnter={() => handleOptionMouseEnter(index)}
                  onMouseDown={handleOptionMouseDown(index)}
                >
                  <div className="text-sm font-medium tracking-tight">{option.label}</div>
                  {option.description || option.meta ? (
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {option.description ? <span>{option.description}</span> : null}
                      {option.meta ? <span>{option.meta}</span> : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
