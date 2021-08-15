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

import { useEffect, useState } from 'react';
import { useEditorStore } from '../../../../stores/EditorStore';
import { observer } from 'mobx-react-lite';
import { toSentenceCase } from '@finos/legend-studio-shared';
import {
  clsx,
  ContextMenu,
  FlaskIcon,
  MapIcon,
  PlayIcon,
  TimesIcon,
} from '@finos/legend-studio-components';
import { ClassMappingEditor } from './ClassMappingEditor';
import { EnumerationMappingEditor } from './EnumerationMappingEditor';
import {
  UnknownTypeIcon,
  ClassIcon,
  EnumerationIcon,
  AssociationIcon,
} from '../../../shared/Icon';
import SplitPane from 'react-split-pane';
import { useResizeDetector } from 'react-resize-detector';
import type {
  MappingEditorTabState,
  MappingElement,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import {
  MappingEditorState,
  getMappingElementTarget,
  getMappingElementType,
  MAPPING_ELEMENT_TYPE,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { MappingElementState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState';
import { MappingExplorer } from './MappingExplorer';
import { MappingTestEditor } from './MappingTestEditor';
import { MappingTestState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingTestState';
import { MappingTestsExplorer } from './MappingTestsExplorer';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import { CORE_TEST_ID } from '../../../../const';
import type { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import type { EnumerationMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Enumeration } from '../../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Association } from '../../../../models/metamodels/pure/model/packageableElements/domain/Association';
import { MappingExecutionState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingExecutionState';
import { MappingExecutionBuilder } from './MappingExecutionBuilder';
import { flowResult } from 'mobx';

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
  (
    props: {
      tabState: MappingEditorTabState;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { tabState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const close = applicationStore.guaranteeSafeAction(() =>
      flowResult(mappingEditorState.closeTab(tabState)),
    );
    const closeOthers = applicationStore.guaranteeSafeAction(() =>
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
  },
  { forwardRef: true },
);

const getMappingElementTargetIcon = (
  mappingElement: MappingElement,
): React.ReactNode => {
  const target = getMappingElementTarget(mappingElement);
  if (target instanceof Class) {
    return <ClassIcon />;
  } else if (target instanceof Enumeration) {
    return <EnumerationIcon />;
  } else if (target instanceof Association) {
    return <AssociationIcon />;
  }
  return <UnknownTypeIcon />;
};

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
  const closeTab = (tabState: MappingEditorTabState) => (): void => {
    flowResult(mappingEditorState.closeTab(tabState)).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  };
  const closeTabOnMiddleClick =
    (tabState: MappingEditorTabState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        flowResult(mappingEditorState.closeTab(tabState)).catch(
          applicationStore.alertIllegalUnhandledError,
        );
      }
    };
  const openTab = (tabState: MappingEditorTabState): (() => Promise<void>) =>
    applicationStore.guaranteeSafeAction(() =>
      flowResult(mappingEditorState.openTab(tabState)),
    );

  return (
    <div className="mapping-editor">
      <SplitPane
        split="vertical"
        defaultSize={300}
        minSize={300}
        maxSize={-600}
      >
        <div className="mapping-editor__side-bar">
          <SplitPane
            split="horizontal"
            defaultSize="50%"
            minSize={28}
            maxSize={-36}
          >
            <MappingExplorer isReadOnly={isReadOnly} />
            <MappingTestsExplorer isReadOnly={isReadOnly} />
          </SplitPane>
        </div>
        <div className="panel">
          <ContextMenu
            className="panel__header mapping-editor__header"
            disabled={true}
          >
            <div
              data-testid={CORE_TEST_ID.EDITOR__TABS__HEADER}
              className="mapping-editor__header__tabs"
            >
              {mappingEditorState.openedTabStates.map((tabState) => (
                <div
                  key={tabState.uuid}
                  onMouseUp={closeTabOnMiddleClick(tabState)}
                  className={clsx('mapping-editor__header__tab', {
                    'mapping-editor__header__tab--active':
                      tabState === mappingEditorState.currentTabState,
                  })}
                >
                  <ContextMenu
                    className="mapping-editor__header__tab__content"
                    content={
                      <MappingEditorHeaderTabContextMenu tabState={tabState} />
                    }
                  >
                    {tabState instanceof MappingTestState && (
                      <>
                        <FlaskIcon className="mapping-editor__header__tab__icon--test" />
                        <button
                          className="mapping-editor__header__tab__element__name"
                          tabIndex={-1}
                          onClick={openTab(tabState)}
                        >
                          {tabState.test.name}
                        </button>
                      </>
                    )}
                    {tabState instanceof MappingElementState && (
                      <>
                        <div
                          className={`mapping-editor__header__tab__element__type icon color--${getMappingElementType(
                            tabState.mappingElement,
                          ).toLowerCase()}`}
                        >
                          {getMappingElementTargetIcon(tabState.mappingElement)}
                        </div>
                        <button
                          className="mapping-editor__header__tab__element__name"
                          tabIndex={-1}
                          onClick={openTab(tabState)}
                          title={`${toSentenceCase(
                            getMappingElementType(tabState.mappingElement),
                          ).toLowerCase()} mapping '${
                            tabState.mappingElement.id.value
                          }' for '${
                            getMappingElementTarget(tabState.mappingElement)
                              .name
                          }'`}
                        >
                          {tabState.mappingElement.label.value}
                        </button>
                      </>
                    )}
                    {tabState instanceof MappingExecutionState && (
                      <>
                        <PlayIcon className="mapping-editor__header__tab__icon--execution" />
                        <button
                          className="mapping-editor__header__tab__element__name"
                          tabIndex={-1}
                          onClick={openTab(tabState)}
                        >
                          {tabState.name}
                        </button>
                      </>
                    )}
                    <button
                      className="mapping-editor__header__tab__close-btn"
                      onClick={closeTab(tabState)}
                      tabIndex={-1}
                      title={'Close'}
                    >
                      <TimesIcon />
                    </button>
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
