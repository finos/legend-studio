/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { observer } from 'mobx-react-lite';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  type ResizablePanelHandlerProps,
} from '@finos/legend-art';
import {
  EditorSplitGroupState,
  EditorSplitLeaf,
  EditorSplitOrientation,
  type EditorSplitNode,
} from '../../stores/EditorSplitGroupState.js';
import { EditorGroupLeaf } from './EditorGroupLeaf.js';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';

interface EditorSplitGroupProps {
  node: EditorSplitNode;
}

export const EditorSplitGroup = observer((props: EditorSplitGroupProps) => {
  const { node } = props;
  const ideStore = usePureIDEStore();

  const handleSplitResize = (handleProps: ResizablePanelHandlerProps): void => {
    if (node instanceof EditorSplitGroupState) {
      const size = (
        handleProps.domElement as HTMLDivElement
      ).getBoundingClientRect()[
        node.orientation === EditorSplitOrientation.VERTICAL
          ? 'width'
          : 'height'
      ];
      node.setSize(size);
    }
  };

  // If this is a leaf node, render the editor group
  if (node instanceof EditorSplitLeaf) {
    return (
      <EditorGroupLeaf
        leaf={node}
        isActive={ideStore.editorSplitState.activeLeaf === node}
        onActivate={() => ideStore.editorSplitState.setActiveLeaf(node)}
      />
    );
  }

  // If this is a group node, render the split layout
  if (node instanceof EditorSplitGroupState) {
    const isVertical = node.orientation === EditorSplitOrientation.VERTICAL;

    return (
      <div className="editor-split-group">
        <ResizablePanelGroup
          orientation={isVertical ? 'vertical' : 'horizontal'}
        >
          <ResizablePanel
            minSize={200}
            {...(node.size !== undefined ? { size: node.size } : {})}
            onStopResize={handleSplitResize}
          >
            <EditorSplitGroup node={node.first} />
          </ResizablePanel>

          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-250)" />
          </ResizablePanelSplitter>

          <ResizablePanel minSize={200}>
            <EditorSplitGroup node={node.second} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  return null;
});

EditorSplitGroup.displayName = 'EditorSplitGroup';
