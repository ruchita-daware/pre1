/**
 * PreOne Enterprise Error Platform Core
 * Authoritative PreOneError class, taxonomy, factories, and normalization engine.
 */

import { ErrorCodes } from './error-codes'
import { getErrorMessage } from './error-messages'
import { redactSensitive } from './redaction'

export type ErrorClass = 'OPERATIONAL' | 'DEVELOPER'

export interface PreOneErrorOptions {
  class: ErrorClass
  code: string
  httpStatus: number
  userMessage: string
  module?: string
  field?: string
  details?: unknown
  context?: Record<string, unknown>
  cause?: unknown
  traceId?: string
}

export class PreOneError extends Error {
  readonly class: ErrorClass
  readonly code: string
  readonly httpStatus: number
  readonly userMessage: string
  readonly module: string
  readonly field?: string
  readonly details?: unknown
  readonly context?: Record<string, unknown>
  readonly cause?: unknown
  traceId?: string

  constructor(options: PreOneErrorOptions) {
    super(options.userMessage || options.code)
    this.name = 'PreOneError'
    this.class = options.class
    this.code = options.code
    this.httpStatus = options.httpStatus
    this.userMessage = options.userMessage
    this.module = options.module || 'system'
    this.field = options.field
    this.details = options.details ? redactSensitive(options.details) : undefined
    this.context = options.context ? redactSensitive(options.context) : undefined
    this.cause = options.cause
    this.traceId = options.traceId

    // Maintain V8 stack trace capture if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PreOneError)
    }
  }

  isOperational(): boolean {
    return this.class === 'OPERATIONAL'
  }

  isDeveloper(): boolean {
    return this.class === 'DEVELOPER'
  }

  /**
   * Produces a sanitized, safe representation for public API responses.
   * Strips internal stack traces and server-only context.
   */
  toPublicJson(): {
    code: string
    message: string
    field?: string
    details?: unknown
  } {
    return {
      code: this.code,
      message: this.userMessage,
      ...(this.field ? { field: this.field } : {}),
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

// -------------------------------------------------------------
// CENTRALIZED ERROR FACTORIES
// -------------------------------------------------------------

export function errValidation(
  message: string,
  field?: string,
  code: string = ErrorCodes.VALIDATION_GENERAL,
  details?: unknown,
  module?: string
): PreOneError {
  return new PreOneError({
    class: 'OPERATIONAL',
    code,
    httpStatus: 400,
    userMessage: message || getErrorMessage(code),
    field,
    details,
    module,
  })
}

export function errPermission(
  message?: string,
  code: string = ErrorCodes.PERMISSION_DENIED,
  module?: string
): PreOneError {
  return new PreOneError({
    class: 'OPERATIONAL',
    code,
    httpStatus: 403,
    userMessage: message || getErrorMessage(code),
    module,
  })
}

export function errNotFound(
  entity = 'Resource',
  code: string = ErrorCodes.NOT_FOUND_RESOURCE,
  module?: string
): PreOneError {
  const raw = (entity || 'Resource').trim()
  const userMessage = /not\s*found\.?$/i.test(raw)
    ? (raw.endsWith('.') ? raw : `${raw}.`)
    : /could\s+not\s+be\s+found\.?$/i.test(raw)
    ? (raw.endsWith('.') ? raw : `${raw}.`)
    : `${raw} could not be found.`
  return new PreOneError({
    class: 'OPERATIONAL',
    code,
    httpStatus: 404,
    userMessage,
    module,
  })
}

export function errConflict(
  message: string,
  code: string = ErrorCodes.CONFLICT_DUPLICATE_RECORD,
  field?: string,
  module?: string
): PreOneError {
  return new PreOneError({
    class: 'OPERATIONAL',
    code,
    httpStatus: 409,
    userMessage: message || getErrorMessage(code),
    field,
    module,
  })
}

export function errBusiness(
  code: string,
  message?: string,
  status = 422,
  details?: unknown,
  module?: string
): PreOneError {
  return new PreOneError({
    class: 'OPERATIONAL',
    code,
    httpStatus: status,
    userMessage: message || getErrorMessage(code),
    details,
    module,
  })
}

export function errAuth(
  message?: string,
  code: string = ErrorCodes.AUTH_REQUIRED
): PreOneError {
  return new PreOneError({
    class: 'OPERATIONAL',
    code,
    httpStatus: 401,
    userMessage: message || getErrorMessage(code),
    module: 'auth',
  })
}

export function errDeveloper(
  message: string,
  cause?: unknown,
  code: string = ErrorCodes.SYSTEM_INTERNAL_ERROR,
  module?: string
): PreOneError {
  return new PreOneError({
    class: 'DEVELOPER',
    code,
    httpStatus: 500,
    userMessage: 'Something went wrong on our side. Please try again or contact support.',
    cause,
    details: { internalMessage: message },
    module,
  })
}

// -------------------------------------------------------------
// NORMALIZATION ENGINE
// -------------------------------------------------------------

export function isPreOneError(error: unknown): error is PreOneError {
  return error instanceof PreOneError
}

export function isOperational(error: unknown): boolean {
  return isPreOneError(error) && error.class === 'OPERATIONAL'
}

export function isDeveloper(error: unknown): boolean {
  return !isOperational(error)
}

/**
 * Normalizes any arbitrary exception, rejection, Prisma error, or unknown value
 * into an authoritative, safe PreOneError.
 */
export function toPreOneError(err: unknown, defaultModule = 'system'): PreOneError {
  if (isPreOneError(err)) {
    return err
  }

  // 1. Prisma Known Request Errors
  if (err && typeof err === 'object' && 'code' in err && typeof (err as any).code === 'string') {
    const prismaCode = (err as any).code as string
    const meta = (err as any).meta

    if (prismaCode === 'P2002') {
      // Unique constraint violation
      const target = meta?.target
      const field = Array.isArray(target) ? target.join(', ') : target ? String(target) : undefined
      return new PreOneError({
        class: 'OPERATIONAL',
        code: ErrorCodes.CONFLICT_DUPLICATE_RECORD,
        httpStatus: 409,
        userMessage: 'A record with these details already exists.',
        field,
        module: defaultModule,
        cause: err,
      })
    }

    if (prismaCode === 'P2025') {
      // Record to update/delete not found
      return new PreOneError({
        class: 'OPERATIONAL',
        code: ErrorCodes.NOT_FOUND_RESOURCE,
        httpStatus: 404,
        userMessage: 'The requested record could not be found.',
        module: defaultModule,
        cause: err,
      })
    }

    if (prismaCode === 'P2003') {
      // Foreign key constraint failed
      return new PreOneError({
        class: 'OPERATIONAL',
        code: ErrorCodes.CONFLICT_DUPLICATE_RECORD,
        httpStatus: 409,
        userMessage: 'Operation violates a related data constraint or dependent record.',
        module: defaultModule,
        cause: err,
      })
    }
  }

  // 2. Zod Validation Errors
  if (err && typeof err === 'object' && 'issues' in err && Array.isArray((err as any).issues)) {
    const issues = (err as any).issues
    const firstIssue = issues[0]
    const field = firstIssue?.path ? firstIssue.path.join('.') : undefined
    const message = firstIssue?.message || 'Validation failed'

    return new PreOneError({
      class: 'OPERATIONAL',
      code: ErrorCodes.VALIDATION_GENERAL,
      httpStatus: 400,
      userMessage: message,
      field,
      details: { errors: issues },
      module: defaultModule,
      cause: err,
    })
  }

  // 3. Standard JS Error
  if (err instanceof Error) {
    const errCode = (err as any).code
    const httpStatus = (err as any).httpStatus || (err as any).status

    // Check if it's a known JS runtime crash error (syntax, type, reference, memory)
    const isRuntimeSystemCrash =
      err instanceof TypeError ||
      err instanceof ReferenceError ||
      err instanceof SyntaxError ||
      err instanceof RangeError ||
      (err as any).isDeveloper === true

    if (isRuntimeSystemCrash) {
      return new PreOneError({
        class: 'DEVELOPER',
        code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
        httpStatus: 500,
        userMessage: 'Something went wrong on our side. Please try again or contact support.',
        cause: err,
        details: { originalMessage: err.message },
        module: defaultModule,
      })
    }

    if (errCode && typeof errCode === 'string') {
      const statusNum =
        typeof httpStatus === 'number'
          ? httpStatus
          : errCode === 'VALIDATION_ERROR' || errCode === 'INVALID_INPUT' || errCode === 'AGE_INELIGIBLE' || errCode === 'CLASSROOM_FULL'
          ? 422
          : errCode === 'DUPLICATE_POSSIBLE' || errCode === 'PARENT_LIMIT_REACHED' || errCode === 'CONFLICT'
          ? 409
          : errCode === 'STUDENT_NOT_FOUND' || errCode === 'NOT_FOUND' || errCode === 'NOT_FOUND_CLASSROOM'
          ? 404
          : 400

      return new PreOneError({
        class: 'OPERATIONAL',
        code: errCode,
        httpStatus: statusNum,
        userMessage: err.message,
        cause: err,
        details: (err as any).details || (err as any).matches,
        module: defaultModule,
      })
    }

    // For standard Error instances thrown without an explicit code (e.g. business/validation rules)
    const isNotFound = /not found/i.test(err.message)
    const isConflict = /duplicate|already (exists|linked|taken)|limit reached/i.test(err.message)
    const isAgeOrCapacity = /age requirement|capacity|ineligible|minimum required|maximum permitted/i.test(err.message)
    const code = isNotFound
      ? ErrorCodes.NOT_FOUND_RESOURCE
      : isConflict
      ? ErrorCodes.CONFLICT_DUPLICATE_RECORD
      : isAgeOrCapacity
      ? 'AGE_INELIGIBLE'
      : ErrorCodes.VALIDATION_GENERAL

    const statusNum =
      typeof httpStatus === 'number'
        ? httpStatus
        : isNotFound
        ? 404
        : isConflict
        ? 409
        : isAgeOrCapacity
        ? 422
        : 400

    return new PreOneError({
      class: 'OPERATIONAL',
      code,
      httpStatus: statusNum,
      userMessage: err.message,
      cause: err,
      details: (err as any).details || (err as any).matches,
      module: defaultModule,
    })
  }

  // 4. String or Unknown Value
  return new PreOneError({
    class: 'DEVELOPER',
    code: ErrorCodes.SYSTEM_INTERNAL_ERROR,
    httpStatus: 500,
    userMessage: 'An unexpected error occurred. Please contact support.',
    cause: err,
    details: { raw: typeof err === 'string' ? err : 'Unknown error' },
    module: defaultModule,
  })
}
