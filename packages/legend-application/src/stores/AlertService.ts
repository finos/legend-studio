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

import { action, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

export enum ActionAlertType {
  STANDARD = 'STANDARD',
  CAUTION = 'CAUTION',
  ERROR = 'ERROR',
}

export enum ActionAlertActionType {
  STANDARD = 'STANDARD',
  PROCEED_WITH_CAUTION = 'PROCEED_WITH_CAUTION',
  PROCEED = 'PROCEED',
}

export interface ActionAlertInfo {
  title?: string | undefined;
  message: string;
  prompt?: string | undefined;
  type?: ActionAlertType;
  onClose?: () => void;
  onEnter?: () => void;
  actions: {
    label: React.ReactNode;
    default?: boolean;
    handler?: () => void; // default to dismiss
    type?: ActionAlertActionType;
  }[];
}

export interface BlockingAlertInfo {
  message: string;
  prompt?: string;
  showLoading?: boolean;
}

export class AlertService {
  readonly applicationStore: GenericLegendApplicationStore;

  blockingAlertInfo?: BlockingAlertInfo | undefined;
  actionAlertInfo?: ActionAlertInfo | undefined;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      blockingAlertInfo: observable,
      actionAlertInfo: observable,
      setBlockingAlert: action,
      setActionAlertInfo: action,
    });

    this.applicationStore = applicationStore;
  }

  setBlockingAlert(alertInfo: BlockingAlertInfo | undefined): void {
    if (alertInfo) {
      this.applicationStore.keyboardShortcutsService.blockGlobalHotkeys();
    } else {
      this.applicationStore.keyboardShortcutsService.unblockGlobalHotkeys();
    }
    this.blockingAlertInfo = alertInfo;
  }

  setActionAlertInfo(alertInfo: ActionAlertInfo | undefined): void {
    if (this.actionAlertInfo && alertInfo) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Action alert is stacked: new alert is invoked while another one is being displayed',
      );
    }
    if (alertInfo) {
      this.applicationStore.keyboardShortcutsService.blockGlobalHotkeys();
    } else {
      this.applicationStore.keyboardShortcutsService.unblockGlobalHotkeys();
    }
    this.actionAlertInfo = alertInfo;
  }
}
