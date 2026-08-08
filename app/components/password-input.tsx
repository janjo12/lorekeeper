"use client";

import { useState, type ComponentProps } from "react";

export default function PasswordInput({
  toggleLabel = "password",
  ...props
}: ComponentProps<"input"> & { toggleLabel?: string }) {
  const [visible, setVisible] = useState(false);
  const inputId = props.id;

  return (
    <div className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        aria-controls={inputId}
        aria-label={`${visible ? "Hide" : "Show"} ${toggleLabel}`}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
