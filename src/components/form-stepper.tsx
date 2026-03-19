interface FormStepperProps {
  steps: readonly string[];
  currentStep: number;
}

export function FormStepper({ steps, currentStep }: FormStepperProps): JSX.Element {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Form steps">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const active = stepNumber === currentStep;
        const completed = stepNumber < currentStep;

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={[
                "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                active ? "border-brand-accent bg-brand-accent/10 text-brand-ink" : "border-line bg-surface-0 text-text-muted",
                completed ? "border-transparent bg-brand-accent text-white" : ""
              ].join(" ")}
              aria-current={active ? "step" : undefined}
            >
              {stepNumber}
            </span>
            <span className={active ? "text-sm font-medium text-text-strong" : "text-sm text-text-muted"}>{step}</span>
            {index < steps.length - 1 ? <span className="mx-1 text-text-muted">→</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
