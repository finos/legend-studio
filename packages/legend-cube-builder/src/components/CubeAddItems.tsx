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
  BasePopper,
  CaretDownIcon,
  CaretRightIcon,
  clsx,
  DropdownMenu,
  DropdownMenuItem,
  MenuContentDivider,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  useDropdownMenu,
} from '@finos/legend-art';
import {
  type AnyNodeDefinition,
  Join,
  type QueryNode,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import {
  getCubeNodeBadge,
  OTHER_SOURCE_KIND_TITLE,
  READ_ONLY_CUBE_TITLE,
} from '../__lib__/LegendCubeLabels.js';
import { CUBE_TOUR_ANCHOR, cubeTourAnchor } from '../__lib__/LegendCubeTour.js';
import {
  addCubeNode,
  canAddCubeNode,
  getCubeAddAfterId,
  getCubeAddDatabaseProblem,
} from '../stores/CubeAddPlacement.js';
import type { CubeEditorState } from '../stores/CubeEditorState.js';
import { getCubeCanvasNodeLabel } from './canvas/CubeCanvasElements.js';
import { CubeNodeIcon } from './CubeNodeIcon.js';

/** The z-index of a menu opened from a menu: above MUI's menus, which are modals (1300) */
const CUBE_SUBMENU_Z_INDEX = 1400;

/**
 * Each node as a menu lists it: its canvas label and the muted second line;
 * a step, the sources it reads from (`Distinct Values · from CUSTOMERS`);
 * its id added when another node of the list shows the same
 */
export const getCubeNodeMenuLabels = (
  editorState: CubeEditorState,
  nodes: readonly QueryNode[],
): Map<string, string> => {
  const { query } = editorState.document;
  const titleOf = (
    node: QueryNode,
  ): ReturnType<typeof getCubeCanvasNodeLabel> =>
    getCubeCanvasNodeLabel(node, editorState.registry.get(node.type)?.label);
  // the sources upstream of a node, in input order
  const sourcesOf = (nodeId: string): QueryNode[] => {
    const node = query.getNode(nodeId);
    if (!node) {
      return [];
    }
    const inputIds = query
      .getInputIds(nodeId)
      .filter((id): id is string => id !== undefined);
    return inputIds.length ? inputIds.flatMap(sourcesOf) : [node];
  };
  const labels = nodes.map((node) => {
    const { title, detail } = titleOf(node);
    const sources = query.getInputIds(node.id).some((id) => id !== undefined)
      ? sourcesOf(node.id).map((source) => titleOf(source).title)
      : [];
    const label = sources.length
      ? `${title} · from ${[...new Set(sources)].join(', ')}`
      : detail
        ? `${title} · ${detail}`
        : title;
    return [node.id, label] as const;
  });
  return new Map(
    labels.map(([id, label]) => [
      id,
      labels.filter(([, other]) => other === label).length > 1
        ? `${label} (${id})`
        : label,
    ]),
  );
};

/**
 * 'Join Another Input' in the canvas's context menu (user, 2026-10-16): a
 * click adds the Join with its Right input to connect later, as before;
 * hovering it, or the right arrow key, opens the other nodes it can join
 * with, each the end of another chain, and picking one adds the Join with
 * that node as its Right input, its join columns filled in when one
 * suggestion is clearly them
 */
const CubeJoinMenuItem = observer(
  (props: {
    editorState: CubeEditorState;
    nodeId?: string | undefined;
    children: React.ReactNode;
  }) => {
    const { editorState, nodeId, children } = props;
    const anchorRef = useRef<HTMLDivElement>(null);
    const submenuRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const afterId = getCubeAddAfterId(editorState, Join.TYPE, nodeId);
    const candidates =
      afterId === undefined ? [] : editorState.getJoinInputCandidates(afterId);
    const labels = getCubeNodeMenuLabels(editorState, candidates);
    const open = (): void => {
      clearTimeout(closeTimer.current);
      setIsOpen(candidates.length > 0);
    };
    // leaving the item for its submenu crosses a gap: wait before closing
    const closeSoon = (): void => {
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => setIsOpen(false), 150);
    };
    const back = (): void => {
      setIsOpen(false);
      anchorRef.current?.querySelector('button')?.focus();
    };
    return (
      <div
        ref={anchorRef}
        className="relative"
        onMouseEnter={open}
        onMouseLeave={closeSoon}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' && candidates.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(true);
            setTimeout(
              () => submenuRef.current?.querySelector('button')?.focus(),
              0,
            );
          }
        }}
      >
        {children}
        {candidates.length > 0 && (
          <span
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden={true}
          >
            <CaretRightIcon />
          </span>
        )}
        <BasePopper
          open={isOpen && anchorRef.current !== null}
          anchorEl={anchorRef.current}
          placement="right-start"
          style={{ zIndex: CUBE_SUBMENU_Z_INDEX }}
        >
          <div
            ref={submenuRef}
            className="menu"
            role="menu"
            aria-label="Join with"
            onMouseEnter={open}
            onMouseLeave={closeSoon}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                back();
              } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                const items = Array.from(
                  event.currentTarget.querySelectorAll('button'),
                );
                const index = items.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                items[
                  (index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) %
                    items.length
                ]?.focus();
              }
            }}
          >
            <div className="menu__item text-sm text-[var(--color-text-secondary)]">
              Join with
            </div>
            {candidates.map((candidate) => (
              <MenuContentItem
                key={candidate.id}
                title={`Add a Join with ${labels.get(candidate.id) ?? candidate.id} as its Right input`}
                onClick={() => {
                  if (afterId !== undefined) {
                    flowResult(
                      editorState.addJoinWith(afterId, candidate.id),
                    ).catch(
                      editorState.host.applicationStore.alertUnhandledError,
                    );
                  }
                }}
              >
                <MenuContentItemIcon>
                  <CubeNodeIcon
                    icon={editorState.registry.get(candidate.type)?.icon}
                  />
                </MenuContentItemIcon>
                <MenuContentItemLabel>
                  {labels.get(candidate.id) ?? candidate.id}
                </MenuContentItemLabel>
              </MenuContentItem>
            ))}
          </div>
        </BasePopper>
      </div>
    );
  },
);

/** An item that adds a node, as the palette, the context menu and 'Add Items' list it */
interface CubeAddItem {
  readonly definition: AnyNodeDefinition;
  readonly label: string;
  readonly disabled: boolean;
  /** Why a source, or a transform its database can't run, can't be added */
  readonly title: string | undefined;
  readonly add: () => void;
}

/**
 * The items that add a node, as the palette lists them (spec §17.2): the
 * sources the cube can take, then the transforms. Each adds where the
 * placement rule puts it (PLAN §11.8): after `nodeId` when given, else after
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
    const badge = getCubeNodeBadge(definition);
    return {
      definition,
      label: `${definition.label}${badge ? ` (${badge})` : ''}`,
      disabled,
      title: !disabled
        ? undefined
        : definition.kind === 'source'
          ? (editorState.sourcePicker.disabledReason ?? OTHER_SOURCE_KIND_TITLE)
          : getCubeAddDatabaseProblem(editorState, definition.type, nodeId),
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
    const menuItem = (item: CubeAddItem): React.ReactNode => {
      const entry = (
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
      // a Join can be added with the node it joins (user, 2026-10-16)
      return item.definition.type === Join.TYPE && !item.disabled ? (
        <CubeJoinMenuItem
          key={item.definition.type}
          editorState={props.editorState}
          nodeId={props.nodeId}
        >
          {entry}
        </CubeJoinMenuItem>
      ) : (
        entry
      );
    };
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
          {...cubeTourAnchor(CUBE_TOUR_ANCHOR.ADD_ITEMS)}
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
