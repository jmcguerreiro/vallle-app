import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const CODE_LENGTH = 9
const SEGMENT_LENGTH = 3
const VALID_CHARS = /[^A-Z2-9]/g

/**
 * Component: VoucherCodeInput
 * Three-segment input for voucher codes (XXX-XXX-XXX).
 * Auto-advances to the next segment when full, auto-rewinds on backspace.
 * Converts to uppercase and filters to valid characters only.
 * @component
 * @param {Object} props
 * @param {string} props.value - Raw value without dashes (up to 9 chars)
 * @param {Function} props.onChange - Called with the raw value (without dashes)
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.label] - Label text override
 * @returns {JSX.Element}
 */
const VoucherCodeInput = ({ value, onChange, error, label }) => {
  // Hooks
  const { t } = useTranslation()
  const refs = [useRef(null), useRef(null), useRef(null)]

  // Derived State
  const fieldLabel = label || t('features.vouchers.redeem.code')
  const segments = [
    value.slice(0, 3),
    value.slice(3, 6),
    value.slice(6, 9),
  ]

  // Handlers
  const handleChange = useCallback((segIndex, e) => {
    const clean = e.target.value.toUpperCase().replace(VALID_CHARS, '').slice(0, SEGMENT_LENGTH)
    const before = value.slice(0, segIndex * SEGMENT_LENGTH)
    const after = value.slice((segIndex + 1) * SEGMENT_LENGTH)
    const next = (before + clean + after).slice(0, CODE_LENGTH)
    onChange(next)

    if (clean.length === SEGMENT_LENGTH && segIndex < 2) {
      refs[segIndex + 1].current?.focus()
    }
  }, [value, onChange, refs])

  const handleKeyDown = useCallback((segIndex, e) => {
    if (e.key === 'Backspace' && segments[segIndex].length === 0 && segIndex > 0) {
      e.preventDefault()
      refs[segIndex - 1].current?.focus()
    }
  }, [segments, refs])

  const handleFocus = useCallback((e) => {
    e.target.select()
  }, [])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(VALID_CHARS, '').slice(0, CODE_LENGTH)
    onChange(pasted)
    const nextSegIndex = Math.min(Math.floor(pasted.length / SEGMENT_LENGTH), 2)
    refs[nextSegIndex].current?.focus()
  }, [onChange, refs])

  // Render
  return (
    <div className="c-form__field">
      <label className="c-form__field-label">
        {fieldLabel}
      </label>
      <div className={`c-voucher-code-input${error ? ' c-voucher-code-input--error' : ''}`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="c-voucher-code-input__segment">
            <input
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              className="c-voucher-code-input__box"
              maxLength={SEGMENT_LENGTH}
              onChange={(e) => handleChange(i, e)}
              onFocus={handleFocus}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              placeholder="XXX"
              ref={refs[i]}
              spellCheck={false}
              type="text"
              value={segments[i]}
            />
            {i < 2 && <span className="c-voucher-code-input__sep">–</span>}
          </div>
        ))}
      </div>
      {error && <p className="c-form__field-error">{error}</p>}
    </div>
  )
}

export { CODE_LENGTH }
export default VoucherCodeInput
