import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useEffect, useId, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

type UseAutocompleteArgs<T> = {
  query: string;
  options: T[];
  onSelect: (option: T) => void;
  minQueryLength?: number;
};

export function useAutocomplete<T>({
  query,
  options,
  onSelect,
  minQueryLength = 1,
}: UseAutocompleteArgs<T>) {
  const inputId = useId();
  const listboxId = useId();
  const blurTimeoutRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const canOpen = query.trim().length >= minQueryLength;
  const resolvedIsOpen = isOpen && canOpen;
  const resolvedActiveIndex =
    options.length === 0
      ? -1
      : Math.min(Math.max(activeIndex, 0), options.length - 1);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  function clearBlurTimeout() {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }

  function close() {
    clearBlurTimeout();
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function open() {
    if (!canOpen) return;
    clearBlurTimeout();
    setIsOpen(true);
    setActiveIndex((current) => {
      if (options.length === 0) return -1;
      if (current >= 0 && current < options.length) return current;
      return 0;
    });
  }

  function selectOption(option: T) {
    onSelect(option);
    close();
  }

  function selectIndex(index: number) {
    const option = options[index];
    if (!option) return;
    selectOption(option);
  }

  function handleInputFocus() {
    open();
  }

  function handleInputBlur() {
    clearBlurTimeout();
    blurTimeoutRef.current = window.setTimeout(() => {
      close();
    }, 120);
  }

  function handleInputValueChange(nextValue: string) {
    if (nextValue.trim().length >= minQueryLength) {
      open();
      return;
    }

    close();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!canOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!resolvedIsOpen) {
        open();
        return;
      }
      if (options.length === 0) return;
      setActiveIndex((current) => {
        const nextIndex = current < 0 ? 0 : current + 1;
        return nextIndex % options.length;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!resolvedIsOpen) {
        open();
        return;
      }
      if (options.length === 0) return;
      setActiveIndex((current) => {
        if (current <= 0) return options.length - 1;
        return current - 1;
      });
      return;
    }

    if (event.key === "Enter") {
      if (!resolvedIsOpen || options.length === 0) return;
      event.preventDefault();
      const indexToSelect = resolvedActiveIndex >= 0 ? resolvedActiveIndex : 0;
      selectIndex(indexToSelect);
      return;
    }

    if (event.key === "Escape") {
      if (!resolvedIsOpen) return;
      event.preventDefault();
      close();
    }
  }

  function getOptionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  return {
    inputId,
    listboxId,
    isOpen: resolvedIsOpen,
    activeIndex: resolvedActiveIndex,
    canOpen,
    activeDescendantId:
      resolvedIsOpen && resolvedActiveIndex >= 0
        ? getOptionId(resolvedActiveIndex)
        : undefined,
    open,
    close,
    handleInputFocus,
    handleInputBlur,
    handleInputValueChange,
    handleKeyDown,
    handleOptionMouseEnter: setActiveIndex,
    handleOptionMouseDown: (index: number) => {
      return (event: MouseEvent | ReactMouseEvent) => {
        event.preventDefault();
        selectIndex(index);
      };
    },
    getOptionId,
  };
}

type UseAsyncAutocompleteArgs<T> = {
  query: string;
  fetcher: (query: string, signal: AbortSignal) => Promise<T[]>;
  delay?: number;
  minQueryLength?: number;
  enabled?: boolean;
};

type AsyncAutocompleteState<T> = {
  query: string;
  options: T[];
  error: string | null;
};

export function useAsyncAutocomplete<T>({
  query,
  fetcher,
  delay = 300,
  minQueryLength = 1,
  enabled = true,
}: UseAsyncAutocompleteArgs<T>) {
  const debouncedQuery = useDebouncedValue(query, delay);
  const [state, setState] = useState<AsyncAutocompleteState<T>>({
    query: "",
    options: [],
    error: null,
  });

  const normalizedQuery = debouncedQuery.trim();
  const shouldFetch = enabled && normalizedQuery.length >= minQueryLength;

  useEffect(() => {
    if (!shouldFetch) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    fetcher(normalizedQuery, controller.signal)
      .then((nextOptions) => {
        if (!isActive || controller.signal.aborted) return;
        setState({
          query: normalizedQuery,
          options: nextOptions,
          error: null,
        });
      })
      .catch((fetchError: unknown) => {
        if (!isActive || controller.signal.aborted) return;
        setState({
          query: normalizedQuery,
          options: [],
          error: fetchError instanceof Error ? fetchError.message : "Error",
        });
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [fetcher, normalizedQuery, shouldFetch]);

  return {
    debouncedQuery: normalizedQuery,
    options: shouldFetch && state.query === normalizedQuery ? state.options : [],
    loading: shouldFetch && state.query !== normalizedQuery,
    error: shouldFetch && state.query === normalizedQuery ? state.error : null,
  };
}
