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

import {
  ApplicationError,
  assertErrorThrown,
  assertTrue,
  isString,
  type SuperGenericFunction,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export const DEFAULT_NOTIFICATION_HIDE_TIME = 6000; // ms
export const DEFAULT_ERROR_NOTIFICATION_HIDE_TIME = 10000; // ms

export enum NOTIFCATION_SEVERITY {
  ILEGAL_STATE = 'ILEGAL_STATE', // highest priority since this implies bugs - we expect user to never see this
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  INFO = 'INFO',
}

export class Notification {
  severity: NOTIFCATION_SEVERITY;
  message: string;
  details?: string | undefined;
  autoHideDuration?: number | undefined;

  constructor(
    severity: NOTIFCATION_SEVERITY,
    message: string,
    details: string | undefined,
    autoHideDuration: number | undefined,
  ) {
    this.severity = severity;
    this.message = message;
    this.details = details;
    this.autoHideDuration = autoHideDuration;
  }
}

export class NotificationService {
  notification?: Notification | undefined;

  constructor() {
    makeObservable(this, {
      notification: observable,
      setNotification: action,
      notify: action,
      notifySuccess: action,
      notifyWarning: action,
      notifyIllegalState: action,
      notifyError: action,
    });
  }

  setNotification(notification: Notification | undefined): void {
    this.notification = notification;
  }

  notify(
    message: string,
    details?: string | undefined,
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.INFO,
        message,
        details,
        autoHideDuration === null
          ? undefined
          : (autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME),
      ),
    );
  }

  notifySuccess(
    message: string,
    details?: string | undefined,
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.SUCCESS,
        message,
        details,
        autoHideDuration === null
          ? undefined
          : (autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME),
      ),
    );
  }

  notifyWarning(
    content: string | Error,
    details?: string | undefined,
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.WARNING,
        content instanceof Error ? content.message : content,
        details,
        autoHideDuration === null
          ? undefined
          : (autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME),
      ),
    );
  }

  notifyError(content: Error | string, details?: string | undefined): void {
    const message = this.getErrorMessage(content);
    if (message) {
      this.setNotification(
        new Notification(
          NOTIFCATION_SEVERITY.ERROR,
          message,
          details,
          undefined,
        ),
      );
    }
  }

  getErrorMessage(content: Error | string): string | undefined {
    let message: string | undefined;
    if (content instanceof ApplicationError) {
      message = content.detail;
    } else if (content instanceof Error) {
      message = content.message;
    } else {
      assertTrue(isString(content), `Can't display error`);
      message = content;
    }
    return message;
  }

  notifyIllegalState(
    message: string,
    details?: string | undefined,
    autoHideDuration?: number | null,
  ): void {
    this.setNotification(
      new Notification(
        NOTIFCATION_SEVERITY.ILEGAL_STATE,
        isString(message) ? `[PLEASE NOTIFY DEVELOPER] ${message}` : message,
        details,
        autoHideDuration === null
          ? undefined
          : (autoHideDuration ?? DEFAULT_NOTIFICATION_HIDE_TIME),
      ),
    );
  }

  notifyUnsupportedFeature(featureName: string): void {
    this.notifyWarning(`Unsupported feature: ${featureName}`);
  }

  /**
   * This function creates a more user-friendly way to throw error in the UI. Rather than crashing the whole app, we will
   * just notify and replacing the value should get with an alternative (e.g. `undefined`). A good use-case for this
   * is where we would not expect an error to throw (i.e. `IllegalStateError`), but we want to be sure that if the error
   * ever occurs, it still shows very apparently in the UI, as such, printing out in the console is not good enough,
   * but crashing the app is bad too, so this is a good balance.
   */
  notifyAndReturnAlternativeOnError = <U extends SuperGenericFunction, W>(
    fn: U,
    alternative: W,
  ): ReturnType<U> | W | undefined => {
    try {
      return fn();
    } catch (error) {
      assertErrorThrown(error);
      this.notifyIllegalState(error.message);
      return alternative;
    }
  };
}
