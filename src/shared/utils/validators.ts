/**
 * Validation Rules
 * Reusable validation functions for form fields
 */

export type Validator = (value: unknown) => string | true
export type AsyncValidator = (value: unknown) => Promise<string | true>

/**
 * Required field validator
 */
export function required(message: string = 'This field is required'): Validator {
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return message
    }
    if (Array.isArray(value) && value.length === 0) {
      return message
    }
    return true
  }
}

/**
 * Email validator
 */
export function email(message: string = 'Please enter a valid email address'): Validator {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return (value: unknown) => {
    if (!value) return true // Allow empty if not required
    if (typeof value !== 'string') return message
    return emailRegex.test(value) || message
  }
}

/**
 * Minimum length validator
 */
export function minLength(
  min: number,
  message?: string
): Validator {
  const defaultMessage = `Must be at least ${min} characters`
  return (value: unknown) => {
    if (!value) return true // Allow empty if not required
    const str = String(value)
    return str.length >= min || message || defaultMessage
  }
}

/**
 * Maximum length validator
 */
export function maxLength(
  max: number,
  message?: string
): Validator {
  const defaultMessage = `Must be no more than ${max} characters`
  return (value: unknown) => {
    if (!value) return true // Allow empty if not required
    const str = String(value)
    return str.length <= max || message || defaultMessage
  }
}

/**
 * Minimum value validator (for numbers)
 */
export function min(
  minValue: number,
  message?: string
): Validator {
  const defaultMessage = `Must be at least ${minValue}`
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') return true
    const num = Number(value)
    if (isNaN(num)) return message || defaultMessage
    return num >= minValue || message || defaultMessage
  }
}

/**
 * Maximum value validator (for numbers)
 */
export function max(
  maxValue: number,
  message?: string
): Validator {
  const defaultMessage = `Must be no more than ${maxValue}`
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') return true
    const num = Number(value)
    if (isNaN(num)) return message || defaultMessage
    return num <= maxValue || message || defaultMessage
  }
}

/**
 * Pattern (regex) validator
 */
export function pattern(
  regex: RegExp,
  message: string = 'Invalid format'
): Validator {
  return (value: unknown) => {
    if (!value) return true // Allow empty if not required
    const str = String(value)
    return regex.test(str) || message
  }
}

/**
 * URL validator
 */
export function url(message: string = 'Please enter a valid URL'): Validator {
  try {
    return (value: unknown) => {
      if (!value) return true // Allow empty if not required
      const str = String(value)
      new URL(str)
      return true
    }
  } catch {
    return (value: unknown) => {
      if (!value) return true
      const str = String(value)
      try {
        new URL(str)
        return true
      } catch {
        return message
      }
    }
  }
}

/**
 * Numeric validator
 */
export function numeric(message: string = 'Must be a number'): Validator {
  return (value: unknown) => {
    if (!value) return true // Allow empty if not required
    const num = Number(value)
    return !isNaN(num) && isFinite(num) || message
  }
}

/**
 * Integer validator
 */
export function integer(message: string = 'Must be an integer'): Validator {
  return (value: unknown) => {
    if (!value) return true // Allow empty if not required
    const num = Number(value)
    return (!isNaN(num) && isFinite(num) && Number.isInteger(num)) || message
  }
}

/**
 * Compose multiple validators
 * Returns first error message or true if all pass
 */
export function compose(...validators: Validator[]): Validator {
  return (value: unknown) => {
    for (const validator of validators) {
      const result = validator(value)
      if (result !== true) {
        return result
      }
    }
    return true
  }
}

/**
 * Conditional validator - only validate if condition is true
 */
export function when(
  condition: (value: unknown) => boolean,
  validator: Validator
): Validator {
  return (value: unknown) => {
    if (!condition(value)) {
      return true
    }
    return validator(value)
  }
}

