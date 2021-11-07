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

import { AppHeader, AppHeaderMenu } from '@finos/legend-studio';
import { observer } from 'mobx-react-lite';
import { EnterpriseModelExplorerStoreProvider } from './EnterpriseModelExplorerStoreProvider';

export const EnterpriseModelExplorerInner = observer(() => {
  //  const { dataSpaceViewerState } = props;
  console.log('dummy');
  return (
    <div className="app__page">
      <AppHeader>
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="editor viewer">
          TODO
          {/* <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
            <div className="editor__body">
              <ViewerActivityBar />
              <NotificationSnackbar />
              <div ref={ref} className="editor__content-container">
                <div
                  className={clsx('editor__content', {
                    'editor__content--expanded': editorStore.isInExpandedMode,
                  })}
                >
                  <ResizablePanelGroup
                    orientation="vertical"
                    className="review-explorer__content"
                  >
                    <ResizablePanel
                      {...getControlledResizablePanelProps(
                        editorStore.sideBarDisplayState.size === 0,
                        {
                          onStopResize: resizeSideBar,
                        },
                      )}
                      direction={1}
                      size={editorStore.sideBarDisplayState.size}
                    >
                      <SideBar />
                    </ResizablePanel>
                    <ResizablePanelSplitter />
                    <ResizablePanel minSize={300}>
                      {editorStore.isInFormMode && <EditPanel />}
                      {editorStore.isInGrammarTextMode && <GrammarTextEditor />}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </div>
            <ViewerStatusBar />
            {extraEditorExtensionComponents}
            {allowOpeningElement && <ProjectSearchCommand />}
          </GlobalHotKeys> */}
        </div>
      </div>
    </div>
  );
});

export const EnterpriseModelExplorer: React.FC = () => (
  <EnterpriseModelExplorerStoreProvider>
    <EnterpriseModelExplorerInner />
  </EnterpriseModelExplorerStoreProvider>
);
