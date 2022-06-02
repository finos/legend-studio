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

import { Dialog } from '@finos/legend-art';
import {
  ActionAlertActionType,
  ActionAlertType,
  type ActionAlertInfo,
} from '../stores/ApplicationStore.js';
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

const ActionAlertInner = observer((props: { info: ActionAlertInfo }) => {
  const { info } = props;
  const applicationStore = useApplicationStore();
  const { title, message, prompt, type, onClose, onEnter, actions } = info;
  const handleClose = (): void => {
    onClose?.();
    applicationStore.setActionAlertInfo(undefined);
  };
  const handleEnter = (): void => onEnter?.();
  const handleSubmit = (): void => {
    actions.find((action) => action.default)?.handler?.();
    handleClose();
  };
  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    handleSubmit();
  };

  return (
    <Dialog
      open={Boolean(applicationStore.actionAlertInfo)}
      onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
      TransitionProps={{
        onEnter: handleEnter,
      }}
    >
      <form
        onSubmit={onSubmit}
        className={`modal search-modal modal--dark blocking-alert blocking-alert--${(
          type ?? ActionAlertType.STANDARD
        ).toLowerCase()}`}
      >
        {title && (
          <div className="modal__header">
            <div className="modal__title">
              <div className="modal__title__label">{title}</div>
            </div>
          </div>
        )}
        <div className="modal__body">
          <div className="blocking-alert__summary-text">{message}</div>
          <div className="blocking-alert__prompt-text">{prompt}</div>
        </div>
        <div className="modal__footer">
          {actions.map((action) => {
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
                key={action.label}
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
              type="button"
              className="btn btn--dark blocking-alert__action--standard"
              onClick={handleClose}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
});

export const ActionAlert = observer(() => {
  const applicationStore = useApplicationStore();
  const actionAlertInfo = applicationStore.actionAlertInfo;

  if (!actionAlertInfo) {
    return null;
  }
  return <ActionAlertInner info={actionAlertInfo} />;
});
