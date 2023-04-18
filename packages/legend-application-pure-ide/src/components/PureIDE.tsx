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
import { withEditorStore, usePureIDEStore } from './PureIDEStoreProvider.js';
import { StatusBar } from './StatusBar.js';
import { EditorGroup } from './editor-group/EditorGroup.js';
import { FileSearchCommand } from './command-center/FileSearchCommand.js';
import { flowResult } from 'mobx';
import { useApplicationStore, useCommands } from '@finos/legend-application';
import {
  type ResizablePanelHandlerProps,
  useResizeDetector,
  ResizablePanelSplitterLine,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  getCollapsiblePanelGroupProps,
} from '@finos/legend-art';
import { LEGEND_PURE_IDE_ROUTE_PATTERN_TOKEN } from '../application/LegendPureIDENavigation.js';

export const Editor = withEditorStore(
  observer(() => {
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();

    // layout
    const { ref, width, height } = useResizeDetector<HTMLDivElement>();
    // These create snapping effect on panel resizing
    const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
      ideStore.sideBarDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .width,
      );
    const resizeAuxPanel = (handleProps: ResizablePanelHandlerProps): void =>
      ideStore.auxPanelDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .height,
      );
    const sideBarCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      ideStore.sideBarDisplayState.size === 0,
      {
        onStopResize: resizeSideBar,
        size: ideStore.sideBarDisplayState.size,
      },
    );
    const auxCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      ideStore.auxPanelDisplayState.size === 0,
      {
        onStopResize: resizeAuxPanel,
        size: ideStore.auxPanelDisplayState.size,
      },
    );
    const maximizedAuxCollapsiblePanelGroupProps =
      getCollapsiblePanelGroupProps(ideStore.auxPanelDisplayState.isMaximized);

    useEffect(() => {
      if (ref.current) {
        ideStore.auxPanelDisplayState.setMaxSize(ref.current.offsetHeight);
      }
    }, [ideStore, ref, height, width]);

    // Cleanup the editor
    useEffect(
      () => (): void => {
        ideStore.cleanUp();
      },
      [ideStore],
    );

    // Initialize the app
    useEffect(() => {
      flowResult(
        ideStore.initialize(
          false,
          undefined,
          applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
            LEGEND_PURE_IDE_ROUTE_PATTERN_TOKEN.MODE,
          ),
          applicationStore.navigationService.navigator.getCurrentLocationParameterValue(
            LEGEND_PURE_IDE_ROUTE_PATTERN_TOKEN.FAST_COMPILE,
          ),
        ),
      ).catch(applicationStore.alertUnhandledError);
    }, [ideStore, applicationStore]);

    useEffect(() => {
      applicationStore.navigationService.navigator.blockNavigation(
        [() => true],
        undefined,
        () =>
          applicationStore.notificationService.notifyWarning(
            `Navigation from the editor is blocked`,
          ),
      );
      return (): void => {
        applicationStore.navigationService.navigator.unblockNavigation();
      };
    }, [ideStore, applicationStore]);

    useCommands(ideStore);

    return (
      <div className="ide">
        <div className="ide__body">
          <ActivityBar />
          <div className="ide__content-container" ref={ref}>
            <div className="ide__content">
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
                      {...(ideStore.auxPanelDisplayState.size === 0
                        ? auxCollapsiblePanelGroupProps.remainingPanel
                        : {})}
                    >
                      <EditorGroup />
                    </ResizablePanel>
                    <ResizablePanelSplitter>
                      <ResizablePanelSplitterLine
                        color={
                          ideStore.auxPanelDisplayState.isMaximized
                            ? 'transparent'
                            : 'var(--color-dark-grey-250)'
                        }
                      />
                    </ResizablePanelSplitter>
                    <ResizablePanel
                      {...auxCollapsiblePanelGroupProps.collapsiblePanel}
                      {...(ideStore.auxPanelDisplayState.isMaximized
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
        <StatusBar />
        <FileSearchCommand />
      </div>
    );
  }),
);
