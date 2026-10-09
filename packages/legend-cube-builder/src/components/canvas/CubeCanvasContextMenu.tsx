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
  MenuContentItemIcon,
  MenuContentItemLabel,
} from '@finos/legend-art';
import type { AnyNodeDefinition } from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { forwardRef } from 'react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeNodeIcon } from '../CubeNodeIcon.js';

/**
 * The canvas's context menu (spec §17.4): the palette, then what can be done
 * to the node it was opened on. On a node, a palette item is added after it;
 * around the nodes, on its own. Every item shows, disabled when it can't be
 * done, so Swap Inputs can be found. The node comes through props: a menu
 * opened around the nodes has none.
 */
export const CubeCanvasContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    { editorState: CubeEditorState; nodeId?: string | undefined }
  >(function CubeCanvasContextMenu(props, ref) {
    const { editorState, nodeId } = props;
    const { query } = editorState.document;
    const { registry } = editorState;
    const paletteItem = (definition: AnyNodeDefinition): React.ReactNode => (
      <MenuContentItem
        key={definition.type}
        disabled={!editorState.canAddNode(definition.type, nodeId)}
        onClick={() => editorState.addNode(definition.type, nodeId)}
      >
        <MenuContentItemIcon>
          <CubeNodeIcon icon={definition.icon} />
        </MenuContentItemIcon>
        <MenuContentItemLabel>
          {definition.label}
          {definition.beta ? ' (BETA)' : ''}
        </MenuContentItemLabel>
      </MenuContentItem>
    );
    return (
      <MenuContent ref={ref}>
        {editorState.offeredSources.map(paletteItem)}
        <MenuContentDivider />
        {registry.transforms.map(paletteItem)}
        <MenuContentDivider />
        <MenuContentItem
          title="Execute runs the query up to this node"
          disabled={nodeId === undefined || !query.canSelect(nodeId)}
          onClick={() => nodeId !== undefined && editorState.select(nodeId)}
        >
          Select
        </MenuContentItem>
        <MenuContentItem
          disabled={nodeId === undefined || !editorState.canRemoveNode(nodeId)}
          onClick={() => nodeId !== undefined && editorState.removeNode(nodeId)}
        >
          Remove
        </MenuContentItem>
        <MenuContentItem
          title="Swap the node's two inputs, e.g. a Join's Left and Right"
          disabled={nodeId === undefined || !editorState.canSwapInputs(nodeId)}
          onClick={() => nodeId !== undefined && editorState.swapInputs(nodeId)}
        >
          Swap Inputs
        </MenuContentItem>
      </MenuContent>
    );
  }),
);
