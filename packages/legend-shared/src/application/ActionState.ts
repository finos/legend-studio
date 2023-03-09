/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { action, computed, makeObservable, observable } from 'mobx';

enum ACTION_STATE {
  INITIAL = 'INITIAL',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCEEDED',
  FAILED = 'FAILED',
}

export class ActionState {
  private state: ACTION_STATE;
  private _message: string | undefined;
  private _messageFormatter: ((message: string) => string) | undefined;

  protected constructor() {
    this.state = ACTION_STATE.INITIAL;
  }

  setMessage(val: string | undefined): void {
    this._message = val;
  }

  setMessageFormatter(val: ((message: string) => string) | undefined): void {
    this._messageFormatter = val;
  }

  reset(): ActionState {
    this.state = ACTION_STATE.INITIAL;
    return this;
  }

  inProgress(): ActionState {
    this.state = ACTION_STATE.IN_PROGRESS;
    return this;
  }

  fail(): ActionState {
    this.state = ACTION_STATE.FAILED;
    return this;
  }

  pass(): ActionState {
    this.state = ACTION_STATE.SUCCEEDED;
    return this;
  }

  complete(hasSucceeded = true): ActionState {
    if (hasSucceeded) {
      this.pass();
    } else {
      this.fail();
    }
    return this;
  }

  sync(val: ActionState): void {
    const data = val.exportData();
    this.state = data.state;
    this._message = data.message;
  }

  exportData(): { state: ACTION_STATE; message: string | undefined } {
    return {
      state: this.state,
      message: this._message,
    };
  }

  get isInInitialState(): boolean {
    return this.state === ACTION_STATE.INITIAL;
  }

  get isInProgress(): boolean {
    return this.state === ACTION_STATE.IN_PROGRESS;
  }

  get hasFailed(): boolean {
    return this.state === ACTION_STATE.FAILED;
  }

  get hasSucceeded(): boolean {
    return this.state === ACTION_STATE.SUCCEEDED;
  }

  get message(): string | undefined {
    return this._message
      ? this._messageFormatter
        ? this._messageFormatter(this._message)
        : this._message
      : undefined;
  }

  /**
   * Use this if only the completion state of the action is of concern,
   * i.e. we don't care if it fails or succeeds.
   */
  get hasCompleted(): boolean {
    return this.hasFailed || this.hasSucceeded;
  }

  static create(): ActionState {
    return makeObservable<ActionState, 'state' | '_message'>(
      new ActionState(),
      {
        state: observable,
        _message: observable,
        reset: action,
        inProgress: action,
        pass: action,
        fail: action,
        complete: action,
        setMessage: action,
        sync: action,
        isInInitialState: computed,
        isInProgress: computed,
        hasFailed: computed,
        hasSucceeded: computed,
        hasCompleted: computed,
        message: computed,
      },
    );
  }
}
