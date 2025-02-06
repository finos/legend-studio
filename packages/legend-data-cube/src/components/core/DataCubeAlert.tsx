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

import { cn, DataCubeIcon } from '@finos/legend-art';
import { FormButton } from './DataCubeFormUtils.js';
import {
  AlertType,
  type ActionAlertAction,
} from '../../stores/services/DataCubeAlertService.js';

export function Alert(props: {
  message: string;
  type: AlertType;
  text?: string | undefined;
  actions?: ActionAlertAction[] | undefined;
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
          {type === AlertType.ERROR && (
            <DataCubeIcon.AlertError className="flex-shrink-0 stroke-[0.5px] text-[40px] text-red-500" />
          )}
          {type === AlertType.INFO && (
            <DataCubeIcon.AlertInfo className="flex-shrink-0 stroke-[0.5px] text-[40px] text-sky-500" />
          )}
          {type === AlertType.SUCCESS && (
            <DataCubeIcon.AlertSuccess className="flex-shrink-0 stroke-[0.5px] text-[40px] text-green-500" />
          )}
          {type === AlertType.WARNING && (
            <DataCubeIcon.AlertWarning className="flex-shrink-0 stroke-[0.3px] text-[40px] text-amber-500" />
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
        <div className="flex h-10 items-center justify-end border border-t-neutral-300 px-2">
          {actions.map((action, idx) => (
            <FormButton
              className="ml-2 first-of-type:ml-0"
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              onClick={() => {
                action.handler();
                onClose?.();
              }}
              autoFocus={idx === 0} // UX-wise, the first action should always be the default, i.e. auto-focus on the first button
            >
              {action.label}
            </FormButton>
          ))}
        </div>
      )}
    </div>
  );
}
