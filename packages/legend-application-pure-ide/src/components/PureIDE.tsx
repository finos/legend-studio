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
import { PanelGroup } from './panel-group/PanelGroup.js';
import { SideBar } from './side-bar/SideBar.js';
import { ActivityBar } from './ActivityBar.js';
import { withEditorStore, usePureIDEStore } from './PureIDEStoreProvider.js';
import { StatusBar } from './StatusBar.js';
import { EditorSplitGroup } from './editor-group/EditorSplitGroup.js';
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
import { LEGEND_PURE_IDE_ROUTE_PATTERN_TOKEN } from '../__lib__/LegendPureIDENavigation.js';
import { SelectPCTAdapterCommand } from './command-center/SelectPCTAdapterCommand.js';

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
    const resizePanel = (handleProps: ResizablePanelHandlerProps): void =>
      ideStore.panelGroupDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .height,
      );
    const collapsibleSideBarGroupProps = getCollapsiblePanelGroupProps(
      ideStore.sideBarDisplayState.size === 0,
      {
        onStopResize: resizeSideBar,
        size: ideStore.sideBarDisplayState.size,
      },
    );
    const collapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      ideStore.panelGroupDisplayState.size === 0,
      {
        onStopResize: resizePanel,
        size: ideStore.panelGroupDisplayState.size,
      },
    );
    const maximizedCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      ideStore.panelGroupDisplayState.isMaximized,
    );

    useEffect(() => {
      if (ref.current) {
        ideStore.panelGroupDisplayState.setMaxSize(ref.current.offsetHeight);
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
                  {...collapsibleSideBarGroupProps.collapsiblePanel}
                  direction={1}
                >
                  <SideBar />
                </ResizablePanel>
                <ResizablePanelSplitter />
                <ResizablePanel
                  {...collapsibleSideBarGroupProps.remainingPanel}
                  minSize={300}
                >
                  <ResizablePanelGroup orientation="horizontal">
                    <ResizablePanel
                      {...maximizedCollapsiblePanelGroupProps.collapsiblePanel}
                      {...(ideStore.panelGroupDisplayState.size === 0
                        ? collapsiblePanelGroupProps.remainingPanel
                        : {})}
                    >
                      <EditorSplitGroup node={ideStore.editorSplitState.root} />
                    </ResizablePanel>
                    <ResizablePanelSplitter>
                      <ResizablePanelSplitterLine
                        color={
                          ideStore.panelGroupDisplayState.isMaximized
                            ? 'transparent'
                            : 'var(--color-dark-grey-250)'
                        }
                      />
                    </ResizablePanelSplitter>
                    <ResizablePanel
                      {...collapsiblePanelGroupProps.collapsiblePanel}
                      {...(ideStore.panelGroupDisplayState.isMaximized
                        ? maximizedCollapsiblePanelGroupProps.remainingPanel
                        : {})}
                      direction={-1}
                    >
                      <PanelGroup />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </div>
        <StatusBar />
        <FileSearchCommand />
        <SelectPCTAdapterCommand />
      </div>
    );
  }),
);
