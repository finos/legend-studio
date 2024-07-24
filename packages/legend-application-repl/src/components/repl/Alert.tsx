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
  ActionAlertType,
  useApplicationStore,
  type ActionAlertInfo,
} from '@finos/legend-application';
import { cn, DataCubeIcon, Dialog } from '@finos/legend-art';
import { isString, noop } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';

export enum AlertType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export type AlertAction = {
  label: string;
  handler: () => void;
};

export function Alert(props: {
  message: string;
  type: AlertType;
  text?: string | undefined;
  actions?: AlertAction[] | undefined;
  onClose?: () => void;
}) {
  const { message, type, text, actions = [], onClose } = props;

  return (
    <div className="h-full w-full">
      <div
        className={cn('flex w-full overflow-auto p-6', {
          'h-[calc(100%_-_40px)]': actions.length !== 0,
          'h-full': !actions.length,
        })}
      >
        <div className="mr-3">
          {type === AlertType.INFO && (
            <DataCubeIcon.AlertInfo className="flex-shrink-0 stroke-[0.5px] text-[40px] text-sky-500" />
          )}
          {type === AlertType.WARNING && (
            <DataCubeIcon.AlertWarning className="flex-shrink-0 stroke-[0.3px] text-[40px] text-amber-500" />
          )}
          {type === AlertType.ERROR && (
            <DataCubeIcon.AlertError className="flex-shrink-0 stroke-[0.5px] text-[40px] text-red-500" />
          )}
        </div>
        <div>
          <div className="whitespace-break-spaces text-lg">{message}</div>
          <div className="mt-1 whitespace-break-spaces text-neutral-500">
            {text}
          </div>
        </div>
      </div>
      {actions.length !== 0 && (
        <div className="flex h-10 items-center justify-center border border-t-neutral-300 px-2">
          {actions.map((action, idx) => (
            <button
              className="ml-2 h-6 border border-neutral-400 bg-neutral-300 px-2 first-of-type:ml-0 hover:brightness-95"
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              onClick={() => {
                action.handler();
                onClose?.();
              }}
              autoFocus={idx === 0} // UX-wise, the first action should always be the default, i.e. auto-focus on the first button
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const BlockingActionAlertContent = observer(
  (props: { info: ActionAlertInfo }) => {
    const { info } = props;
    const { title, message, prompt, type, onClose, actions } = info;
    const ref = useRef<HTMLDivElement>(null);
    const application = useApplicationStore();
    const handleClose = () => {
      onClose?.();
      application.alertService.setActionAlertInfo(undefined);
    };

    // set the width and height of the dialog to make sure content overflow works properly
    const handleEnter = () => {
      if (ref.current && ref.current.parentElement) {
        const { width, height } =
          ref.current.parentElement.getBoundingClientRect();
        ref.current.style.width = `${width}px`;
        ref.current.style.height = `${height}px`;
      }
    };

    return (
      <Dialog
        open={Boolean(application.alertService.actionAlertInfo)}
        onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
        TransitionProps={{
          onEnter: handleEnter,
        }}
        PaperProps={{
          elevation: 0,
        }}
        slotProps={{
          backdrop: {
            classes: {
              root: 'bg-black !opacity-25',
            },
          },
        }}
        classes={{
          root: 'h-full w-full flex items-center justify-center',
          paper: 'min-h-10 min-w-40 rounded-none shadow-md',
        }}
      >
        <div
          className="border border-neutral-400 bg-neutral-200 shadow-xl"
          ref={ref}
        >
          <div className="flex h-6 w-full select-none items-center justify-between border-b border-b-neutral-300 bg-white">
            <div className="px-2">{title ?? ''}</div>
          </div>
          <div className="h-[calc(100%_-_24px)] w-full">
            <Alert
              type={
                type === ActionAlertType.STANDARD
                  ? AlertType.INFO
                  : type === ActionAlertType.CAUTION
                    ? AlertType.WARNING
                    : AlertType.ERROR
              }
              message={message}
              text={prompt}
              actions={actions
                .filter((action) => isString(action.label))
                .sort((a, b) => (a.default ? -1 : 1))
                .map((action) => ({
                  label: action.label as string,
                  handler: () => {
                    action.handler?.();
                    handleClose();
                  },
                }))}
            />
          </div>
        </div>
      </Dialog>
    );
  },
);

export const BlockingActionAlert = observer(() => {
  const application = useApplicationStore();
  const info = application.alertService.actionAlertInfo;

  if (!info) {
    return null;
  }
  return <BlockingActionAlertContent info={info} />;
});
