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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { AuxiliaryPanel } from './aux-panel/AuxiliaryPanel.js';
import { SideBar } from './side-bar/SideBar.js';
import { ActivityBar } from './ActivityBar.js';
import { withEditorStore, useEditorStore } from './EditorStoreProvider.js';
import { StatusBar } from './StatusBar.js';
import { EditPanel } from './edit-panel/EditPanel.js';
import { FileSearchCommand } from './command-center/FileSearchCommand.js';
import { flowResult } from 'mobx';
import { TextSearchCommand } from './command-center/TextSearchCommand.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  type ResizablePanelHandlerProps,
  useResizeDetector,
  clsx,
  ResizablePanelSplitterLine,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  getCollapsiblePanelGroupProps,
} from '@finos/legend-art';
import { getQueryParameters } from '@finos/legend-shared';

interface EditorQueryParams {
  mode?: string;
  fastCompile?: string;
}

export const Editor = withEditorStore(
  observer(() => {
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

    // layout
    const { ref, width, height } = useResizeDetector<HTMLDivElement>();
    // These create snapping effect on panel resizing
    const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
      editorStore.sideBarDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .width,
      );
    const resizeAuxPanel = (handleProps: ResizablePanelHandlerProps): void =>
      editorStore.auxPanelDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .height,
      );
    const sideBarCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      editorStore.sideBarDisplayState.size === 0,
      {
        onStopResize: resizeSideBar,
        size: editorStore.sideBarDisplayState.size,
      },
    );
    const auxCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      editorStore.auxPanelDisplayState.size === 0,
      {
        onStopResize: resizeAuxPanel,
        size: editorStore.auxPanelDisplayState.size,
      },
    );
    const maximizedAuxCollapsiblePanelGroupProps =
      getCollapsiblePanelGroupProps(
        editorStore.auxPanelDisplayState.isMaximized,
      );

    useEffect(() => {
      if (ref.current) {
        editorStore.auxPanelDisplayState.setMaxSize(ref.current.offsetHeight);
      }
    }, [editorStore, ref, height, width]);

    // Cleanup the editor
    useEffect(
      () => (): void => {
        editorStore.cleanUp();
      },
      [editorStore],
    );

    // Initialize the app
    useEffect(() => {
      const queryParams = getQueryParameters<EditorQueryParams>(
        window.location.search,
      );
      flowResult(
        editorStore.initialize(
          false,
          undefined,
          queryParams.mode,
          queryParams.fastCompile,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }, [editorStore, applicationStore]);

    const editable = editorStore.initState.hasSucceeded;

    return (
      <div className="editor">
        <div className="editor__body">
          <ActivityBar />
          <div className="editor__content-container" ref={ref}>
            <div
              className={clsx('editor__content', {
                'editor__content--expanded': editorStore.isInExpandedMode,
              })}
            >
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel
                  {...sideBarCollapsiblePanelGroupProps.collapsiblePanel}
                  direction={1}
                >
                  <SideBar />
                </ResizablePanel>
                <ResizablePanelSplitter />
                <ResizablePanel
                  {...sideBarCollapsiblePanelGroupProps.remainingPanel}
                  minSize={300}
                >
                  <ResizablePanelGroup orientation="horizontal">
                    <ResizablePanel
                      {...maximizedAuxCollapsiblePanelGroupProps.collapsiblePanel}
                      {...(editorStore.auxPanelDisplayState.size === 0
                        ? auxCollapsiblePanelGroupProps.remainingPanel
                        : {})}
                    >
                      <EditPanel />
                    </ResizablePanel>
                    <ResizablePanelSplitter>
                      <ResizablePanelSplitterLine
                        color={
                          editorStore.auxPanelDisplayState.isMaximized
                            ? 'transparent'
                            : 'var(--color-dark-grey-250)'
                        }
                      />
                    </ResizablePanelSplitter>
                    <ResizablePanel
                      {...auxCollapsiblePanelGroupProps.collapsiblePanel}
                      {...(editorStore.auxPanelDisplayState.isMaximized
                        ? maximizedAuxCollapsiblePanelGroupProps.remainingPanel
                        : {})}
                      direction={-1}
                    >
                      <AuxiliaryPanel />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </div>
        <StatusBar actionsDisabled={!editable} />
        {editable && <FileSearchCommand />}
        {editable && <TextSearchCommand />}
      </div>
    );
  }),
);
