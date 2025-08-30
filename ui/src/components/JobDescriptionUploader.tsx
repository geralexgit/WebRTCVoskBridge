import { JSX } from 'preact/jsx-runtime'

interface JobDescriptionUploaderProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  label?: string
}

export function JobDescriptionUploader({
  value,
  onChange,
  onSubmit,
  placeholder = 'Paste or type the job description here... (supports up to 4000 characters)',
  disabled = false,
  maxLength = 4000,
  label = 'Job Description'
}: JobDescriptionUploaderProps): JSX.Element {
  const remaining = Math.max(0, maxLength - (value?.length || 0))
  const isEmpty = !value || value.trim().length === 0

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    onChange(target.value)
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (onSubmit && !isEmpty && !disabled) onSubmit()
  }

  return (
    <form class="job-description-uploader" onSubmit={handleSubmit}>
      <div class="jdu-header">
        <label class="jdu-label" for="jobDescriptionTextarea">{label}</label>
        <div class="jdu-meta">
          <span class="jdu-counter">{remaining} characters left</span>
        </div>
      </div>

      <textarea
        id="jobDescriptionTextarea"
        class="jdu-textarea"
        rows={8}
        value={value}
        placeholder={placeholder}
        onInput={handleInput}
        disabled={disabled}
        maxlength={maxLength}
      />

      <div class="jdu-actions">
        <button
          type="submit"
          class={`jdu-submit ${disabled || isEmpty ? 'disabled' : ''}`}
          disabled={disabled || isEmpty}
        >
          Save Description
        </button>
      </div>
    </form>
  )
}


