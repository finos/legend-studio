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
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';

export const QueryBuilderNavigationBlocker = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    useEffect(() => {
      applicationStore.navigationService.navigator.blockNavigation(
        [(): boolean => queryBuilderState.changeDetectionState.hasChanged],
        (onProceed: () => void): void => {
          applicationStore.alertService.setActionAlertInfo({
            message:
              'Unsaved changes will be lost if you continue. Do you still want to proceed?',
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'Proceed',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => onProceed(),
              },
              {
                label: 'Abort',
                type: ActionAlertActionType.PROCEED,
                default: true,
              },
            ],
          });
        },
        () =>
          applicationStore.notificationService.notifyWarning(
            `Navigation from the query builder is blocked`,
          ),
      );
      return (): void => {
        applicationStore.navigationService.navigator.unblockNavigation();
      };
    }, [applicationStore, queryBuilderState]);

    return null;
  },
);
