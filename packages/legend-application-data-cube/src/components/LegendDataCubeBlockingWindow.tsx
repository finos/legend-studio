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

import { DataCubeIcon, Dialog } from '@finos/legend-art';
import {
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  LayoutConfiguration,
  type WindowConfiguration,
} from '@finos/legend-data-cube';
import { action, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';

export const LegendDataCubeBlockingWindow = observer(
  (props: { windowState: LegendDataCubeBlockingWindowState }) => {
    const { windowState } = props;
    const ref = useRef<HTMLDivElement>(null);

    // set the width and height of the dialog to make sure content overflow works properly
    const handleEnter = () => {
      if (ref.current?.parentElement) {
        const { width, height } =
          ref.current.parentElement.getBoundingClientRect();
        ref.current.style.width = `${windowState.configuration.window.width ?? width}px`;
        ref.current.style.height = `${windowState.configuration.window.height ?? height}px`;
      }
    };

    if (!windowState.isOpen) {
      return null;
    }
    return (
      <Dialog
        open={windowState.isOpen}
        onClose={() => windowState.close()}
        slotProps={{
          transition: {
            onEnter: handleEnter,
          },
          paper: {
            elevation: 0,
          },
          backdrop: {
            classes: {
              root: 'bg-black !opacity-25',
            },
          },
        }}
        classes={{
          root: 'data-cube h-full w-full flex items-center justify-center',
          paper: 'min-h-10 min-w-40 rounded-none shadow-md',
        }}
      >
        <div
          className="border border-neutral-400 bg-neutral-200 shadow-xl"
          ref={ref}
        >
          <div className="flex h-6 w-full select-none items-center justify-between border-b border-b-neutral-300 bg-white">
            <div className="px-2">{windowState.configuration.title ?? ''}</div>
            <button
              className="flex h-[23px] w-6 items-center justify-center hover:bg-red-500 hover:text-white"
              onClick={() => windowState.close()}
            >
              <DataCubeIcon.X />
            </button>
          </div>
          <div className="h-[calc(100%_-_24px)] w-full overflow-auto">
            {windowState.configuration.contentRenderer(
              windowState.configuration,
            )}
          </div>
        </div>
      </Dialog>
    );
  },
);

export class LegendDataCubeBlockingWindowState {
  isOpen = false;
  readonly configuration: LayoutConfiguration;

  constructor(
    title: string,
    contentRenderer: (config: LayoutConfiguration) => React.ReactNode,
    windowConfiguration?: WindowConfiguration | undefined,
  ) {
    makeObservable(this, {
      isOpen: observable,
      open: action,
      close: action,
    });

    this.configuration = new LayoutConfiguration(title, contentRenderer);
    this.configuration.window = DEFAULT_TOOL_PANEL_WINDOW_CONFIG;
    if (windowConfiguration) {
      this.configuration.window = windowConfiguration;
    }
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }
}
