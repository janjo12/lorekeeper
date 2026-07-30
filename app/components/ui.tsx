import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Eyebrow({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={classNames("eyebrow", className)} {...props}>
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  titleId,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
}) {
  return (
    <>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <header className="page-heading">
        <div>
          <h1 id={titleId}>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions}
      </header>
    </>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  titleId,
  count,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId?: string;
  count?: number;
}) {
  return (
    <header className="section-heading">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 id={titleId}>{title}</h2>
      </div>
      {count !== undefined && <span aria-label={`${count} items`}>{count}</span>}
    </header>
  );
}

export function EmptyState({
  title,
  children,
  compact = false,
  headingLevel = 2,
}: {
  title: ReactNode;
  children: ReactNode;
  compact?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={classNames("empty-state", compact && "compact-empty")}>
      <Heading>{title}</Heading>
      <p>{children}</p>
    </div>
  );
}

export function FormField({
  label,
  children,
  errors,
  variant = "standard",
  htmlFor,
}: {
  label: ReactNode;
  children: ReactNode;
  errors?: string[];
  variant?: "standard" | "material";
  htmlFor?: string;
}) {
  const content = (
    <>
      {variant === "standard" ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
      {children}
      {errors?.map((error) => (
        <p className="field-error" key={error}>
          {error}
        </p>
      ))}
    </>
  );

  return variant === "material" ? (
    <label className="material-field">{content}</label>
  ) : (
    <div className="field">{content}</div>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="dialog-actions">{children}</div>;
}

const buttonVariants = {
  primary: "primary-button",
  secondary: "secondary-button",
  danger: "danger-button",
  filled: "filled-action",
  text: "text-action",
} as const;

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
}) {
  return (
    <button
      className={classNames("button", buttonVariants[variant], className)}
      type={type}
      {...props}
    />
  );
}

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark" aria-hidden="true">
          L
        </div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p className="auth-copy">{description}</p>
        {children}
      </section>
    </main>
  );
}
