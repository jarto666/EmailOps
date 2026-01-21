"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface SecretFieldProps {
  label: string;
  fieldKey: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  hasStoredValue?: boolean;
  onReveal: (fieldKey: string) => Promise<string | null>;
  onChange: (value: string) => void;
}

/**
 * A form field for secrets/credentials with on-demand reveal functionality.
 * Shows a masked placeholder until the user clicks the eye icon to reveal.
 * Each field fetches its value independently when revealed.
 */
export default function SecretField({
  label,
  fieldKey,
  value,
  placeholder = "",
  required = false,
  disabled = false,
  fullWidth = false,
  hasStoredValue = true,
  onReveal,
  onChange,
}: SecretFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleRevealToggle = async () => {
    if (isRevealed) {
      // Just hide it, keep the value
      setIsRevealed(false);
      return;
    }

    // Fetch if we don't have a value yet (even if we loaded before but value got cleared)
    const needsFetch = hasStoredValue && !value;
    if (needsFetch) {
      setIsLoading(true);
      try {
        const storedValue = await onReveal(fieldKey);
        if (storedValue !== null) {
          onChange(storedValue);
        }
        setHasLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }
    setIsRevealed(true);
  };

  // Determine display state
  const showMasked = !isRevealed && hasStoredValue && !value;
  const inputType = isRevealed ? "text" : "password";

  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="label">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={showMasked ? "text" : inputType}
          className="input font-mono pr-10"
          placeholder={showMasked ? "••••••••" : placeholder}
          value={showMasked ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          required={required && !hasStoredValue}
          disabled={disabled || isLoading}
          readOnly={showMasked}
        />
        {hasStoredValue && (
          <button
            type="button"
            onClick={handleRevealToggle}
            disabled={disabled || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-tertiary transition-colors disabled:opacity-50"
            title={isRevealed ? "Hide value" : "Reveal value"}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRevealed ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
