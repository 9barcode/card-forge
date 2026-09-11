export type UserErrorCode =
  | 'INVALID_MINI_APP_CATEGORY'
  | 'UNSUPPORTED_TOSS_APP_VERSION'
  | 'USER_IDENTITY_LOOKUP_FAILED'
  | 'INVALID_USER_IDENTITY_RESPONSE'
  | 'USER_API_REQUEST_FAILED'
  | 'INVALID_USER_API_RESPONSE'
  | 'USER_SESSION_NOT_INITIALIZED'
  | 'INVALID_DISPLAY_NAME';

export class UserError extends Error {
  readonly code: UserErrorCode;
  readonly cause?: unknown;
  readonly httpStatus?: number;
  readonly serverCode?: string;

  constructor(
    code: UserErrorCode,
    message: string,
    cause?: unknown,
    details?: { httpStatus?: number; serverCode?: string },
  ) {
    super(message);
    this.name = 'UserError';
    this.code = code;
    this.cause = cause;
    this.httpStatus = details?.httpStatus;
    this.serverCode = details?.serverCode;
  }
}
