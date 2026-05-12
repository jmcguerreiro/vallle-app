import { Fragment, useCallback, useRef } from "react";

const CODE_LENGTH = 9;
const VALID_CHARS = /[^A-Z2-9]/g;

/**
 * Component: VoucherCodeInput
 * Nine single-character inputs for voucher codes (XXX-XXX-XXX).
 * Auto-advances to the next input on entry, auto-rewinds on backspace.
 * Converts to uppercase and filters to valid characters only.
 * @component
 * @param {Object} props
 * @param {string} props.value - Raw value without dashes (up to 9 chars)
 * @param {Function} props.onChange - Called with the raw value (without dashes)
 * @param {string} [props.error] - Error message to display
 * @param {boolean} [props.autoFocus] - Focus the first input on mount
 * @returns {JSX.Element}
 */
const VoucherCodeInput = ({ value, onChange, error, autoFocus }) => {
  // Hooks
  const refs = useRef([]);

  // Derived State
  const chars = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] || "");

  // Handlers
  const setRef = useCallback((index, el) => {
    refs.current[index] = el;
  }, []);

  const handleChange = useCallback(
    (index, e) => {
      const clean = e.target.value.toUpperCase().replaceAll(VALID_CHARS, "");

      if (clean.length === 0) {
        const next = (value.slice(0, index) + value.slice(index + 1)).slice(
          0,
          CODE_LENGTH,
        );
        onChange(next);
        return;
      }

      const before = value.slice(0, index);
      const after = value.slice(index + 1);
      const next = (before + clean + after).slice(0, CODE_LENGTH);
      onChange(next);

      const advanceTo = Math.min(index + clean.length, CODE_LENGTH - 1);
      refs.current[advanceTo]?.focus();
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (index, e) => {
      if (e.key === "Backspace" && !chars[index] && index > 0) {
        e.preventDefault();
        const next = value.slice(0, index - 1) + value.slice(index);
        onChange(next);
        refs.current[index - 1]?.focus();
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        refs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
        e.preventDefault();
        refs.current[index + 1]?.focus();
      }
    },
    [chars, value, onChange],
  );

  const handleFocus = useCallback((e) => {
    e.target.select();
  }, []);

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .toUpperCase()
        .replaceAll(VALID_CHARS, "")
        .slice(0, CODE_LENGTH);
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
      refs.current[nextIndex]?.focus();
    },
    [onChange],
  );

  // Render
  return (
    <div
      className={`c-voucher-code-input${error ? " c-voucher-code-input--error" : ""}`}
    >
      {chars.map((char, i) => (
        <Fragment key={i}>
          <div className="c-voucher-code-input__input-segment">
            <input
              ref={(el) => setRef(i, el)}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              autoFocus={autoFocus && i === 0}
              className="c-voucher-code-input__input-segment-input"
              maxLength={1}
              onChange={(e) => handleChange(i, e)}
              onFocus={handleFocus}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              spellCheck={false}
              type="text"
              value={char}
            />
          </div>
          {(i === 2 || i === 5) && (
            <span className="c-voucher-code-input__input-segment-separator">
              –
            </span>
          )}
        </Fragment>
      ))}
      {error && <p className="c-voucher-code-input__error">{error}</p>}
    </div>
  );
};

export { CODE_LENGTH };
export default VoucherCodeInput;
