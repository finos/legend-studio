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

import { ChevronLeftIcon, ChevronRightIcon, clsx } from '@finos/legend-art';
import {
  type AnyNodeDefinition,
  DataProductAccessPointSource,
} from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { useDrag } from 'react-dnd';
import {
  OTHER_SOURCE_KIND_TITLE,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  CUBE_DND_TYPE,
  type CubePaletteDragItem,
} from '../canvas/CubeCanvasDnd.js';
import { CubeNodeIcon } from '../CubeNodeIcon.js';

/** Shown in the palette while the cube has no node yet (spec §17.2, worded for the canvas) */
export const PALETTE_EMPTY_HINT = 'Drag items onto the canvas.';

/** What an item does, for its tooltip */
const describeItem = (definition: AnyNodeDefinition): string =>
  definition.kind === 'source'
    ? `Click, or drop it on the canvas, to pick ${definition.type === DataProductAccessPointSource.TYPE ? 'an access point' : 'a table'}`
    : 'Drag it onto a node to add it after that node, or onto the canvas to add it on its own; click to add it on its own';

const CubePaletteItem = observer(
  (props: {
    editorState: CubeEditorState;
    definition: AnyNodeDefinition;
    collapsed: boolean;
  }) => {
    const { editorState, definition, collapsed } = props;
    const { readOnly } = editorState;
    // a source of the other kind than the cube's can't be added (PLAN §6.8)
    const otherKind =
      !readOnly &&
      definition.kind === 'source' &&
      !editorState.canAddNode(definition.type);
    const disabled = readOnly || otherKind;
    const ref = useRef<HTMLDivElement>(null);
    const [, dragConnector] = useDrag<CubePaletteDragItem>(
      () => ({
        type: CUBE_DND_TYPE.PALETTE_ITEM,
        item: { nodeType: definition.type },
        canDrag: () =>
          !editorState.readOnly &&
          (definition.kind !== 'source' ||
            editorState.canAddNode(definition.type)),
      }),
      [editorState, definition.type, definition.kind],
    );
    dragConnector(ref);
    const label = `${definition.label}${definition.beta ? ' (BETA)' : ''}`;
    const add = (): void => {
      if (!disabled) {
        editorState.addNode(definition.type);
      }
    };
    return (
      // a div, not a button: browsers won't drag a button
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={label}
        className={clsx(
          'flex h-8 shrink-0 items-center gap-2 px-3 text-base',
          disabled
            ? 'cursor-not-allowed text-[var(--color-text-disabled)]'
            : 'cursor-grab hover:bg-[var(--color-bg-hover)]',
        )}
        title={
          readOnly
            ? READ_ONLY_CUBE_TITLE
            : otherKind
              ? OTHER_SOURCE_KIND_TITLE
              : collapsed
                ? `${label}: ${describeItem(definition)}`
                : describeItem(definition)
        }
        onClick={add}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            add();
          }
        }}
        data-testid={LEGEND_CUBE_TEST_ID.PALETTE_ITEM}
      >
        <CubeNodeIcon
          icon={definition.icon}
          className="shrink-0 text-[var(--color-text-secondary)]"
        />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate">{definition.label}</span>
        )}
        {!collapsed && definition.beta && (
          <span className="shrink-0 rounded-sm bg-[var(--color-accent)] px-1 text-xs font-medium text-[var(--color-text-on-accent)]">
            BETA
          </span>
        )}
      </div>
    );
  },
);

/**
 * The sidebar of node types to add (spec §17.2): the sources, then the
 * transforms in menu order, read from the registry, as the context menu is.
 * Collapsed, it shows icons only; that choice is kept per user.
 */
export const CubePalette = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const collapsed = editorState.isPaletteCollapsed;
    const { registry } = editorState;
    return (
      <div
        className={clsx(
          'flex h-full shrink-0 flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-panel)]',
          collapsed ? 'w-10' : 'w-56',
        )}
        data-testid={LEGEND_CUBE_TEST_ID.PALETTE}
      >
        <div className="flex h-8 shrink-0 items-center border-b border-[var(--color-border-default)] bg-[var(--color-bg-panel-header)] px-2">
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate text-base font-medium">
              Add to the query
            </span>
          )}
          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            title={collapsed ? 'Expand the palette' : 'Collapse the palette'}
            onClick={() => editorState.setPaletteCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>
        <div
          className="flex min-h-0 shrink flex-col overflow-auto py-1"
          role="group"
          aria-label="Palette"
        >
          {editorState.offeredSources.map((definition) => (
            <CubePaletteItem
              key={definition.type}
              editorState={editorState}
              definition={definition}
              collapsed={collapsed}
            />
          ))}
          <div
            className="mx-2 my-1 shrink-0 border-t border-[var(--color-border-default)]"
            role="separator"
          />
          {registry.transforms.map((definition) => (
            <CubePaletteItem
              key={definition.type}
              editorState={editorState}
              definition={definition}
              collapsed={collapsed}
            />
          ))}
        </div>
        {!collapsed && editorState.document.query.isEmpty && (
          <div className="shrink-0 px-3 py-2 text-sm text-[var(--color-text-muted)]">
            {PALETTE_EMPTY_HINT}
          </div>
        )}
      </div>
    );
  },
);
