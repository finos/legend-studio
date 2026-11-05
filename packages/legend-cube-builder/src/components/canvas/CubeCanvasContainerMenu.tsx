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

import { MenuContent, MenuContentItem } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { forwardRef } from 'react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeSubmenu } from '../CubeSubmenu.js';

/** What the menus call what they do to containers (PLAN §11.29) */
export enum CUBE_CONTAINER_LABEL {
  PUT_IN = 'Put in a Container',
  ALONE = 'This Step Alone',
  WITH_STEPS_BEFORE = 'With the Steps Before It',
  TAKE_OUT = 'Take Out of Container',
  FOLD = 'Fold',
  OPEN = 'Open',
  RENAME = 'Rename',
  REMOVE = 'Remove Container',
}

/** A container's title as a menu names it, in quotes; an empty one as untitled */
export const getCubeContainerMenuTitle = (title: string): string =>
  title ? `“${title}”` : 'the untitled container';

const SUBMENU_HEAD_CLASS_NAME =
  'menu__item text-sm text-[var(--color-text-secondary)]';

/**
 * A step's container items, in its menu: Put in a Container ▸, whose menu
 * makes a container of the step alone or with the steps before it in none,
 * or puts it in a container beside it; and Take Out of Container, for a step
 * at its container's edge, so a container stays one block. Each applies the
 * node editor first.
 */
export const CubeStepContainerMenuItems = observer(
  (props: { editorState: CubeEditorState; nodeId?: string | undefined }) => {
    const { editorState, nodeId } = props;
    const finishing =
      (run: () => void): (() => void) =>
      () => {
        if (editorState.nodeEditor.finish()) {
          run();
        }
      };
    const container =
      nodeId === undefined ? undefined : editorState.getStepContainer(nodeId);
    const canAdd = nodeId !== undefined && editorState.canAddContainer(nodeId);
    const stepsBefore =
      nodeId === undefined
        ? []
        : editorState.getStepsForNewContainer(nodeId, true);
    const beside =
      nodeId === undefined ? [] : editorState.getContainersBesideStep(nodeId);
    const canTakeOut =
      nodeId !== undefined && editorState.canTakeOutOfContainer(nodeId);
    return (
      <>
        <CubeSubmenu
          label={CUBE_CONTAINER_LABEL.PUT_IN}
          hasItems={canAdd}
          opensOnClick={true}
          items={
            <>
              <div className={SUBMENU_HEAD_CLASS_NAME}>New container</div>
              <MenuContentItem
                title="A new container of this step alone"
                onClick={finishing(
                  () =>
                    nodeId !== undefined &&
                    editorState.addContainer(nodeId, false),
                )}
              >
                {CUBE_CONTAINER_LABEL.ALONE}
              </MenuContentItem>
              <MenuContentItem
                title={
                  stepsBefore.length > 1
                    ? `A new container of this step and the ${stepsBefore.length - 1} before it in no container`
                    : 'No step before it is free to go in a container'
                }
                disabled={stepsBefore.length < 2}
                onClick={finishing(
                  () =>
                    nodeId !== undefined &&
                    editorState.addContainer(nodeId, true),
                )}
              >
                {CUBE_CONTAINER_LABEL.WITH_STEPS_BEFORE}
              </MenuContentItem>
              {beside.length > 0 && (
                <>
                  <div className={SUBMENU_HEAD_CLASS_NAME}>Add to</div>
                  {beside.map((each) => (
                    <MenuContentItem
                      key={each.container.id}
                      title={`Put this step in ${getCubeContainerMenuTitle(each.container.title)}, beside it`}
                      onClick={finishing(
                        () =>
                          nodeId !== undefined &&
                          editorState.addToContainer(each.container.id, nodeId),
                      )}
                    >
                      {each.container.title || 'Untitled'}
                    </MenuContentItem>
                  ))}
                </>
              )}
            </>
          }
        >
          <MenuContentItem
            title={
              container
                ? `It is in ${getCubeContainerMenuTitle(container.container.title)}: take it out first`
                : 'Frame steps together in a container, which can be folded to one box'
            }
            disabled={!canAdd}
          >
            {CUBE_CONTAINER_LABEL.PUT_IN}
          </MenuContentItem>
        </CubeSubmenu>
        <MenuContentItem
          title={
            !container
              ? 'It is in no container'
              : canTakeOut
                ? `Take this step out of ${getCubeContainerMenuTitle(container.container.title)}`
                : "Only a step at the container's edge can come out: the container would split"
          }
          disabled={!canTakeOut}
          onClick={finishing(
            () =>
              nodeId !== undefined && editorState.takeOutOfContainer(nodeId),
          )}
        >
          {CUBE_CONTAINER_LABEL.TAKE_OUT}
        </MenuContentItem>
      </>
    );
  },
);

/**
 * A container's own menu, on its head or its folded box: fold or open it,
 * rename it in place, or take it away, its steps staying
 */
export const CubeContainerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    { editorState: CubeEditorState; containerId: string }
  >(function CubeContainerContextMenu(props, ref) {
    const { editorState, containerId } = props;
    const { readOnly } = editorState;
    const container = editorState.shownContainers.find(
      (each) => each.container.id === containerId,
    )?.container;
    const finishing =
      (run: () => void): (() => void) =>
      () => {
        if (editorState.nodeEditor.finish()) {
          run();
        }
      };
    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          disabled={readOnly || !container}
          onClick={finishing(() =>
            editorState.setContainerFolded(containerId, !container?.folded),
          )}
        >
          {container?.folded
            ? CUBE_CONTAINER_LABEL.OPEN
            : CUBE_CONTAINER_LABEL.FOLD}
        </MenuContentItem>
        <MenuContentItem
          disabled={readOnly || !container}
          onClick={() => editorState.startRenamingContainer(containerId)}
        >
          {CUBE_CONTAINER_LABEL.RENAME}
        </MenuContentItem>
        <MenuContentItem
          title="Take the container away; its steps stay"
          disabled={readOnly || !container}
          onClick={finishing(() => editorState.removeContainer(containerId))}
        >
          {CUBE_CONTAINER_LABEL.REMOVE}
        </MenuContentItem>
      </MenuContent>
    );
  }),
);
