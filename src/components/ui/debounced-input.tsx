import * as React from "react";
import { cn } from "@/lib/utils";

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
}

const DebouncedInput = React.forwardRef<HTMLInputElement, DebouncedInputProps>(
  ({ value, onValueChange, className, ...props }, forwardedRef) => {
    const [localValue, setLocalValue] = React.useState(value);
    const internalRef = React.useRef<HTMLInputElement>(null);
    const inputRef = forwardedRef || internalRef;
    
    // Track if input is focused to prevent external updates from resetting cursor
    const isFocusedRef = React.useRef(false);
    
    // Only sync external value when not focused
    React.useEffect(() => {
      if (!isFocusedRef.current) {
        setLocalValue(value);
      }
    }, [value]);
    
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onValueChange(newValue);
    }, [onValueChange]);

    const handleFocus = React.useCallback(() => {
      isFocusedRef.current = true;
    }, []);

    const handleBlur = React.useCallback(() => {
      isFocusedRef.current = false;
      // Sync with external value on blur
      setLocalValue(value);
    }, [value]);

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-3.5 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors md:text-sm",
          className
        )}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

DebouncedInput.displayName = "DebouncedInput";

export { DebouncedInput };
