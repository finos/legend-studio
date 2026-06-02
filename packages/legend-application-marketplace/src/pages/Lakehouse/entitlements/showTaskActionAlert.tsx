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

import { TextField } from '@mui/material';
import {
  ActionAlertActionType,
  type ActionAlertType,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { assertErrorThrown } from '@finos/legend-shared';

export function showTaskActionAlert(options: {
  applicationStore: GenericLegendApplicationStore;
  title: string;
  message: string;
  confirmLabel: string;
  alertType: ActionAlertType;
  requireJustification?: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onConfirm: (justification: string) => Promise<void>;
  errorPrefix: string;
}): void {
  const {
    applicationStore,
    title,
    message,
    confirmLabel,
    alertType,
    requireJustification = false,
    isLoading,
    setIsLoading,
    onConfirm,
    errorPrefix,
  } = options;

  let justification = '';
  applicationStore.alertService.setActionAlertInfo({
    title,
    message,
    prompt: (
      <TextField
        fullWidth={true}
        autoFocus={true}
        multiline={true}
        minRows={3}
        placeholder="Business Justification"
        onChange={(e) => {
          justification = e.target.value;
        }}
        className="marketplace-lakehouse-entitlements__data-access-request-viewer__justification-field"
      />
    ),
    type: alertType,
    actions: [
      {
        label: confirmLabel,
        type: ActionAlertActionType.PROCEED_WITH_CAUTION,
        handler: () => {
          if (requireJustification && !justification.trim()) {
            applicationStore.notificationService.notifyError(
              'Business justification is required',
            );
            return;
          }
          if (!isLoading) {
            setIsLoading(true);
            onConfirm(justification)
              .catch((error) => {
                assertErrorThrown(error);
                applicationStore.notificationService.notifyError(
                  `${errorPrefix}: ${error.message}`,
                );
              })
              .finally(() => {
                setIsLoading(false);
              });
          }
        },
      },
      {
        label: 'Cancel',
        type: ActionAlertActionType.PROCEED,
        default: true,
      },
    ],
  });
}
