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
  useGridMenuItem,
  type CustomMenuItemProps,
} from '@ag-grid-community/react';

export function WIP_GridMenuItem({ name, subMenu }: CustomMenuItemProps) {
  useGridMenuItem({
    configureDefaults: () => true,
  });

  return (
    <div>
      <span className="ag-menu-option-part ag-menu-option-icon"></span>
      <span className="ag-menu-option-part ag-menu-option-text !inline-flex items-center">
        <span className="opacity-50">{name}</span>
        <WIP_Badge />
      </span>
      <span className="ag-menu-option-part ag-menu-option-shortcut"></span>
      <span className="ag-menu-option-part ag-menu-option-popup-pointer select-none">
        {subMenu && <span className="ag-icon ag-icon-small-right"></span>}
      </span>
    </div>
  );
}

export function WIP_Badge() {
  return (
    <div
      className="color-neutral-700 text-2xs ml-1 select-none rounded-md bg-sky-500 px-1 py-0.5 font-semibold text-white"
      title="Work In Progress"
    >
      WIP
    </div>
  );
}
