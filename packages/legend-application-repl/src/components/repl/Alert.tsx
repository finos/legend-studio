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
import { DataCubeIcon, Dialog } from '@finos/legend-art';
import { noop } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';

export function ErrorAlert(props: {
  message: string;
  text?: string | undefined;
}) {
  const { message, text } = props;
  return (
    <div className="h-full w-full overflow-auto p-4">
      <div className="relative pl-2.5">
        <DataCubeIcon.Error className="absolute -top-[1px] left-0 flex-shrink-0 stroke-[0.5px] text-2xl text-red-500" />
        <pre className="ml-4 font-sans">{message}</pre>
      </div>
      <pre className="mt-1.5 font-sans text-neutral-500">{text}</pre>
    </div>
  );
}

const ActionAlertContent = observer((props: { info: ActionAlertInfo }) => {
  const { info } = props;
  const { title, message, prompt, type, onClose, onEnter, actions } = info;
  const application = useApplicationStore();
  const handleClose = (): void => {
    onClose?.();
    application.alertService.setActionAlertInfo(undefined);
  };
  const handleEnter = (): void => onEnter?.();
  const handleSubmit = (): void => {
    actions.find((action) => action.default)?.handler?.();
    handleClose();
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
      <div className="h-full w-full border border-neutral-400 bg-neutral-200 shadow-xl">
        <div className="flex h-6 w-full select-none items-center justify-between border-b border-b-neutral-300 bg-white">
          <div className="px-2">{title ?? ''}</div>
        </div>
        <form
          className="w-full overflow-auto p-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="relative pl-2.5">
            {type === ActionAlertType.STANDARD && (
              <DataCubeIcon.Info className="absolute -top-[1px] left-0 flex-shrink-0 stroke-[0.5px] text-2xl text-sky-500" />
            )}
            {type === ActionAlertType.CAUTION && (
              <DataCubeIcon.Warning className="absolute -top-[1px] left-0 flex-shrink-0 stroke-2 text-2xl text-amber-500" />
            )}
            {type === ActionAlertType.ERROR && (
              <DataCubeIcon.Error className="absolute -top-[1px] left-0 flex-shrink-0 stroke-[0.5px] text-2xl text-red-500" />
            )}
            <pre className="ml-4 font-sans">{message}</pre>
          </div>
          <pre className="mt-1.5 font-sans text-neutral-500">{prompt}</pre>
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
                onClick={handler}
                autoFocus={Boolean(action.default)}
              >
                {action.label}
              </button>
            );
          })}
        </form>
      </div>
    </Dialog>
  );
});

export const ActionAlert = observer(() => {
  const application = useApplicationStore();
  const info = application.alertService.actionAlertInfo;

  if (!info) {
    return null;
  }
  return <ActionAlertContent info={info} />;
});
