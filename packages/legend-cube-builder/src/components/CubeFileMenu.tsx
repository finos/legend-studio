/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  CaretDownIcon,
  clsx,
  DropdownMenu,
  DropdownMenuItem,
  useDropdownMenu,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { READ_ONLY_CUBE_TITLE } from '../__lib__/LegendCubeLabels.js';
import type { CubeEditorState } from '../stores/CubeEditorState.js';

interface CubeFileMenuItem {
  readonly label: string;
  readonly title: string;
  readonly disabled: boolean;
  readonly run: () => void;
}

/**
 * 'Cube ▾' in the graph's header (the review of the demo, 2026-10-13): what
 * acts on the cube as a whole, New, Import, Import Pure and Export, under one button, so
 * the header keeps the actions used while building. A disabled item says why
 * on hover.
 */
export const CubeFileMenu = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { readOnly } = editorState;
    const [openMenu, closeMenu, menuProps, isOpen] = useDropdownMenu();
    const items: CubeFileMenuItem[] = [
      {
        label: 'New',
        title: editorState.isEmptyCube
          ? 'This cube is new already'
          : 'Start a new, empty cube in place of this one (Undo brings it back)',
        disabled: editorState.isEmptyCube,
        run: () => editorState.startNewCube(),
      },
      {
        label: 'Import',
        title: 'Open a cube from its spec, in place of this one',
        disabled: false,
        run: () => editorState.specTransfer.openImport(),
      },
      {
        label: 'Import Pure',
        title: 'Read a Pure query into steps, in place of this cube',
        disabled: false,
        run: () => editorState.lambdaImport.openDialog(),
      },
      {
        label: 'Export',
        title: readOnly
          ? READ_ONLY_CUBE_TITLE
          : "Show the cube's spec, to copy or download",
        disabled: readOnly,
        run: () => {
          if (editorState.nodeEditor.finishApplied()) {
            editorState.specTransfer.openExport();
          }
        },
      },
    ];
    return (
      <>
        <button
          type="button"
          className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2 text-base text-[var(--color-text-primary)] enabled:cursor-pointer enabled:hover:bg-[var(--color-bg-hover)]"
          title="New, Import, Import Pure and Export"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={openMenu}
        >
          Cube
          <CaretDownIcon aria-hidden={true} />
        </button>
        <DropdownMenu
          {...menuProps}
          menuProps={{
            elevation: 7,
            slotProps: {
              root: { slotProps: { backdrop: { invisible: true } } },
              list: { disabledItemsFocusable: true },
            },
          }}
        >
          {items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              className={clsx(
                'px-2 text-base',
                item.disabled && '!cursor-not-allowed opacity-50',
              )}
              // not MUI's disabled, which takes the pointer away: the reason shows on hover
              aria-disabled={item.disabled}
              title={item.title}
              onClick={() => {
                if (!item.disabled) {
                  closeMenu();
                  item.run();
                }
              }}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      </>
    );
  },
);
