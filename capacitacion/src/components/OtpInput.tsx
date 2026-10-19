import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Ensure digits array is of correct length
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [autoFocus])

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        // Clear current
        const next = [...digits]
        next[index] = ''
        onChange(next.join(''))
      } else if (index > 0) {
        // Clear previous and focus it
        const next = [...digits]
        next[index - 1] = ''
        onChange(next.join(''))
        inputsRef.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleChange = (index: number, char: string) => {
    // Only accept alphanumeric characters (mostly numbers for Supabase OTP)
    const cleaned = char.replace(/[^a-zA-Z0-9]/g, '')
    if (!cleaned) return

    const next = [...digits]
    // If multiple characters typed or pasted via IME
    if (cleaned.length > 1) {
      const slice = cleaned.slice(0, length - index)
      for (let i = 0; i < slice.length; i++) {
        next[index + i] = slice[i]
      }
      onChange(next.join(''))
      const nextFocus = Math.min(index + slice.length, length - 1)
      inputsRef.current[nextFocus]?.focus()
      return
    }

    next[index] = cleaned[0]
    onChange(next.join(''))

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim().replace(/[^a-zA-Z0-9]/g, '')
    if (!pasted) return

    const next = Array.from({ length }, (_, i) => pasted[i] || '')
    onChange(next.join(''))

    const focusIndex = Math.min(pasted.length, length - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  return (
    <div className="otp-group" role="group" aria-label="Código de verificación de 6 dígitos">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          className={`otp-digit ${digit ? 'filled' : ''}`}
          value={digit}
          disabled={disabled}
          aria-label={`Dígito ${idx + 1}`}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  )
}
