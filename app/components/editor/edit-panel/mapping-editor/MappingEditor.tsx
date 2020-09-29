/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import { useEditorStore } from 'Stores/EditorStore';
import { observer } from 'mobx-react-lite';
import { capitalizeFirstChar } from 'Utilities/FormatterUtil';
import { FaTimes, FaMap, FaFlask } from 'react-icons/fa';
import { ClassMappingEditor } from './ClassMappingEditor';
import { EnumerationMappingEditor } from './EnumerationMappingEditor';
import { ElementIcon } from 'Components/shared/Icon';
import SplitPane from 'react-split-pane';
import clsx from 'clsx';
import ReactResizeDetector from 'react-resize-detector';
import { MappingEditorState, MappingEditorTabState } from 'Stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { MappingElementState } from 'Stores/editor-state/element-editor-state/mapping/MappingElementState';
import { MappingExplorer } from './MappingExplorer';
import { MappingTestEditor } from './MappingTestEditor';
import { MappingTestState } from 'Stores/editor-state/element-editor-state/mapping/MappingTestState';
import { MappingTestsExplorer } from './MappingTestsExplorer';
import { ContextMenu } from 'Components/shared/ContextMenu';
import { useApplicationStore } from 'Stores/ApplicationStore';
import { SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { MAPPING_ELEMENT_TYPE, getMappingElementType, getMappingElementTarget } from 'MM/model/packageableElements/mapping/Mapping';

export const MappingEditorSplashScreen: React.FC = () => {
  const logoWidth = 280;
  const logoHeight = 270;
  const [showLogo, setShowLogo] = useState(false);
  const handleResize = (width: number, height: number): void => {
    setShowLogo(width > logoWidth && height > logoHeight);
  };
  return (
    <ReactResizeDetector
      handleWidth={true}
      handleHeight={true}
      onResize={handleResize}
    >
      <div className="mapping-editor__splash-screen">
        <div className={clsx('mapping-editor__splash-screen__logo', { 'mapping-editor__splash-screen__logo--hidden': !showLogo })}>
          <FaMap />
        </div>
      </div>
    </ReactResizeDetector>
  );
};

const MappingEditorHeaderTabContextMenu = observer((props: {
  tabState: MappingEditorTabState;
}, ref: React.Ref<HTMLDivElement>) => {
  const { tabState } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const close = applicationStore.guaranteeSafeAction(() => mappingEditorState.closeTab(tabState));
  const closeOthers = applicationStore.guaranteeSafeAction(() => mappingEditorState.closeAllOtherTabs(tabState));
  const closeAll = (): void => mappingEditorState.closeAllTabs();

  return (
    <div ref={ref} className="mapping-editor__header__tab__context-menu">
      <button className="mapping-editor__header__tab__context-menu__item" onClick={close}>Close</button>
      <button className="mapping-editor__header__tab__context-menu__item" disabled={mappingEditorState.openedTabStates.length < 2} onClick={closeOthers}>Close Others</button>
      <button className="mapping-editor__header__tab__context-menu__item" onClick={closeAll}>Close All</button>
    </div>
  );
}, { forwardRef: true });

export const MappingEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const isReadOnly = mappingEditorState.isReadOnly;
  const currentMappingElement = mappingEditorState.currentTabState instanceof MappingElementState ? mappingEditorState.currentTabState.mappingElement : undefined;
  const renderActiveMappingElementTab = (): React.ReactNode => {
    if (mappingEditorState.currentTabState instanceof MappingTestState) {
      return <MappingTestEditor key={mappingEditorState.currentTabState.uuid} mappingTestState={mappingEditorState.currentTabState} isReadOnly={isReadOnly} />;
    }
    if (currentMappingElement) {
      switch (getMappingElementType(currentMappingElement)) {
        case MAPPING_ELEMENT_TYPE.CLASS: return <ClassMappingEditor setImplementation={currentMappingElement as SetImplementation} isReadOnly={isReadOnly} />;
        case MAPPING_ELEMENT_TYPE.ENUMERATION: return <EnumerationMappingEditor enumerationMapping={currentMappingElement as EnumerationMapping} isReadOnly={isReadOnly} />;
        case MAPPING_ELEMENT_TYPE.ASSOCIATION: // we will not support association mapping
        default: return <div>Unsupported mapping type</div>;
      }
    }
    return <MappingEditorSplashScreen />;
  };
  const closeTab = (tabState: MappingEditorTabState): React.MouseEventHandler => (event): void => {
    event.stopPropagation();
    mappingEditorState.closeTab(tabState).catch(applicationStore.alertIllegalUnhandledError);
  };
  const closeTabOnMiddleClick = (tabState: MappingEditorTabState): React.MouseEventHandler => (event): void => {
    if (event.nativeEvent.which === 2) {
      event.stopPropagation();
      mappingEditorState.closeTab(tabState).catch(applicationStore.alertIllegalUnhandledError);
    }
  };
  const openTab = (tabState: MappingEditorTabState): () => Promise<void> => applicationStore.guaranteeSafeAction(() => mappingEditorState.openTab(tabState));

  return (
    <div className="mapping-editor">
      <SplitPane split="vertical" defaultSize={300} minSize={300} maxSize={-600}>
        <div className="mapping-editor__side-bar">
          <SplitPane split="horizontal" defaultSize="50%" minSize={28} maxSize={-36}>
            <MappingExplorer isReadOnly={isReadOnly} />
            <MappingTestsExplorer isReadOnly={isReadOnly} />
          </SplitPane>
        </div>
        <div className="panel">
          <ContextMenu className="panel__header mapping-editor__header" disabled={true}>
            <div className="mapping-editor__header__tabs">
              {mappingEditorState.openedTabStates.map(tabState => (
                <div
                  key={tabState.uuid}
                  onMouseUp={closeTabOnMiddleClick(tabState)}
                  onClick={openTab(tabState)}
                  className={clsx('mapping-editor__header__tab', { 'mapping-editor__header__tab--active': tabState === mappingEditorState.currentTabState })}
                >
                  <ContextMenu className="mapping-editor__header__tab__content" content={<MappingEditorHeaderTabContextMenu tabState={tabState} />}>
                    {tabState instanceof MappingTestState &&
                      <>
                        <div className={`mapping-editor__header__tab__test`}><FaFlask /></div>
                        <button
                          className="mapping-editor__header__tab__element__name"
                          tabIndex={-1}
                        >{tabState.test.name}</button>
                      </>
                    }
                    {tabState instanceof MappingElementState &&
                      <>
                        <div className={`mapping-editor__header__tab__element__type icon color--${getMappingElementType(tabState.mappingElement).toLowerCase()}`}><ElementIcon element={getMappingElementTarget(tabState.mappingElement)} /></div>
                        <button
                          className="mapping-editor__header__tab__element__name"
                          tabIndex={-1}
                          title={`${capitalizeFirstChar(getMappingElementType(tabState.mappingElement)).toLowerCase()} mapping '${tabState.mappingElement.id.value}' for '${getMappingElementTarget(tabState.mappingElement).name}'`}
                        >{tabState.mappingElement.label.value}</button>
                      </>
                    }
                    <button
                      className="mapping-editor__header__tab__close-btn"
                      onClick={closeTab(tabState)}
                      tabIndex={-1}
                      title={'Close'}
                    ><FaTimes /></button>

                  </ContextMenu>
                </div>
              ))}
            </div>
          </ContextMenu>
          <div className="panel__content mapping-editor__content">
            {renderActiveMappingElementTab()}
          </div>
        </div>
      </SplitPane>
    </div>
  );
});
