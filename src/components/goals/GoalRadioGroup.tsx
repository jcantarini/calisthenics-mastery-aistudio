// Accessible radio-style option group with roving focus (Sprint 7.5A).
// Keyboard index math lives in the pure `radioNavigation` helper; this
// component only wires it to DOM focus. No domain logic.

import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  isRadioSelectKey,
  nextRadioIndex,
  radioFocusIndex,
  radioTabIndex,
} from "./radioNavigation";

export interface RadioOptionProps {
  role: "radio";
  "aria-checked": boolean;
  tabIndex: 0 | -1;
  ref: (element: HTMLButtonElement | null) => void;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export function GoalRadioGroup<T>({
  label,
  options,
  isSelected,
  onSelect,
  getKey,
  className,
  renderOption,
}: {
  label: string;
  options: readonly T[];
  isSelected: (option: T) => boolean;
  onSelect: (option: T) => void;
  getKey: (option: T) => string;
  className?: string;
  renderOption: (option: T, props: RadioOptionProps, selected: boolean) => ReactNode;
}) {
  const selectedIndex = options.findIndex((option) => isSelected(option));
  const [focused, setFocused] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const anchor = focused ?? radioFocusIndex(selectedIndex, options.length);

  const move = useCallback(
    (index: number, option: T) => {
      setFocused(index);
      refs.current[index]?.focus();
      onSelect(option);
    },
    [onSelect],
  );

  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((option, index) => {
        const selected = isSelected(option);
        const props: RadioOptionProps = {
          role: "radio",
          "aria-checked": selected,
          tabIndex: radioTabIndex(index, anchor),
          ref: (element) => {
            refs.current[index] = element;
          },
          onClick: () => {
            setFocused(index);
            onSelect(option);
          },
          onKeyDown: (event) => {
            if (isRadioSelectKey(event.key)) {
              event.preventDefault();
              setFocused(index);
              onSelect(option);
              return;
            }
            const next = nextRadioIndex(event.key, index, options.length);
            if (next === null) return;
            event.preventDefault();
            const target = options[next];
            if (target !== undefined) move(next, target);
          },
        };
        return <span key={getKey(option)} className="contents">{renderOption(option, props, selected)}</span>;
      })}
    </div>
  );
}
