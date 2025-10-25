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

import { Dialog, ModalBody, ModalFooter, ModalHeader } from '@finos/legend-art';
import {
  ActionAlertActionType,
  ActionAlertType,
  type ActionAlertInfo,
} from '../stores/AlertService.js';
import { observer } from 'mobx-react-lite';
import { noop } from '@finos/legend-shared';
import { useApplicationStore } from './ApplicationStoreProvider.js';

const getActionButtonClassName = (type: ActionAlertActionType): string => {
  switch (type) {
    case ActionAlertActionType.PROCEED_WITH_CAUTION:
      return 'btn--caution';
    case ActionAlertActionType.PROCEED:
    case ActionAlertActionType.STANDARD:
    default:
      return 'btn--dark';
  }
};

const ActionAlertContent = observer((props: { info: ActionAlertInfo }) => {
  const { info } = props;
  const applicationStore = useApplicationStore();
  const { title, message, prompt, type, onClose, onEnter, actions } = info;
  const handleClose = (): void => {
    onClose?.();
    applicationStore.alertService.setActionAlertInfo(undefined);
  };
  const handleEnter = (): void => onEnter?.();
  const handleSubmit = (): void => {
    actions.find((action) => action.default)?.handler?.();
    handleClose();
  };

  return (
    <Dialog
      open={Boolean(applicationStore.alertService.actionAlertInfo)}
      onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
      slotProps={{
        transition: { onEnter: handleEnter },
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className={`modal search-modal modal--dark blocking-alert blocking-alert--${(
          type ?? ActionAlertType.STANDARD
        ).toLowerCase()}`}
      >
        {title && <ModalHeader title={title} />}
        <ModalBody>
          <div className="blocking-alert__summary-text">{message}</div>
          <div className="blocking-alert__prompt-text">{prompt}</div>
        </ModalBody>
        <ModalFooter>
          {actions.map((action, idx) => {
            // NOTE: need to prevent default for the submit button, otherwise, we would get the warning "Form submission canceled because the form is not connected"
            // See https://stackoverflow.com/a/58234405
            const handler: React.ReactEventHandler<HTMLButtonElement> = (
              e,
            ): void => {
              e.preventDefault();
              action.handler?.();
              handleClose();
            };

            return (
              <button
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                type={action.default ? 'submit' : 'button'}
                className={`btn btn--dark ${getActionButtonClassName(
                  action.type ?? ActionAlertActionType.STANDARD,
                )}`}
                onClick={handler}
                autoFocus={Boolean(action.default)}
                // since this is a text button, no need for tooltip
              >
                {action.label}
              </button>
            );
          })}
          {!actions.length && (
            <button
              type="button" // prevent this toggler being activated on form submission
              className="btn btn--dark blocking-alert__action--standard"
              onClick={handleClose}
            >
              Cancel
            </button>
          )}
        </ModalFooter>
      </form>
    </Dialog>
  );
});

export const ActionAlert = observer(() => {
  const applicationStore = useApplicationStore();
  const actionAlertInfo = applicationStore.alertService.actionAlertInfo;

  if (!actionAlertInfo) {
    return null;
  }
  return <ActionAlertContent info={actionAlertInfo} />;
});
