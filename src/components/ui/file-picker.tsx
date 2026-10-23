import type { ChangeEventHandler } from "react";
import { Upload } from "lucide-react";

type FilePickerProps = {
  id: string;
  label: string;
  accept: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  selectedFileName?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function FilePicker({
  id,
  label,
  accept,
  disabled = false,
  ariaInvalid = false,
  ariaDescribedBy,
  selectedFileName,
  onChange,
}: FilePickerProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
        aria-label={label}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <label
        htmlFor={id}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-medium text-[var(--ink-soft)] transition-colors duration-150 hover:bg-[var(--surface)] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-base)] peer-disabled:pointer-events-none peer-disabled:opacity-50"
      >
        <Upload aria-hidden="true" className="h-4 w-4" />
        {label}
      </label>
      {selectedFileName && (
        <span className="min-w-0 truncate text-sm text-[var(--ink-muted)]">
          {selectedFileName}
        </span>
      )}
    </div>
  );
}
