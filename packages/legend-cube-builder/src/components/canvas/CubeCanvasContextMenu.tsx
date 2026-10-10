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
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { forwardRef } from 'react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeAddMenuItems } from '../CubeAddItems.js';

/**
 * The canvas's context menu (spec §17.4): the palette, then what can be done
 * to the node it was opened on. On a node, a transform is added after it;
 * around the nodes, after the selected node; a source opens the source
 * dialog on its tab (PLAN §11.6, U3 and U4). Every item shows, disabled when
 * it can't be done, so Swap Inputs can be found. The node comes through
 * props: a menu opened around the nodes has none. Each item applies the node
 * editor first, so its edits are never dropped; a palette item adds nothing
 * when they had to be. Swap Inputs on the edited node is its editor's own,
 * which applies and follows it.
 */
export const CubeCanvasContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    { editorState: CubeEditorState; nodeId?: string | undefined }
  >(function CubeCanvasContextMenu(props, ref) {
    const { editorState, nodeId } = props;
    const { query } = editorState.document;
    const finishing =
      (run: () => void): (() => void) =>
      () => {
        if (editorState.nodeEditor.finish()) {
          run();
        }
      };
    return (
      <MenuContent ref={ref}>
        <CubeAddMenuItems editorState={editorState} nodeId={nodeId} />
        <MenuContentDivider />
        <MenuContentItem
          title="Execute runs the query up to this node"
          disabled={nodeId === undefined || !query.canSelect(nodeId)}
          onClick={finishing(
            () => nodeId !== undefined && editorState.select(nodeId),
          )}
        >
          Select
        </MenuContentItem>
        <MenuContentItem
          disabled={nodeId === undefined || !editorState.canRemoveNode(nodeId)}
          onClick={finishing(
            () => nodeId !== undefined && editorState.removeNode(nodeId),
          )}
        >
          Remove
        </MenuContentItem>
        <MenuContentItem
          title="Swap the node's two inputs, e.g. a Join's Left and Right"
          disabled={nodeId === undefined || !editorState.canSwapInputs(nodeId)}
          onClick={
            nodeId !== undefined && nodeId === editorState.nodeEditor.nodeId
              ? // its own editor applies, swaps and stays open on it
                () => editorState.nodeEditor.swapInputs()
              : finishing(
                  () => nodeId !== undefined && editorState.swapInputs(nodeId),
                )
          }
        >
          Swap Inputs
        </MenuContentItem>
      </MenuContent>
    );
  }),
);
