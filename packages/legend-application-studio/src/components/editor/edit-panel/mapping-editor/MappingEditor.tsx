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

import { forwardRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  ContextMenu,
  MapIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  PURE_UnknownElementTypeIcon,
  PURE_ClassIcon,
  PURE_EnumerationIcon,
  PURE_AssociationIcon,
  Panel,
  useResizeDetector,
  PanelEntryDropZonePlaceholderContent,
} from '@finos/legend-art';
import { ClassMappingEditor } from './ClassMappingEditor.js';
import { EnumerationMappingEditor } from './EnumerationMappingEditor.js';
import {
  type MappingEditorTabState,
  type MappingElement,
  MappingEditorState,
  getMappingElementTarget,
  getMappingElementType,
  MAPPING_ELEMENT_TYPE,
  getMappingElementLabel,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { MappingElementState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState.js';
import { MappingExplorer } from './MappingExplorer.js';
import { MappingTestEditor } from './MappingTestEditor.js';
import { MappingTestState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState.js';
import { MappingTestsExplorer } from './MappingTestsExplorer.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID.js';
import { MappingExecutionState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingExecutionState.js';
import { MappingExecutionBuilder } from './MappingExecutionBuilder.js';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  Class,
  Enumeration,
  Association,
  type SetImplementation,
  type EnumerationMapping,
} from '@finos/legend-graph';
import {
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../stores/LegendStudioApplicationNavigationContext.js';
import { GeneralTabEditor } from '../GeneralTabEditor.js';

export const getMappingElementTargetIcon = (
  mappingElement: MappingElement,
): React.ReactNode => {
  const target = getMappingElementTarget(mappingElement);
  if (target instanceof Class) {
    return <PURE_ClassIcon />;
  } else if (target instanceof Enumeration) {
    return <PURE_EnumerationIcon />;
  } else if (target instanceof Association) {
    return <PURE_AssociationIcon />;
  }
  return <PURE_UnknownElementTypeIcon />;
};

export const MappingEditorSplashScreen: React.FC = () => {
  const logoWidth = 280;
  const logoHeight = 270;
  const [showLogo, setShowLogo] = useState(false);
  const { ref, height, width } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowLogo((width ?? 0) > logoWidth && (height ?? 0) > logoHeight);
  }, [height, width]);

  return (
    <div ref={ref} className="mapping-editor__splash-screen">
      <div
        className={clsx('mapping-editor__splash-screen__logo', {
          'mapping-editor__splash-screen__logo--hidden': !showLogo,
        })}
      >
        <MapIcon />
      </div>
    </div>
  );
};

const MappingEditorHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      tabState: MappingEditorTabState;
    }
  >(function MappingEditorHeaderTabContextMenu(props, ref) {
    const { tabState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const close = applicationStore.guardUnhandledError(() =>
      flowResult(mappingEditorState.closeTab(tabState)),
    );
    const closeOthers = applicationStore.guardUnhandledError(() =>
      flowResult(mappingEditorState.closeAllOtherTabs(tabState)),
    );
    const closeAll = (): void => mappingEditorState.closeAllTabs();

    return (
      <div ref={ref} className="mapping-editor__header__tab__context-menu">
        <button
          className="mapping-editor__header__tab__context-menu__item"
          onClick={close}
        >
          Close
        </button>
        <button
          className="mapping-editor__header__tab__context-menu__item"
          disabled={mappingEditorState.openedTabStates.length < 2}
          onClick={closeOthers}
        >
          Close Others
        </button>
        <button
          className="mapping-editor__header__tab__context-menu__item"
          onClick={closeAll}
        >
          Close All
        </button>
      </div>
    );
  }),
);

export const MappingEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();

  const mappingEditorState =
    editorStore.getCurrentEditorState(MappingEditorState);
  const isReadOnly = mappingEditorState.isReadOnly;

  const currentTabState = mappingEditorState.currentTabState;
  const renderActiveMappingElementTab = (): React.ReactNode => {
    if (currentTabState instanceof MappingTestState) {
      return (
        <MappingTestEditor
          key={currentTabState.uuid}
          testState={currentTabState}
          isReadOnly={isReadOnly}
        />
      );
    } else if (currentTabState instanceof MappingElementState) {
      const currentMappingElement = currentTabState.mappingElement;
      switch (getMappingElementType(currentMappingElement)) {
        case MAPPING_ELEMENT_TYPE.CLASS:
          return (
            <ClassMappingEditor
              setImplementation={currentMappingElement as SetImplementation}
              isReadOnly={isReadOnly}
            />
          );
        case MAPPING_ELEMENT_TYPE.ENUMERATION:
          return (
            <EnumerationMappingEditor
              enumerationMapping={currentMappingElement as EnumerationMapping}
              isReadOnly={isReadOnly}
            />
          );
        case MAPPING_ELEMENT_TYPE.ASSOCIATION: // we will not support association mapping
        default:
          return <div>Unsupported mapping type</div>;
      }
    } else if (currentTabState instanceof MappingExecutionState) {
      return (
        <MappingExecutionBuilder
          key={currentTabState.uuid}
          executionState={currentTabState}
        />
      );
    }
    return <MappingEditorSplashScreen />;
  };

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MAPPING_EDITOR,
  );

  const closeTabTest = (currTabState: MappingEditorTabState) => (): void => {
    flowResult(mappingEditorState.closeTab(currTabState)).catch(
      applicationStore.alertUnhandledError,
    );
  };

  const openTabTest = (currTabState: MappingEditorTabState): (() => void) =>
    applicationStore.guardUnhandledError(() =>
      flowResult(mappingEditorState.openTab(currTabState)),
    );

  const closeTabOnMiddleClickTest =
    (currTabState: MappingEditorTabState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        flowResult(mappingEditorState.closeTab(currTabState)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

  const getTabStateName = (currTabState: MappingEditorTabState): string => {
    if (currTabState instanceof MappingTestState) {
      return currTabState.test.name;
    } else if (currTabState instanceof MappingExecutionState) {
      return currTabState.name;
    } else if (currTabState instanceof MappingElementState) {
      return getMappingElementLabel(currTabState.mappingElement, editorStore)
        .value;
    }
    return '';
  };

  return (
    <div className="mapping-editor">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel size={300} minSize={300}>
          <div className="mapping-editor__side-bar">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel size={400} minSize={28}>
                <MappingExplorer isReadOnly={isReadOnly} />
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-light-grey-400)" />
              </ResizablePanelSplitter>
              <ResizablePanel minSize={36}>
                <MappingTestsExplorer isReadOnly={isReadOnly} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter />
        <ResizablePanel>
          <Panel>
            <ContextMenu
              className="panel__header mapping-editor__header"
              disabled={true}
            >
              <div
                data-testid={LEGEND_STUDIO_TEST_ID.EDITOR__TABS__HEADER}
                className="mapping-editor__header__tabs"
              >
                {mappingEditorState.openedTabStates.map((tabState) => (
                  <GeneralTabEditor
                    key={tabState.uuid}
                    nameOfTabType="mapping-editor"
                    generalEditorState={tabState}
                    generalOpenedTabStates={mappingEditorState.openedTabStates}
                    closeTab={closeTabTest}
                    editPanelHeaderTabContextMenu={
                      <MappingEditorHeaderTabContextMenu tabState={tabState} />
                    }
                    placeholderContent={
                      <PanelEntryDropZonePlaceholderContent />
                    }
                    openTab={openTabTest}
                    closeTabOnMiddleClick={closeTabOnMiddleClickTest}
                    DND_TYPE_NAME="MAPPING_EDITOR_STATE"
                    currentEditorState={mappingEditorState}
                  />
                ))}
              </div>
            </ContextMenu>
            <div className="panel__content mapping-editor__content">
              {renderActiveMappingElementTab()}
            </div>
          </Panel>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
});
