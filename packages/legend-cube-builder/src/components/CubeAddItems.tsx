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
  MenuContentDivider,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  useDropdownMenu,
} from '@finos/legend-art';
import type { AnyNodeDefinition } from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import {
  OTHER_SOURCE_KIND_TITLE,
  READ_ONLY_CUBE_TITLE,
} from '../__lib__/LegendCubeLabels.js';
import { addCubeNode, canAddCubeNode } from '../stores/CubeAddPlacement.js';
import type { CubeEditorState } from '../stores/CubeEditorState.js';
import { CubeNodeIcon } from './CubeNodeIcon.js';

/** An item that adds a node, as the palette, the context menu and 'Add Items' list it */
interface CubeAddItem {
  readonly definition: AnyNodeDefinition;
  readonly label: string;
  readonly disabled: boolean;
  /** Why a source can't be added */
  readonly title: string | undefined;
  readonly add: () => void;
}

/**
 * The items that add a node, as the palette lists them (spec §17.2): the
 * sources the cube can take, then the transforms. Each adds where the
 * placement rule puts it (PLAN §11.6): after `nodeId` when given, else after
 * the selected node; a source opens the source dialog on its tab. An item
 * that can't be added is listed, disabled; a source says why. Read in an
 * observer's render.
 */
const getCubeAddItems = (
  editorState: CubeEditorState,
  nodeId?: string,
): { sources: CubeAddItem[]; transforms: CubeAddItem[] } => {
  const item = (definition: AnyNodeDefinition): CubeAddItem => {
    const disabled = !canAddCubeNode(editorState, definition.type, nodeId);
    return {
      definition,
      label: `${definition.label}${definition.beta ? ' (BETA)' : ''}`,
      disabled,
      title:
        disabled && definition.kind === 'source'
          ? (editorState.sourcePicker.disabledReason ?? OTHER_SOURCE_KIND_TITLE)
          : undefined,
      add: () => addCubeNode(editorState, definition.type, nodeId),
    };
  };
  return {
    sources: editorState.offeredSources.map(item),
    transforms: editorState.registry.transforms.map(item),
  };
};

/** The items, as the canvas's context menu lists them (spec §17.4) */
export const CubeAddMenuItems = observer(
  (props: { editorState: CubeEditorState; nodeId?: string | undefined }) => {
    const { sources, transforms } = getCubeAddItems(
      props.editorState,
      props.nodeId,
    );
    const menuItem = (item: CubeAddItem): React.ReactNode => (
      <MenuContentItem
        key={item.definition.type}
        disabled={item.disabled}
        title={item.title}
        onClick={item.add}
      >
        <MenuContentItemIcon>
          <CubeNodeIcon icon={item.definition.icon} />
        </MenuContentItemIcon>
        <MenuContentItemLabel>{item.label}</MenuContentItemLabel>
      </MenuContentItem>
    );
    return (
      <>
        {sources.map(menuItem)}
        <MenuContentDivider />
        {transforms.map(menuItem)}
      </>
    );
  },
);

/**
 * 'Add Items ▾' in the graph's header (spec §17.1, QUESTIONS.md U3(a)): the
 * palette's items, a transform added after the selected node, a source
 * through the source dialog. It opens no node editor. Its menu takes the
 * arrow keys, Enter and Escape, and gives the focus back to its button.
 */
export const CubeAddItemsMenu = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { readOnly } = editorState;
    const [openMenu, closeMenu, menuProps, isOpen] = useDropdownMenu();
    const { sources, transforms } = getCubeAddItems(editorState);
    const menuItem = (item: CubeAddItem): React.ReactNode => (
      <DropdownMenuItem
        key={item.definition.type}
        className={clsx(
          'flex items-center gap-2 px-2 text-base',
          item.disabled && '!cursor-not-allowed opacity-50',
        )}
        // not MUI's disabled, which takes the pointer away: a disabled
        // source's reason shows on hover
        aria-disabled={item.disabled}
        title={item.title}
        onClick={() => {
          if (!item.disabled) {
            closeMenu();
            item.add();
          }
        }}
      >
        <CubeNodeIcon icon={item.definition.icon} />
        <span>{item.label}</span>
      </DropdownMenuItem>
    );
    return (
      <>
        <button
          type="button"
          className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2 text-base text-[var(--color-text-primary)] enabled:cursor-pointer enabled:hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]"
          disabled={readOnly}
          title={
            readOnly
              ? READ_ONLY_CUBE_TITLE
              : 'Add a source, or a step after the selected node'
          }
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={openMenu}
        >
          Add Items
          <CaretDownIcon aria-hidden={true} />
        </button>
        <DropdownMenu
          {...menuProps}
          menuProps={{
            elevation: 7,
            slotProps: {
              root: { slotProps: { backdrop: { invisible: true } } },
              // the keyboard reaches a disabled source too, to read why
              list: { disabledItemsFocusable: true },
            },
          }}
        >
          {sources.map(menuItem)}
          <MenuContentDivider />
          {transforms.map(menuItem)}
        </DropdownMenu>
      </>
    );
  },
);
