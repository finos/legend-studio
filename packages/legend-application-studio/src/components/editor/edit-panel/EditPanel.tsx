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
import { observer } from 'mobx-react-lite';
import {
  clsx,
  DropdownMenu,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  PlusIcon,
  ArrowsAltHIcon,
  useResizeDetector,
  GeneralTabEditor,
  type TabState,
  GeneralTabDropDown,
} from '@finos/legend-art';
import { MappingEditor } from './mapping-editor/MappingEditor.js';
import { UMLEditor } from './uml-editor/UMLEditor.js';
import { MappingEditorState } from '../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { UMLEditorState } from '../../../stores/editor-state/element-editor-state/UMLEditorState.js';
import { ElementEditorState } from '../../../stores/editor-state/element-editor-state/ElementEditorState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID.js';
import { ELEMENT_NATIVE_VIEW_MODE } from '../../../stores/EditorConfig.js';
import {
  DIFF_VIEW_MODE,
  EntityDiffViewState,
} from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { EntityDiffView } from '../../editor/edit-panel/diff-editor/EntityDiffView.js';
import { ModelImporter } from './ModelImporter.js';
import { ModelImporterState } from '../../../stores/editor-state/ModelImporterState.js';
import { FunctionEditorState } from '../../../stores/editor-state/element-editor-state/FunctionEditorState.js';
import { ServiceEditorState } from '../../../stores/editor-state/element-editor-state/service/ServiceEditorState.js';
import { ProjectConfigurationEditorState } from '../../../stores/editor-state/ProjectConfigurationEditorState.js';
import { ProjectConfigurationEditor } from '../../editor/edit-panel/project-configuration-editor/ProjectConfigurationEditor.js';
import { ElementGenerationEditor } from './element-generation-editor/ElementGenerationEditor.js';
import { FunctionEditor } from './FunctionEditor.js';
import { ElementNativeView } from './element-generation-editor/ElementNativeView.js';
import { ServiceEditor } from './service-editor/ServiceEditor.js';
import { PackageableRuntimeEditor } from './RuntimeEditor.js';
import { PackageableRuntimeEditorState } from '../../../stores/editor-state/element-editor-state/RuntimeEditorState.js';
import { PackageableConnectionEditorState } from '../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { PackageableConnectionEditor } from './connection-editor/ConnectionEditor.js';
import { FileGenerationEditorState } from '../../../stores/editor-state/element-editor-state/FileGenerationEditorState.js';
import { FileGenerationEditor } from './element-generation-editor/FileGenerationEditor.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { EntityChangeConflictEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import { EntityChangeConflictEditor } from './diff-editor/EntityChangeConflictEditor.js';
import { UnsupportedElementEditorState } from '../../../stores/editor-state/UnsupportedElementEditorState.js';
import { UnsupportedElementEditor } from './UnsupportedElementEditor.js';
import { getPrettyLabelForRevision } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { GenerationSpecificationEditorState } from '../../../stores/editor-state/GenerationSpecificationEditorState.js';
import { GenerationSpecificationEditor } from './GenerationSpecificationEditor.js';
import { FileGenerationViewerState } from '../../../stores/editor-state/FileGenerationViewerState.js';
import { FileGenerationViewer } from '../../editor/edit-panel/FileGenerationViewer.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../../../stores/LegendStudioApplicationPlugin.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { PackageableDataEditorState } from '../../../stores/editor-state/element-editor-state/data/DataEditorState.js';
import { DataElementEditor } from './data-editor/DataElementEditor.js';
import { horizontalToVerticalScroll } from '@finos/legend-application';

export const ViewerEditPanelSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 50;
  const [showCommandList, setShowCommandList] = useState(false);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowCommandList(
      (width ?? 0) > commandListWidth && (height ?? 0) > commandListHeight,
    );
  }, [width, height]);

  return (
    <div ref={ref} className="edit-panel__splash-screen">
      <div
        className={clsx('edit-panel__splash-screen__content', {
          'edit-panel__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Open or Search for an Element
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditPanelSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 180;
  const [showCommandList, setShowCommandList] = useState(false);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowCommandList(
      (width ?? 0) > commandListWidth && (height ?? 0) > commandListHeight,
    );
  }, [width, height]);

  return (
    <div ref={ref} className="edit-panel__splash-screen">
      <div
        className={clsx('edit-panel__splash-screen__content', {
          'edit-panel__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Open or Search for an Element
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Push Local Changes
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">S</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Toggle Hackermode
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F8</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Compile
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F9</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentTabState = editorStore.tabManagerState.currentTab;
  const openedTabStates = editorStore.tabManagerState.tabs;
  const nativeViewModes =
    currentTabState instanceof ElementEditorState
      ? Object.values(ELEMENT_NATIVE_VIEW_MODE)
      : [];
  const generationViewModes =
    currentTabState instanceof ElementEditorState
      ? editorStore.graphState.graphGenerationState.fileGenerationConfigurations
          .slice()
          .sort((a, b): number => a.label.localeCompare(b.label))
      : [];

  const renderActiveElementTab = (): React.ReactNode => {
    if (currentTabState instanceof ElementEditorState) {
      if (currentTabState.generationViewMode) {
        const elementGenerationState = editorStore.elementGenerationStates.find(
          (state) =>
            state.fileGenerationType === currentTabState.generationViewMode,
        );
        return (
          <ElementGenerationEditor
            key={elementGenerationState?.uuid}
            elementGenerationState={guaranteeNonNullable(
              elementGenerationState,
            )}
            currentElementState={currentTabState}
          />
        );
      }
      switch (currentTabState.editMode) {
        case ELEMENT_NATIVE_VIEW_MODE.FORM: {
          if (currentTabState instanceof UMLEditorState) {
            return <UMLEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof FunctionEditorState) {
            return <FunctionEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof MappingEditorState) {
            return <MappingEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof ServiceEditorState) {
            return <ServiceEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof PackageableRuntimeEditorState) {
            return <PackageableRuntimeEditor key={currentTabState.uuid} />;
          } else if (
            currentTabState instanceof PackageableConnectionEditorState
          ) {
            return <PackageableConnectionEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof FileGenerationEditorState) {
            return <FileGenerationEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof PackageableDataEditorState) {
            return <DataElementEditor key={currentTabState.uuid} />;
          } else if (
            currentTabState instanceof GenerationSpecificationEditorState
          ) {
            return <GenerationSpecificationEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof UnsupportedElementEditorState) {
            return <UnsupportedElementEditor key={currentTabState.uuid} />;
          }
          const extraElementEditorCreators = editorStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_LegendStudioApplicationPlugin_Extension
                ).getExtraElementEditorRenderers?.() ?? [],
            );
          for (const elementEditorCreators of extraElementEditorCreators) {
            const elementEditor = elementEditorCreators(currentTabState);
            if (elementEditor) {
              return elementEditor;
            }
          }
          break;
        }
        case ELEMENT_NATIVE_VIEW_MODE.JSON:
        case ELEMENT_NATIVE_VIEW_MODE.GRAMMAR:
          return (
            <ElementNativeView
              key={currentTabState.uuid}
              currentElementState={currentTabState}
            />
          );
        default:
          return null;
      }
    } else if (currentTabState instanceof EntityDiffViewState) {
      return (
        <EntityDiffView
          key={currentTabState.uuid}
          entityDiffViewState={currentTabState}
        />
      );
    } else if (currentTabState instanceof EntityChangeConflictEditorState) {
      return (
        <EntityChangeConflictEditor
          key={currentTabState.uuid}
          conflictEditorState={currentTabState}
        />
      );
    } else if (currentTabState instanceof FileGenerationViewerState) {
      return <FileGenerationViewer key={currentTabState.uuid} />;
    } else if (currentTabState instanceof ModelImporterState) {
      return <ModelImporter />;
    } else if (currentTabState instanceof ProjectConfigurationEditorState) {
      return <ProjectConfigurationEditor />;
    }
    // TODO: create an editor for unsupported tab
    return null;
  };

  const renderHeaderButtonLabel = (
    editorState: TabState,
  ): React.ReactNode | undefined => {
    if (editorState instanceof EntityDiffViewState) {
      return (
        <div className="edit-panel__header__tab__label__diff">
          <div className="edit-panel__header__tab__label__diff__element-name">
            {editorState.headerName}
          </div>
          <div className="edit-panel__header__tab__label__diff__text">
            ({getPrettyLabelForRevision(editorState.fromRevision)}
          </div>
          <div className="edit-panel__header__tab__label__diff__icon">
            <ArrowsAltHIcon />
          </div>
          <div className="edit-panel__header__tab__label__diff__text">
            {getPrettyLabelForRevision(editorState.toRevision)})
          </div>
        </div>
      );
    } else if (editorState instanceof EntityChangeConflictEditorState) {
      return (
        <div className="edit-panel__header__tab__label__diff">
          <div className="edit-panel__header__tab__label__diff__element-name">
            {editorState.headerName}
          </div>
          <div className="edit-panel__header__tab__label__diff__text">
            {editorState.isReadOnly ? '(Merge Preview)' : '(Merged)'}
          </div>
        </div>
      );
    }
    return editorState.headerName;
  };

  if (!currentTabState) {
    return editorStore.isInViewerMode ? (
      <ViewerEditPanelSplashScreen />
    ) : (
      <EditPanelSplashScreen />
    );
  }
  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.EDIT_PANEL}
      className="panel edit-panel"
    >
      <ContextMenu disabled={true} className="panel__header edit-panel__header">
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.EDIT_PANEL__HEADER_TABS}
          className="edit-panel__header__tabs"
          onWheel={horizontalToVerticalScroll}
        >
          {openedTabStates.map((editorState) => (
            <GeneralTabEditor
              headerName="edit-panel"
              headerTitle={
                editorState instanceof ElementEditorState
                  ? editorState.element.path
                  : editorState instanceof EntityDiffViewState
                  ? editorState.headerTooltip
                  : editorState.headerName
              }
              key={editorState.uuid}
              tabState={editorState}
              DND_TYPE="EDITOR_STATE"
              managerTabState={editorStore.tabManagerState}
              renderHeaderButtonLabel={renderHeaderButtonLabel}
            />
          ))}
        </div>

        <div className="edit-panel__header__actions">
          <GeneralTabDropDown managerTabState={editorStore.tabManagerState} />
          {currentTabState instanceof ElementEditorState && (
            <DropdownMenu
              className="edit-panel__view-mode__type"
              title="View as..."
              content={
                <MenuContent
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS
                  }
                  className="edit-panel__view-mode__options edit-panel__view-mode__options--with-group"
                >
                  <div className="edit-panel__view-mode__option__group edit-panel__view-mode__option__group--native">
                    <div className="edit-panel__view-mode__option__group__name">
                      native
                    </div>
                    <div className="edit-panel__view-mode__option__group__options">
                      {nativeViewModes.map((mode) => (
                        <MenuContentItem
                          key={mode}
                          className="edit-panel__view-mode__option"
                          onClick={(): void =>
                            currentTabState.setEditMode(mode)
                          }
                        >
                          {mode}
                        </MenuContentItem>
                      ))}
                    </div>
                  </div>
                  {Boolean(generationViewModes.length) && (
                    <>
                      <div className="edit-panel__view-mode__option__group__separator" />
                      <div className="edit-panel__view-mode__option__group edit-panel__view-mode__option__group--generation">
                        <div className="edit-panel__view-mode__option__group__name">
                          generation
                        </div>
                        <div className="edit-panel__view-mode__option__group__options">
                          {generationViewModes.map((mode) => (
                            <MenuContentItem
                              key={mode.key}
                              className="edit-panel__view-mode__option"
                              disabled={
                                !editorStore.graphState.graphGenerationState.supportedFileGenerationConfigurationsForCurrentElement.includes(
                                  mode,
                                )
                              }
                              onClick={(): void =>
                                currentTabState.setGenerationViewMode(mode.key)
                              }
                            >
                              {mode.label}
                            </MenuContentItem>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <div className="edit-panel__view-mode__type__label">
                {currentTabState.generationViewMode
                  ? editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(
                      currentTabState.generationViewMode,
                    ).label
                  : currentTabState.editMode}
              </div>
            </DropdownMenu>
          )}
          {currentTabState instanceof EntityDiffViewState && (
            <DropdownMenu
              className="edit-panel__view-mode__type"
              title="View as..."
              content={
                <MenuContent
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS
                  }
                  className="edit-panel__view-mode__options"
                >
                  <MenuContentItem
                    className="edit-panel__view-mode__option"
                    onClick={(): void =>
                      currentTabState.setDiffMode(DIFF_VIEW_MODE.GRAMMAR)
                    }
                  >
                    {DIFF_VIEW_MODE.GRAMMAR}
                  </MenuContentItem>
                  <MenuContentItem
                    className="edit-panel__view-mode__option"
                    onClick={(): void =>
                      currentTabState.setDiffMode(DIFF_VIEW_MODE.JSON)
                    }
                  >
                    {DIFF_VIEW_MODE.JSON}
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <div className="edit-panel__view-mode__type__label">
                {currentTabState.diffMode}
              </div>
            </DropdownMenu>
          )}
        </div>
      </ContextMenu>
      <div
        // NOTE: This is one small but extremely important line. Using `key` we effectivly force-remounting the element editor
        // component every time current element editor state is changed. This is great to control errors that has to do with stale states
        // when we `reprocess` world or when we switch tabs between 2 elements of the same type (i.e. 2 classes, 2 mappings, etc.)
        // See https://github.com/bvaughn/react-error-boundary/issues/23#issuecomment-425470511
        key={currentTabState.uuid}
        className="panel__content edit-panel__content"
        data-testid={LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT}
      >
        {renderActiveElementTab()}
      </div>
    </div>
  );
});
