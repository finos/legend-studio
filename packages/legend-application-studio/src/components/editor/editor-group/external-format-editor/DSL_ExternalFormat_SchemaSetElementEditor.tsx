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

import { observer } from 'mobx-react-lite';
import {
  clsx,
  ContextMenu,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  LockIcon,
  PlusIcon,
  PanelLoadingIndicator,
  UploadIcon,
  Dialog,
  TimesIcon,
  BlankPanelContent,
  MenuContent,
  MenuContentItem,
  PanelContent,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalFooterButton,
} from '@finos/legend-art';
import { ExternalFormatSchema as Schema } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import {
  SchemaSetEditorState,
  type InnerSchemaSetEditorState,
  SCHEMA_SET_TAB_TYPE,
} from '../../../../stores/editor/editor-state/element-editor-state/external-format/DSL_ExternalFormat_SchemaSetEditorState.js';
import { guaranteeNonNullable, prettyCONSTName } from '@finos/legend-shared';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  externalFormat_schemaSet_addSchema,
  externalFormat_schemaSet_deleteSchema,
  externalFormat_schema_setContent,
  externalFormat_schema_setId,
  externalFormat_schema_setLocation,
} from '../../../../stores/graph-modifier/DSL_ExternalFormat_GraphModifierHelper.js';
import { SchemaSetModelGenerationEditor } from './DSL_ExternalFormat_SchemaSetModelGenerationEditor.js';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { getEditorLanguageForFormat } from '../../../../stores/editor/editor-state/ArtifactGenerationViewerState.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useApplicationNavigationContext } from '@finos/legend-application';

const SchemaLoader = observer(
  (props: {
    schemaSetEditorState: InnerSchemaSetEditorState | SchemaSetEditorState;
  }) => {
    const { schemaSetEditorState } = props;
    const applicationStore = schemaSetEditorState.editorStore.applicationStore;
    const importState = schemaSetEditorState.importSchemaContentState;
    const onClose = (): void => importState.closeModal();
    const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const fileList = event.target.files;
      if (fileList) {
        importState.setFiles(Array.from(fileList));
      }
    };
    const importSchemas = (): void => {
      if (importState.files) {
        importState.importSchemas(importState.files);
      }
    };
    return (
      <Dialog
        onClose={onClose}
        open={importState.importSchemaModal}
        slotProps={{
          transition: {
            appear: false, // disable transition
          },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="modal--scrollable patch-loader"
        >
          <ModalHeader title="Schema Content Loader" />
          <ModalBody>
            <PanelLoadingIndicator
              isLoading={importState.loadingSchemaContentState.isInProgress}
            />
            <div>
              <input
                type="file"
                name="myFiles"
                onChange={onChange}
                multiple={true}
              />
            </div>
            {importState.files && (
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Schema Files
                </div>
                <div className="panel__content__form__section__list">
                  <div className="panel__content__form__section__list__items">
                    {importState.files.map((value) => (
                      <div
                        key={value.name}
                        className="panel__content__form__section__list__item"
                      >
                        <div className="panel__content__form__section__list__item__value">
                          {value.name}
                        </div>
                        <div className="panel__content__form__section__list__item__actions">
                          <button
                            title="Remove change"
                            className="panel__content__form__section__list__item__remove-btn"
                            onClick={(): void => importState.removeFile(value)}
                            tabIndex={-1}
                          >
                            <TimesIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="blocking-alert__action--standard"
              text="Import Schemas"
              onClick={importSchemas}
              disabled={!importState.files?.length}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const SchemaBasicEditor = observer(
  (props: {
    schema: Schema;
    language: CODE_EDITOR_LANGUAGE;
    isReadOnly: boolean;
  }) => {
    const { schema, isReadOnly, language } = props;
    const changeId: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      externalFormat_schema_setId(schema, event.target.value);
    const changeLocation: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => externalFormat_schema_setLocation(schema, event.target.value);
    return (
      <div className="schema-editor">
        <input
          className="schema-editor__id"
          disabled={isReadOnly}
          value={schema.id}
          spellCheck={false}
          onChange={changeId}
          placeholder="Id"
        />
        <input
          className="schema-editor__location"
          disabled={isReadOnly}
          value={schema.location}
          spellCheck={false}
          onChange={changeLocation}
          placeholder="Location"
        />
        <div className={clsx('schema-editor__content')}>
          <div className="schema-editor__content__input">
            <CodeEditor
              inputValue={schema.content}
              language={language}
              updateInput={(val: string): void => {
                externalFormat_schema_setContent(schema, val);
              }}
              hideGutter={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const SchemaSetGeneralEditor = observer(
  (props: {
    schemaSetEditorState: InnerSchemaSetEditorState | SchemaSetEditorState;
    isReadOnly: boolean;
  }) => {
    const { schemaSetEditorState, isReadOnly } = props;
    const schemaSet = schemaSetEditorState.schemaSet;
    const applicationStore = schemaSetEditorState.editorStore.applicationStore;
    const importSchemaContentState =
      schemaSetEditorState.importSchemaContentState;
    const currentSchema = schemaSetEditorState.currentSchema;
    const description =
      schemaSetEditorState.schemaSetModelGenerationState.description;
    // TEMPROARY engine api should return `fileformat`.
    const language = description
      ? getEditorLanguageForFormat(description.name)
      : CODE_EDITOR_LANGUAGE.TEXT;
    const changeState =
      (schema: Schema): (() => void) =>
      (): void => {
        schemaSetEditorState.setCurrentSchema(schema);
      };
    const getIndex = (value: Schema): number =>
      guaranteeNonNullable(
        schemaSet.schemas.findIndex((schema: Schema) => value === schema),
        `Can't find schema '${value}' in schema set '${schemaSet.path}'`,
      );
    const addSchema = (): void => {
      if (!isReadOnly) {
        const schema = new Schema();
        externalFormat_schema_setContent(schema, '');
        externalFormat_schemaSet_addSchema(schemaSet, schema);
        schemaSetEditorState.setCurrentSchema(schema);
      }
    };
    const openSchemaLoader = (): void =>
      importSchemaContentState.setImportSchemaModal(true);
    const deleteSchema =
      (val: Schema): (() => void) =>
      (): void => {
        externalFormat_schemaSet_deleteSchema(schemaSet, val);
        if (schemaSet.schemas.length !== 0) {
          schemaSetEditorState.setCurrentSchema(
            schemaSet.schemas[schemaSet.schemas.length - 1],
          );
        }
        if (schemaSet.schemas.length === 0) {
          schemaSetEditorState.setCurrentSchema(undefined);
        }
      };
    const validateSchema = (): void => {
      if (
        currentSchema &&
        schemaSetEditorState instanceof SchemaSetEditorState
      ) {
        flowResult(schemaSetEditorState.validateSchema(currentSchema)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    return (
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel minSize={30} size={300}>
          <div className="schema-set-panel">
            <div className="schema-set-panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">{`${schemaSet.format} configuration`}</div>
              </div>
              <div className="schema-set-panel__header__actions">
                <button
                  className="schema-set-panel__header__action"
                  onClick={openSchemaLoader}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title="Import Schemas"
                >
                  <UploadIcon />
                </button>
                <button
                  className="schema-set-panel__header__action"
                  onClick={addSchema}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title="Add Schema"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
            {schemaSet.schemas.map((schema: Schema, index: number) => (
              <ContextMenu
                key={schema._UUID}
                className={clsx('schema-set-panel__item', {
                  'schema-set-panel__item--active': currentSchema === schema,
                })}
                disabled={isReadOnly}
                content={
                  <MenuContent>
                    <MenuContentItem onClick={deleteSchema(schema)}>
                      Delete
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{ elevation: 7 }}
              >
                <div
                  className="schema-set-panel__item__label"
                  onClick={changeState(schema)}
                >
                  {schema.id ? schema.id : `Schema${index + 1}`}
                </div>
              </ContextMenu>
            ))}
          </div>
        </ResizablePanel>
        <ResizablePanelSplitter>
          <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
        </ResizablePanelSplitter>
        <ResizablePanel>
          <div className="schema-set-panel">
            <div className="schema-set-panel__header">
              <div className="schema-set-panel__header__title">
                {isReadOnly && (
                  <div className="schema-set-panel__header__lock">
                    <LockIcon />
                  </div>
                )}
                <div className="schema-set-panel__header__title__label">
                  Schema
                </div>
                <div className="schema-set-panel__header__title__content">
                  {currentSchema !== undefined
                    ? currentSchema.id
                      ? currentSchema.id
                      : `Schema${getIndex(currentSchema) + 1}`
                    : ''}
                </div>
              </div>
              <div className="panel__header__actions">
                {schemaSetEditorState instanceof SchemaSetEditorState && (
                  <button
                    className="btn--dark model-loader__header__load-btn"
                    onClick={validateSchema}
                    disabled={!currentSchema}
                    tabIndex={-1}
                    title="Validate Schema"
                  >
                    Validate
                  </button>
                )}
              </div>
            </div>
            <div className="schema-set-panel__content">
              <div className="schema-set-panel__content__lists">
                {schemaSetEditorState.importSchemaContentState
                  .importSchemaModal && (
                  <SchemaLoader schemaSetEditorState={schemaSetEditorState} />
                )}
                {currentSchema !== undefined && (
                  <SchemaBasicEditor
                    key={currentSchema._UUID}
                    language={language}
                    schema={currentSchema}
                    isReadOnly={isReadOnly}
                  />
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);

export const SchemaSetEditor = observer(() => {
  const editorStore = useEditorStore();
  const schemaSetEditorState =
    editorStore.tabManagerState.getCurrentEditorState(SchemaSetEditorState);
  const isReadOnly = schemaSetEditorState.isReadOnly;
  const schemaSet = schemaSetEditorState.schemaSet;
  const currentTab = schemaSetEditorState.selectedTab;
  const isFetchingDescriptions =
    editorStore.graphState.graphGenerationState.externalFormatState
      .fetchingDescriptionsState.isInProgress;
  const changeTab =
    (tab: SCHEMA_SET_TAB_TYPE): (() => void) =>
    (): void =>
      schemaSetEditorState.setSelectedTab(tab);
  const renderMainEditPanel = (): React.ReactNode => {
    if (isFetchingDescriptions) {
      return (
        <BlankPanelContent>Fetching format descriptions</BlankPanelContent>
      );
    }
    if (currentTab === SCHEMA_SET_TAB_TYPE.SCHEMAS) {
      return (
        <SchemaSetGeneralEditor
          schemaSetEditorState={schemaSetEditorState}
          isReadOnly={isReadOnly}
        />
      );
    }
    const supportsModelGeneraiton =
      schemaSetEditorState.schemaSetModelGenerationState.description
        ?.supportsModelGeneration;
    return supportsModelGeneraiton ? (
      <SchemaSetModelGenerationEditor
        modelGenerationState={
          schemaSetEditorState.schemaSetModelGenerationState
        }
        isReadOnly={isReadOnly}
      />
    ) : (
      <BlankPanelContent>
        Format {schemaSet.format} does not support Model Generation
      </BlankPanelContent>
    );
  };

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SCHEMA_SET_EDITOR,
  );

  return (
    <div className="panel schema-set-panel">
      <div className="schema-set-panel__header">
        <div className="schema-set-panel__header__title">
          {schemaSetEditorState.isReadOnly && (
            <div className="schema-set-panel__header__lock">
              <LockIcon />
            </div>
          )}
          <div className="schema-set-panel__header__title__label">
            Schema Set
          </div>
          <div className="schema-set-panel__header__title__content">
            {schemaSetEditorState.schemaSet.name}
          </div>
        </div>
      </div>
      <PanelContent>
        <PanelLoadingIndicator isLoading={isFetchingDescriptions} />
        <div className="panel__header">
          <div className="uml-element-editor__tabs">
            {Object.values(SCHEMA_SET_TAB_TYPE).map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('relational-connection-editor__tab', {
                  'relational-connection-editor__tab--active':
                    tab === currentTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
        </div>
        <div className="panel__content file-generation-editor__content">
          {currentTab === SCHEMA_SET_TAB_TYPE.SCHEMAS && (
            <SchemaSetGeneralEditor
              schemaSetEditorState={schemaSetEditorState}
              isReadOnly={isReadOnly}
            />
          )}
          {currentTab === SCHEMA_SET_TAB_TYPE.GENERATE_MODEL &&
            renderMainEditPanel()}
        </div>
      </PanelContent>
    </div>
  );
});
