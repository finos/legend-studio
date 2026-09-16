/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NetworkClientError } from '../network/NetworkUtils.js';
import { truncateMessageForTelemetry } from '../string/StringUtil.js';

/**
 * The error dimensions every failure telemetry event carries, so failure rates
 * across different actions are computed on the same fields.
 */
export type TelemetryErrorFields = {
  /**
   * Capped at `DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT`; see
   * `errorMessageTruncated`. The full message should always go to the log
   * service alongside this.
   */
  errorMessage: string;
  /**
   * Present and `true` only when `errorMessage` was clipped. Reported rather
   * than left implicit so a substring search that misses can be distinguished
   * from one that genuinely found nothing.
   */
  errorMessageTruncated?: boolean | undefined;
  errorName: string;
  /**
   * The response status, when the failure is a network error
   */
  httpStatus?: number | undefined;
};

/**
 * Derives the shared error dimensions from a thrown error.
 *
 * Every failure event wants the same four fields and the same message cap, so
 * this exists to keep them from drifting — before it, the block was repeated at
 * each failure callsite, and a cap applied in one place could silently be
 * forgotten in another.
 */
export const buildTelemetryErrorFields = (
  error: Error,
): TelemetryErrorFields => {
  const { message: errorMessage, truncated } = truncateMessageForTelemetry(
    error.message,
  );
  return {
    errorMessage,
    errorMessageTruncated: truncated ? true : undefined,
    errorName: error.name,
    httpStatus:
      error instanceof NetworkClientError ? error.response.status : undefined,
  };
};
