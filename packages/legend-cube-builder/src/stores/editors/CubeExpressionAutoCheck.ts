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

// Pure code checked as it is typed (user, 2026-10-16), in place of a
// Validate button: once typing pauses, the editor's check runs (parse, type,
// plan); an edit while it runs has it run again once it ends, so the last
// code is always the one checked.

/**
 * Where the code's check stands, which the code box's border shows (user,
 * 2026-10-16): not edited yet, waiting for typing to pause or being
 * checked, ready (green), or with a problem (red)
 */
export enum CubeCodeCheckStatus {
  UNEDITED = 'unedited',
  CHECKING = 'checking',
  READY = 'ready',
  PROBLEM = 'problem',
}

/** How long typing pauses before the code is checked */
export const CUBE_EXPRESSION_CHECK_DELAY_MS = 500;

export class CubeExpressionAutoCheck {
  private readonly check: () => Promise<void>;
  private readonly delayMs: number;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  /** An edit came while the check ran: check again once it ends */
  private again = false;
  private disposed = false;

  constructor(
    check: () => Promise<void>,
    delayMs = CUBE_EXPRESSION_CHECK_DELAY_MS,
  ) {
    this.check = check;
    this.delayMs = delayMs;
  }

  /** The code changed: check it once typing pauses */
  schedule(): void {
    if (this.disposed) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), this.delayMs);
  }

  /** Check now, e.g. on F10, without waiting for a pause */
  now(): void {
    if (this.disposed) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    this.run();
  }

  /** Whether a check waits for typing to pause */
  get isWaiting(): boolean {
    return this.timer !== undefined;
  }

  /** The editor closed: nothing more is checked */
  dispose(): void {
    this.disposed = true;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private run(): void {
    this.timer = undefined;
    if (this.disposed) {
      return;
    }
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    this.check()
      .catch(() => undefined)
      .finally(() => {
        this.running = false;
        if (this.again) {
          this.again = false;
          this.run();
        }
      });
  }
}
