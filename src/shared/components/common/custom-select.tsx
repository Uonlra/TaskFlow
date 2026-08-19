"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

type CustomSelectProps<T extends string = string> = {
  value: T;
  options: Array<CustomSelectOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function CustomSelect<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
  invalid = false,
}: CustomSelectProps<T>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedIndex = useMemo(
    () =>
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    [options, value],
  );

  const selectedOption = options[selectedIndex] ?? options[0];

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setHighlightedIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    optionRefs.current[highlightedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedIndex, open]);

  useEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const preferredMaxHeight = 320;
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const shouldOpenUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(180, Math.min(preferredMaxHeight, shouldOpenUpward ? spaceAbove : spaceBelow));

      setMenuStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        zIndex: 3000,
        maxHeight,
        ...(shouldOpenUpward ? { bottom: viewportHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
      });
    };

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const commitSelection = (index: number) => {
    const nextOption = options[index];

    if (!nextOption) {
      return;
    }

    onChange(nextOption.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      setHighlightedIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
      } else {
        commitSelection(highlightedIndex);
      }
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
    }
  };

  return (
    <div ref={rootRef} className="custom-select">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        className={`task-field task-select-trigger${invalid ? " task-field--invalid" : ""}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
        style={triggerStyle}
      >
        <span className="custom-select__value">{selectedOption?.label ?? ""}</span>
        <span className="custom-select__caret" aria-hidden="true" />
      </button>

      {open && mounted && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="custom-select__menu"
              style={menuStyle}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-select__option${
                      isSelected ? " custom-select__option--selected" : ""
                    }${isHighlighted ? " custom-select__option--highlighted" : ""}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => commitSelection(index)}
                  >
                    <span className="custom-select__option-label">{option.label}</span>
                    {option.description ? (
                      <span className="custom-select__option-description">{option.description}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

const triggerStyle = {
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  display: "flex",
  textAlign: "left",
} satisfies CSSProperties;
