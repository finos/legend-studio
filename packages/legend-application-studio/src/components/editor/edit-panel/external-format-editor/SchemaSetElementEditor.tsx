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
  RefreshIcon,
  PanelLoadingIndicator,
  UploadIcon,
  Dialog,
  TimesIcon,
  BlankPanelContent,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-art';
import {
  type GenerationProperty,
  ExternalFormatSchema as Schema,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { useMemo } from 'react';
import {
  SchemaSetEditorState,
  SCHEMA_SET_TAB_TYPE,
} from '../../../../stores/editor-state/element-editor-state/external-format/SchemaSetEditorState.js';
import { EDITOR_LANGUAGE } from '@finos/legend-application';
import { StudioTextInputEditor } from '../../../shared/StudioTextInputEditor.js';
import { getEditorLanguageFromFormat } from '../../../../stores/editor-state/FileGenerationViewerState.js';
import {
  debounce,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import { GenerationPropertyEditor } from '../element-generation-editor/FileGenerationEditor.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  externalFormat_schemaSet_addSchema,
  externalFormat_schemaSet_deleteSchema,
  externalFormat_schema_setContent,
  externalFormat_schema_setId,
  externalFormat_schema_setLocation,
} from '../../../../stores/graphModifier/DSLExternalFormat_GraphModifierHelper.js';

const SchemaLoader = observer(
  (props: { schemaSetEditorState: SchemaSetEditorState }) => {
    const { schemaSetEditorState } = props;
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
        TransitionProps={{
          appear: false, // disable transition
        }}
      >
        <div className="modal modal--dark modal--scrollable patch-loader">
          <div className="modal__header">
            <div className="modal__title">
              <div className="modal__title__label">Schema Content Loader</div>
            </div>
          </div>
          <div className="modal__body">
            <PanelLoadingIndicator
              isLoading={importState.loadingSchemaContentState.isInProgress}
            />
            <div>
              <input
                id="upload-file"
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
          </div>
          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--dark blocking-alert__action--standard"
              onClick={importSchemas}
              disabled={!importState.files?.length}
            >
              Import Schemas
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

const SchemaBasicEditor = observer(
  (props: {
    schema: Schema;
    language: EDITOR_LANGUAGE;
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
          placeholder={`Id`}
        />
        <input
          className="schema-editor__location"
          disabled={isReadOnly}
          value={schema.location}
          spellCheck={false}
          onChange={changeLocation}
          placeholder={`Location`}
        />
        <div className={clsx('schema-editor__content')}>
          <div className="schema-editor__content__input">
            <StudioTextInputEditor
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

const SchemaSetGeneralEditor = observer(
  (props: { schemaSetEditorState: SchemaSetEditorState }) => {
    const { schemaSetEditorState } = props;
    const schemaSet = schemaSetEditorState.schemaSet;
    const applicationStore = schemaSetEditorState.editorStore.applicationStore;
    const importSchemaContentState =
      schemaSetEditorState.importSchemaContentState;
    const currentSchema = schemaSetEditorState.currentSchema;
    const isReadOnly = schemaSetEditorState.isReadOnly;
    const description =
      schemaSetEditorState.schemaSetModelGenerationState.description;
    // TEMPROARY engine api should return `fileformat`.
    const language = getEditorLanguageFromFormat(description.name);
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
      if (currentSchema) {
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
                  title={'Import Schemas'}
                >
                  <UploadIcon />
                </button>
                <button
                  className="schema-set-panel__header__action"
                  onClick={addSchema}
                  disabled={isReadOnly}
                  tabIndex={-1}
                  title={'Add Schema'}
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
                <button
                  className="btn--dark model-loader__header__load-btn"
                  onClick={validateSchema}
                  disabled={!currentSchema}
                  tabIndex={-1}
                  title="Validate Schema"
                >
                  Validate
                </button>
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

const SchemaSetModelGenerationEditor = observer(
  (props: { schemaSetEditorState: SchemaSetEditorState }) => {
    const { schemaSetEditorState } = props;
    const applicationStore = schemaSetEditorState.editorStore.applicationStore;
    const schemaSet = schemaSetEditorState.schemaSet;
    const modelGenerationState =
      schemaSetEditorState.schemaSetModelGenerationState;
    const description = modelGenerationState.description;
    const properties = description.modelGenerationProperties;
    const isReadOnly = schemaSetEditorState.isReadOnly;
    const debouncedRegenerate = useMemo(
      () =>
        debounce(() => flowResult(modelGenerationState.generateModel()), 500),
      [modelGenerationState],
    );
    const update = (
      generationProperty: GenerationProperty,
      newValue: object,
    ): void => {
      debouncedRegenerate.cancel();
      modelGenerationState.updateGenerationParameters(
        generationProperty,
        newValue,
      );
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };
    const regenerate = (): void => {
      modelGenerationState.generateModel();
    };
    const getConfigValue = (name: string): unknown | undefined =>
      modelGenerationState.getConfigValue(name);

    const importGeneratedElements = (): void => {
      modelGenerationState.importGrammar();
    };
    return (
      <div className="panel__content file-generation-editor__content">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel size={250} minSize={50}>
            <div className="panel file-generation-editor__configuration">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">{`${schemaSet.format} configuration`}</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action file-generation-editor__configuration__reset-btn"
                    tabIndex={-1}
                    disabled={isReadOnly || !properties.length}
                    onClick={regenerate}
                    title={'Reset to default configuration'}
                  >
                    <RefreshIcon />
                  </button>
                </div>
              </div>
              <div className="panel__content">
                <div className="file-generation-editor__configuration__content">
                  {modelGenerationState.modelGenerationProperties.map(
                    (abstractGenerationProperty) => (
                      <GenerationPropertyEditor
                        key={abstractGenerationProperty.name}
                        update={update}
                        isReadOnly={isReadOnly}
                        getConfigValue={getConfigValue}
                        property={abstractGenerationProperty}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel>
            <div className="panel generation-result-viewer__file">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">result</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className={clsx(
                      'panel__header__action  generation-result-viewer__regenerate-btn',
                      {
                        ' generation-result-viewer__regenerate-btn--loading':
                          modelGenerationState.isGenerating,
                      },
                    )}
                    tabIndex={-1}
                    disabled={modelGenerationState.isGenerating}
                    onClick={regenerate}
                    title={'Re-generate'}
                  >
                    <RefreshIcon />
                  </button>
                  <button
                    className="btn--dark model-loader__header__load-btn"
                    onClick={importGeneratedElements}
                    disabled={modelGenerationState.generationValue === ''}
                    tabIndex={-1}
                    title="Import generated elements"
                  >
                    Import
                  </button>
                </div>
              </div>
              <div className="panel__content">
                <PanelLoadingIndicator
                  isLoading={modelGenerationState.isGenerating}
                />
                <StudioTextInputEditor
                  inputValue={modelGenerationState.generationValue}
                  isReadOnly={true}
                  language={EDITOR_LANGUAGE.PURE}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

export const SchemaSetEditor = observer(() => {
  const editorStore = useEditorStore();
  const schemaSetEditorState =
    editorStore.getCurrentEditorState(SchemaSetEditorState);
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
    if (currentTab === SCHEMA_SET_TAB_TYPE.GENERAL) {
      return (
        <SchemaSetGeneralEditor schemaSetEditorState={schemaSetEditorState} />
      );
    }
    const supportsModelGeneraiton =
      schemaSetEditorState.schemaSetModelGenerationState.description
        .supportsModelGeneration;
    return supportsModelGeneraiton ? (
      <SchemaSetModelGenerationEditor
        schemaSetEditorState={schemaSetEditorState}
      />
    ) : (
      <BlankPanelContent>
        Format {schemaSet.format} does not support Model Generation
      </BlankPanelContent>
    );
  };
  return (
    <div className="panel schema-set-panel">
      <div className="schema-set-panel__header">
        <div className="schema-set-panel__header__title">
          {isReadOnly && (
            <div className="schema-set-panel__header__lock">
              <LockIcon />
            </div>
          )}
          <div className="schema-set-panel__header__title__label">
            Schema Set
          </div>
          <div className="schema-set-panel__header__title__content">
            {schemaSet.name}
          </div>
        </div>
      </div>
      <div className="panel__content">
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
          {currentTab === SCHEMA_SET_TAB_TYPE.GENERAL && (
            <SchemaSetGeneralEditor
              schemaSetEditorState={schemaSetEditorState}
            />
          )}

          {currentTab === SCHEMA_SET_TAB_TYPE.MODEL_GENERATION &&
            renderMainEditPanel()}
        </div>
      </div>
    </div>
  );
});
