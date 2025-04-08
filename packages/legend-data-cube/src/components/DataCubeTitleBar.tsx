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
  useDropdownMenu,
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DataCubeNativeMenuItem,
  type DataCubeMenuItem,
} from '../stores/DataCubeOptions.js';
import { useState } from 'react';
import { isObject } from '@finos/legend-shared';

export const DataCubeTitleBar = observer(
  (props: {
    children: React.ReactNode;
    title: string;
    menuItems?: (DataCubeMenuItem | DataCubeNativeMenuItem)[] | undefined;
    getMenuItems?:
      | (() => (DataCubeMenuItem | DataCubeNativeMenuItem)[])
      | undefined;
  }) => {
    const { children, title, menuItems, getMenuItems } = props;
    const [openMenuDropdown, closeMenuDropdown, menuDropdownProps] =
      useDropdownMenu();
    const [items, setItems] = useState([...(menuItems ?? [])]);

    return (
      <div className="flex h-7 w-full bg-neutral-100">
        <div className="flex w-fit max-w-80 items-center pl-1 pr-2 text-lg font-medium">
          <DataCubeIcon.Cube className="mr-1 h-4 w-4 flex-shrink-0" />
          <div className="truncate">{title}</div>
        </div>
        <div className="flex w-full flex-auto">
          {children}
          <button
            className="flex aspect-square h-full flex-shrink-0 items-center justify-center text-lg disabled:text-neutral-400"
            onClick={(event) => {
              const extraItems = getMenuItems?.() ?? [];
              if (extraItems.length) {
                extraItems.unshift(DataCubeNativeMenuItem.SEPARATOR);
              }
              setItems([...(menuItems ?? []), ...extraItems]);
              openMenuDropdown(event);
            }}
            disabled={!menuItems?.length}
          >
            <DataCubeIcon.Menu />
          </button>
          <DropdownMenu
            {...menuDropdownProps}
            menuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              classes: {
                paper: 'rounded-none mt-[1px]',
                list: 'w-40 p-0 rounded-none border border-neutral-400 bg-white overflow-y-auto py-0.5',
              },
            }}
          >
            {items.map((item, idx) => {
              if (isObject(item)) {
                return (
                  <DropdownMenuItem
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
                    onClick={() => {
                      item.action();
                      closeMenuDropdown();
                    }}
                    disabled={Boolean(item.disabled)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                );
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              } else if (item === DataCubeNativeMenuItem.SEPARATOR) {
                return (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className="my-1 h-[1px] w-full bg-neutral-200"
                  />
                );
              }
              return null;
            })}
          </DropdownMenu>
        </div>
      </div>
    );
  },
);
