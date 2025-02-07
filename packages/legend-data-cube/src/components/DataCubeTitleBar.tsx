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
import type { DataCubeMenuItem } from '../stores/DataCubeOptions.js';

export const DataCubeTitleBar = observer(
  (props: {
    children: React.ReactNode;
    title: string;
    menuItems?: DataCubeMenuItem[] | undefined;
  }) => {
    const { children, title, menuItems } = props;
    const [openMenuDropdown, closeMenuDropdown, menuDropdownProps] =
      useDropdownMenu();

    return (
      <div className="flex h-7 justify-between bg-neutral-100">
        <div className="flex items-center overflow-hidden pl-1 pr-2 text-lg font-medium">
          <DataCubeIcon.Cube className="mr-1 h-4 w-4 flex-shrink-0" />
          <div className="text-ellipsis whitespace-nowrap">{title}</div>
        </div>
        <div className="flex">
          {children}
          <button
            className="flex aspect-square h-full flex-shrink-0 items-center justify-center text-lg disabled:text-neutral-400"
            onClick={openMenuDropdown}
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
                list: 'w-40 p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
              },
            }}
          >
            {menuItems?.map((item, idx) => (
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
            ))}
          </DropdownMenu>
        </div>
      </div>
    );
  },
);
