interface FormFeedbackProps {
  error?: string;
  success?: string;
}

export function FormFeedback({ error, success }: FormFeedbackProps) {
  return (
    <>
      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {success}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
