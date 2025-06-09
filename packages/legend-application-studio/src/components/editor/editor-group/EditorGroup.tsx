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
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  PlusIcon,
  ArrowsAltHIcon,
  useResizeDetector,
  GenericTextFileIcon,
} from '@finos/legend-art';
import { MappingEditor } from './mapping-editor/MappingEditor.js';
import { UMLEditor } from './uml-editor/UMLEditor.js';
import { MappingEditorState } from '../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { UMLEditorState } from '../../../stores/editor/editor-state/element-editor-state/UMLEditorState.js';
import {
  ElementEditorState,
  ELEMENT_GENERATION_MODE,
  ExternalFormatElementGenerationViewModeState,
  FileGenerationViewModeState,
} from '../../../stores/editor/editor-state/element-editor-state/ElementEditorState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { ELEMENT_NATIVE_VIEW_MODE } from '../../../stores/editor/EditorConfig.js';
import {
  DIFF_VIEW_MODE,
  EntityDiffViewState,
} from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { EntityDiffView } from './diff-editor/EntityDiffView.js';
import { ModelImporter } from './ModelImporter.js';
import { ModelImporterState } from '../../../stores/editor/editor-state/ModelImporterState.js';
import { FunctionEditorState } from '../../../stores/editor/editor-state/element-editor-state/FunctionEditorState.js';
import { ServiceEditorState } from '../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
import { ProjectConfigurationEditorState } from '../../../stores/editor/editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.js';
import { ProjectConfigurationEditor } from './project-configuration-editor/ProjectConfigurationEditor.js';
import { ElementGenerationEditor } from './element-generation-editor/ElementGenerationEditor.js';
import { FunctionEditor } from './function-activator/FunctionEditor.js';
import { ElementNativeView } from './element-generation-editor/ElementNativeView.js';
import { ServiceEditor } from './service-editor/ServiceEditor.js';
import { PackageableRuntimeEditor } from './RuntimeEditor.js';
import { PackageableRuntimeEditorState } from '../../../stores/editor/editor-state/element-editor-state/RuntimeEditorState.js';
import { PackageableConnectionEditorState } from '../../../stores/editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { PackageableConnectionEditor } from './connection-editor/ConnectionEditor.js';
import { FileGenerationEditorState } from '../../../stores/editor/editor-state/element-editor-state/FileGenerationEditorState.js';
import { FileGenerationEditor } from './element-generation-editor/FileGenerationEditor.js';
import { EntityChangeConflictEditorState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import { EntityChangeConflictEditor } from './diff-editor/EntityChangeConflictEditor.js';
import { UnsupportedElementEditorState } from '../../../stores/editor/editor-state/UnsupportedElementEditorState.js';
import { UnsupportedElementEditor } from './UnsupportedElementEditor.js';
import { getPrettyLabelForRevision } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { GenerationSpecificationEditorState } from '../../../stores/editor/editor-state/GenerationSpecificationEditorState.js';
import { GenerationSpecificationEditor } from './GenerationSpecificationEditor.js';
import { ArtifactGenerationViewer } from './ArtifactGenerationViewer.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../../../stores/LegendStudioApplicationPlugin.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { PackageableDataEditorState } from '../../../stores/editor/editor-state/element-editor-state/data/DataEditorState.js';
import { DataElementEditor } from './data-editor/DataElementEditor.js';
import { ElementXTGenerationEditor } from './element-generation-editor/ElementXTGenerationEditor.js';
import { TabManager, type TabState } from '@finos/legend-lego/application';
import { INTERNAL__UnknownFunctionActivatorEdtiorState } from '../../../stores/editor/editor-state/element-editor-state/function-activator/INTERNAL__UnknownFunctionActivatorEditorState.js';
import { INTERNAL__UnknownFunctionActivatorEdtior } from './function-activator/INTERNAL__UnknownFunctionActivatorEdtior.js';
import { getElementIcon } from '../../ElementIconUtils.js';
import { ArtifactGenerationViewerState } from '../../../stores/editor/editor-state/ArtifactGenerationViewerState.js';
import { QueryConnectionWorflowEditor } from './end-to-end-flow-editor/ConnectionToQueryWorkflowEditor.js';
import { QueryConnectionEndToEndWorkflowEditorState } from '../../../stores/editor/editor-state/end-to-end-workflow-state/QueryConnectionEndToEndWorkflowEditorState.js';
import { SnowflakeAppFunctionActivatorEdtiorState } from '../../../stores/editor/editor-state/element-editor-state/function-activator/SnowflakeAppFunctionActivatorEditorState.js';
import { SnowflakeAppFunctionActivatorEditor } from './function-activator/SnowflakeAppFunctionActivatorEditor.js';
import {
  ShowcaseCard,
  RuleEngagementCard,
  DocumentationCard,
} from '../../workspace-setup/WorkspaceSetup.js';
import { HostedServiceFunctionActivatorEditorState } from '../../../stores/editor/editor-state/element-editor-state/function-activator/HostedServiceFunctionActivatorEditorState.js';
import { HostedServiceFunctionActivatorEditor } from './function-activator/HostedServiceFunctionActivatorEditor.js';
import { DataProductEditorState } from '../../../stores/editor/editor-state/element-editor-state/dataProduct/DataProductEditorState.js';
import { DataProductEditor } from './dataProduct/DataPoductEditor.js';
import { IngestDefinitionEditorState } from '../../../stores/editor/editor-state/element-editor-state/ingest/IngestDefinitionEditorState.js';
import { IngestDefinitionEditor } from './ingest-editor/IngestDefinitionEditor.js';

export const ViewerEditorGroupSplashScreen: React.FC = () => {
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
    <div ref={ref} className="editor-group__splash-screen">
      <div
        className={clsx('editor-group__splash-screen__content', {
          'editor-group__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="editor-group__splash-screen__content__item">
          <div className="editor-group__splash-screen__content__item__label">
            Open or Search for an Element
          </div>
          <div className="editor-group__splash-screen__content__item__hot-keys">
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

export const EditorGroupSplashScreen: React.FC = () => {
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
    <div ref={ref} className="editor-group__splash-screen">
      <div
        className={clsx('editor-group__splash-screen__content', {
          'editor-group__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="editor-group__splash-screen__content__cards">
          <div className="editor-group__splash-screen__content__cards__container">
            <RuleEngagementCard />
            <ShowcaseCard hideDocumentation={true} />
            <DocumentationCard />
          </div>
        </div>
        <div className="editor-group__splash-screen__content__divider"></div>
        <div className="editor-group__splash-screen__content__actions">
          <div className="editor-group__splash-screen__content__header">
            Essential Keyboard Shortcuts
          </div>
          <div className="editor-group__splash-screen__content__items">
            <div className="editor-group__splash-screen__content__item">
              <div className="editor-group__splash-screen__content__item__label">
                Open or Search for an Element
              </div>
              <div className="editor-group__splash-screen__content__item__hot-keys">
                <div className="hotkey__key">Ctrl</div>
                <div className="hotkey__plus">
                  <PlusIcon />
                </div>
                <div className="hotkey__key">P</div>
              </div>
            </div>
            <div className="editor-group__splash-screen__content__item">
              <div className="editor-group__splash-screen__content__item__label">
                Push Local Changes
              </div>
              <div className="editor-group__splash-screen__content__item__hot-keys">
                <div className="hotkey__key">Ctrl</div>
                <div className="hotkey__plus">
                  <PlusIcon />
                </div>
                <div className="hotkey__key">S</div>
              </div>
            </div>
            <div className="editor-group__splash-screen__content__item">
              <div className="editor-group__splash-screen__content__item__label">
                Open Showcases
              </div>
              <div className="editor-group__splash-screen__content__item__hot-keys">
                <div className="hotkey__key">F7</div>
              </div>
            </div>
            <div className="editor-group__splash-screen__content__item">
              <div className="editor-group__splash-screen__content__item__label">
                Go To Text Mode
              </div>
              <div className="editor-group__splash-screen__content__item__hot-keys">
                <div className="hotkey__key">F8</div>
              </div>
            </div>
            <div className="editor-group__splash-screen__content__item">
              <div className="editor-group__splash-screen__content__item__label">
                Compile
              </div>
              <div className="editor-group__splash-screen__content__item__hot-keys">
                <div className="hotkey__key">F9</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditorGroup = observer(() => {
  const editorStore = useEditorStore();
  const currentTabState = editorStore.tabManagerState.currentTab;
  const nativeViewModes =
    currentTabState instanceof ElementEditorState
      ? Object.values(ELEMENT_NATIVE_VIEW_MODE)
      : [];
  const externalformatViewModes =
    currentTabState instanceof ElementEditorState
      ? editorStore.graphState.graphGenerationState.externalFormatState.externalFormatDescriptions
          .filter((f) => f.supportsSchemaGeneration)
          .toSorted((a, b): number => a.name.localeCompare(b.name))
      : [];
  const generationViewModes = (
    currentTabState instanceof ElementEditorState
      ? editorStore.graphState.graphGenerationState.globalFileGenerationState.fileGenerationConfigurations.toSorted(
          (a, b): number => a.label.localeCompare(b.label),
        )
      : []
  ).filter(
    (file) =>
      !externalformatViewModes
        .map((e) => e.name.toLowerCase())
        .includes(file.key.toLowerCase()),
  );
  const renderActiveElementTab = (): React.ReactNode => {
    if (currentTabState instanceof ElementEditorState) {
      const generationViewState = currentTabState.generationModeState;
      if (generationViewState) {
        if (generationViewState instanceof FileGenerationViewModeState) {
          return (
            <ElementGenerationEditor
              key={generationViewState.elementGenerationState.uuid}
              elementGenerationState={
                generationViewState.elementGenerationState
              }
              currentElementState={currentTabState}
            />
          );
        } else if (
          generationViewState instanceof
          ExternalFormatElementGenerationViewModeState
        ) {
          return (
            <ElementXTGenerationEditor
              key={generationViewState.generationState.uuid}
              elementXTState={generationViewState.generationState}
              currentElementState={currentTabState}
            />
          );
        }
      }
      switch (currentTabState.editMode) {
        case ELEMENT_NATIVE_VIEW_MODE.FORM: {
          if (currentTabState instanceof UMLEditorState) {
            return <UMLEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof FunctionEditorState) {
            return <FunctionEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof MappingEditorState) {
            return <MappingEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof IngestDefinitionEditorState) {
            return <IngestDefinitionEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof ServiceEditorState) {
            return <ServiceEditor key={currentTabState.uuid} />;
          } else if (currentTabState instanceof DataProductEditorState) {
            return <DataProductEditor key={currentTabState.uuid} />;
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
          } else if (
            currentTabState instanceof SnowflakeAppFunctionActivatorEdtiorState
          ) {
            return (
              <SnowflakeAppFunctionActivatorEditor key={currentTabState.uuid} />
            );
          } else if (
            currentTabState instanceof HostedServiceFunctionActivatorEditorState
          ) {
            return (
              <HostedServiceFunctionActivatorEditor
                key={currentTabState.uuid}
              />
            );
          } else if (currentTabState instanceof UnsupportedElementEditorState) {
            return <UnsupportedElementEditor key={currentTabState.uuid} />;
          } else if (
            currentTabState instanceof
            INTERNAL__UnknownFunctionActivatorEdtiorState
          ) {
            return (
              <INTERNAL__UnknownFunctionActivatorEdtior
                key={currentTabState.uuid}
              />
            );
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
    } else if (currentTabState instanceof ArtifactGenerationViewerState) {
      return <ArtifactGenerationViewer key={currentTabState.uuid} />;
    } else if (currentTabState instanceof ModelImporterState) {
      return <ModelImporter />;
    } else if (currentTabState instanceof ProjectConfigurationEditorState) {
      return <ProjectConfigurationEditor />;
    } else if (
      currentTabState instanceof QueryConnectionEndToEndWorkflowEditorState
    ) {
      if (
        editorStore.globalEndToEndWorkflowState
          .queryToConnectionWorkflowEditorState.packageableConnection
          ?.connectionValue.store
      ) {
        return (
          <QueryConnectionWorflowEditor
            connectionToQueryWorkflowState={
              editorStore.globalEndToEndWorkflowState
                .queryToConnectionWorkflowEditorState
            }
          />
        );
      } else {
        editorStore.applicationStore.notificationService.notifyError(
          `Cannot open query to connection workflow editor because the connection does not have a store`,
        );
        return null;
      }
    }
    // TODO: create an editor for unsupported tab
    return null;
  };

  const renderTab = (editorState: TabState): React.ReactNode | undefined => {
    if (editorState instanceof EntityDiffViewState) {
      return (
        <div className="diff-tab">
          <div className="diff-tab__element-icon">
            {editorState.element ? (
              (getElementIcon(editorState.element, editorStore, {
                returnEmptyForUnknown: true,
              }) ?? <GenericTextFileIcon />)
            ) : (
              <GenericTextFileIcon />
            )}
          </div>
          <div className="diff-tab__element-name">{editorState.label}</div>
          <div className="diff-tab__text">
            ({getPrettyLabelForRevision(editorState.fromRevision)}
          </div>
          <div className="diff-tab__icon">
            <ArrowsAltHIcon />
          </div>
          <div className="diff-tab__text">
            {getPrettyLabelForRevision(editorState.toRevision)})
          </div>
        </div>
      );
    } else if (editorState instanceof EntityChangeConflictEditorState) {
      return (
        <div className="diff-tab">
          <div className="diff-tab__element-icon">
            <GenericTextFileIcon />
          </div>
          <div className="diff-tab__element-name">{editorState.label}</div>
          <div className="diff-tab__text">
            {editorState.isReadOnly ? '(Merge Preview)' : '(Merged)'}
          </div>
        </div>
      );
    }

    return (
      <div className="editor-group__header__tab">
        <div className="editor-group__header__tab__icon">
          {editorState instanceof ElementEditorState ? (
            (getElementIcon(editorState.element, editorStore, {
              returnEmptyForUnknown: true,
            }) ?? <GenericTextFileIcon />)
          ) : (
            <GenericTextFileIcon />
          )}
        </div>
        <div className="editor-group__header__tab__label">
          {editorState.label}
        </div>
        {editorState instanceof ElementEditorState &&
          editorStore.tabManagerState.tabs.filter(
            (tab) =>
              tab instanceof ElementEditorState &&
              tab.label === editorState.label,
          ).length > 1 && (
            <div className="editor-group__header__tab__path">
              {editorState.element.path}
            </div>
          )}
      </div>
    );
  };

  if (!currentTabState) {
    return editorStore.isInViewerMode ? (
      <ViewerEditorGroupSplashScreen />
    ) : (
      <EditorGroupSplashScreen />
    );
  }
  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.EDITOR_GROUP}
      className="panel editor-group"
    >
      <div className="panel__header editor-group__header">
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__HEADER_TABS}
          className="editor-group__header__tabs"
        >
          <TabManager
            tabManagerState={editorStore.tabManagerState}
            tabRenderer={renderTab}
          />
        </div>
        <div className="editor-group__header__actions">
          {currentTabState instanceof ElementEditorState && (
            <ControlledDropdownMenu
              className="editor-group__view-mode__type"
              title="View as..."
              content={
                <MenuContent
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__ELEMENT_VIEW__OPTIONS
                  }
                  className="editor-group__view-mode__options editor-group__view-mode__options--with-group"
                >
                  <div className="editor-group__view-mode__option__group editor-group__view-mode__option__group--native">
                    <div className="editor-group__view-mode__option__group__name">
                      native
                    </div>
                    <div className="editor-group__view-mode__option__group__options">
                      {nativeViewModes.map((mode) => (
                        <MenuContentItem
                          key={mode}
                          className="editor-group__view-mode__option"
                          onClick={(): void =>
                            currentTabState.setEditMode(mode)
                          }
                        >
                          {mode}
                        </MenuContentItem>
                      ))}
                    </div>
                  </div>
                  {Boolean(externalformatViewModes.length) && (
                    <>
                      <div className="editor-group__view-mode__option__group__separator" />
                      <div className="editor-group__view-mode__option__group editor-group__view-mode__option__group--generation">
                        <div className="editor-group__view-mode__option__group__name">
                          external format
                        </div>
                        <div className="editor-group__view-mode__option__group__options">
                          {externalformatViewModes.map((mode) => (
                            <MenuContentItem
                              key={mode.name}
                              className="editor-group__view-mode__option"
                              onClick={(): void =>
                                currentTabState.changeGenerationModeState(
                                  mode.name,
                                  ELEMENT_GENERATION_MODE.EXTERNAL_FORMAT,
                                )
                              }
                            >
                              {mode.name}
                            </MenuContentItem>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {Boolean(generationViewModes.length) && (
                    <>
                      <div className="editor-group__view-mode__option__group__separator" />
                      <div className="editor-group__view-mode__option__group editor-group__view-mode__option__group--generation">
                        <div className="editor-group__view-mode__option__group__name">
                          file
                        </div>
                        <div className="editor-group__view-mode__option__group__options">
                          {generationViewModes.map((mode) => (
                            <MenuContentItem
                              key={mode.key}
                              className="editor-group__view-mode__option"
                              disabled={
                                !editorStore.graphState.graphGenerationState.globalFileGenerationState.supportedFileGenerationConfigurationsForCurrentElement.includes(
                                  mode,
                                )
                              }
                              onClick={(): void =>
                                currentTabState.changeGenerationModeState(
                                  mode.key,
                                  ELEMENT_GENERATION_MODE.FILE_GENERATION,
                                )
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
              <div className="editor-group__view-mode__type__label">
                {currentTabState.generationModeState?.label ??
                  currentTabState.editMode}
              </div>
            </ControlledDropdownMenu>
          )}
          {currentTabState instanceof EntityDiffViewState && (
            <ControlledDropdownMenu
              className="editor-group__view-mode__type"
              title="View as..."
              content={
                <MenuContent
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__ELEMENT_VIEW__OPTIONS
                  }
                  className="editor-group__view-mode__options"
                >
                  <MenuContentItem
                    className="editor-group__view-mode__option"
                    onClick={(): void =>
                      currentTabState.setDiffMode(DIFF_VIEW_MODE.GRAMMAR)
                    }
                  >
                    {DIFF_VIEW_MODE.GRAMMAR}
                  </MenuContentItem>
                  <MenuContentItem
                    className="editor-group__view-mode__option"
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
              <div className="editor-group__view-mode__type__label">
                {currentTabState.diffMode}
              </div>
            </ControlledDropdownMenu>
          )}
        </div>
      </div>
      <div
        // NOTE: This is one small but extremely important line. Using `key` we effectivly force-remounting the element editor
        // component every time current element editor state is changed. This is great to control errors that has to do with stale states
        // when we `reprocess` world or when we switch tabs between 2 elements of the same type (i.e. 2 classes, 2 mappings, etc.)
        // See https://github.com/bvaughn/react-error-boundary/issues/23#issuecomment-425470511
        key={currentTabState.uuid}
        className="panel__content editor-group__content"
        data-testid={LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT}
      >
        {renderActiveElementTab()}
      </div>
    </div>
  );
});
