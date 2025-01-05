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

import { observer } from 'mobx-react-lite';
import type { DataCubeMenuItem } from '../stores/DataCubeOptions.js';
import { DataCubeTitleBar } from './DataCubeTitleBar.js';
import { DataCubeStatusBar } from './DataCubeStatusBar.js';
import type React from 'react';
import type { LayoutManager } from '../stores/services/DataCubeLayoutService.js';
import { DataCubeLayout } from './core/DataCubeLayout.js';
import { DataCubeIcon } from '@finos/legend-art';

export const DataCubePlaceholderErrorDisplay = (props: {
  message: string;
  prompt?: string | undefined;
}) => {
  const { message, prompt } = props;

  return (
    <div className="flex h-full w-full overflow-auto p-5">
      <div className="mr-3">
        <DataCubeIcon.AlertError className="flex-shrink-0 stroke-[0.5px] text-[40px] text-red-500" />
      </div>
      <div>
        <div className="whitespace-break-spaces text-lg">{message}</div>
        <div className="mt-1 whitespace-break-spaces text-neutral-500">
          {prompt}
        </div>
      </div>
    </div>
  );
};

export const DataCubeViewPlaceholder = observer(
  (props: { children?: React.ReactNode | undefined }) => {
    const { children } = props;

    return (
      <>
        <div className="h-[calc(100%_-_48px)] w-full border border-x-0 border-neutral-200 bg-neutral-50">
          {children ?? null}
        </div>
        <DataCubeStatusBar />
      </>
    );
  },
);

export const DataCubePlaceholder = observer(
  (props: {
    children?: React.ReactNode | undefined;
    title: string;
    menuItems?: DataCubeMenuItem[] | undefined;
    layoutManager?: LayoutManager | undefined;
    headerContent?: React.ReactNode | undefined;
  }) => {
    const { children, title, menuItems, headerContent, layoutManager } = props;

    return (
      <div className="data-cube relative flex h-full w-full flex-col bg-white">
        <DataCubeTitleBar title={title} menuItems={menuItems}>
          {headerContent ?? null}
        </DataCubeTitleBar>

        <DataCubeViewPlaceholder>{children}</DataCubeViewPlaceholder>
        {layoutManager ? <DataCubeLayout layout={layoutManager} /> : null}
      </div>
    );
  },
);
