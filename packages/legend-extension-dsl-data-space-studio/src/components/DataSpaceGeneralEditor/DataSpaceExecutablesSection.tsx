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

import {
  DataSpaceExecutableTemplate,
  type DataSpaceExecutable,
  DataSpacePackageableElementExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { flowResult } from 'mobx';
import {
  dataSpace_addExecutable,
  dataSpace_removeExecutable,
  dataSpace_setExecutableDescription,
  dataSpace_setExecutableExecutionContextKey,
  dataSpace_setExecutableTitle,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { useEditorStore } from '@finos/legend-application-studio';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import {
  BlankPanelPlaceholder,
  clsx,
  CustomSelectorInput,
  Dialog,
  LongArrowRightIcon,
  ModalTitle,
  PanelContent,
  PanelDivider,
  PanelFormSection,
  PanelFormTextField,
  PanelFormValidatedTextField,
  PanelHeader,
  PencilEditIcon,
  PlusIcon,
  TimesIcon,
} from '@finos/legend-art';
import {
  type PackageableElement,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import {
  stub_DataSpaceExecutableTemplateQuery,
  type DataSpaceExecutableTemplateLambdaState,
} from '../../stores/DataSpaceExecutableTemplateState.js';
import { editDataSpaceExecutableTemplateInQueryBuilder } from '../DataSpaceExecutableQueryAction.js';

type NewExecutableKind = 'element' | 'inlineQuery';

const NewExecutableModal = observer(
  (props: {
    dataSpaceState: DataSpaceEditorState;
    isOpen: boolean;
    isReadOnly: boolean;
    onClose: () => void;
    onCreated: (executable: DataSpaceExecutable) => void;
  }) => {
    const { dataSpaceState, isOpen, isReadOnly, onClose, onCreated } = props;
    const dataSpace = dataSpaceState.dataSpace;
    const existingIds = (dataSpace.executables ?? [])
      .map((executable) => executable.id)
      .filter((executableId): executableId is string => Boolean(executableId));
    const [kind, setKind] = useState<NewExecutableKind>('element');
    const [selectedElement, setSelectedElement] = useState<
      PackageableElement | undefined
    >(undefined);
    const [title, setTitle] = useState('');
    const [isTitleValid, setIsTitleValid] = useState(false);
    const [id, setId] = useState('');
    const [isIdValid, setIsIdValid] = useState(false);

    const elementOptions = dataSpaceState.getDataSpaceExecutableOptions();

    const closeModal = (): void => {
      setKind('element');
      setSelectedElement(undefined);
      setTitle('');
      setId('');
      onClose();
    };

    const validateTitle = (val: string): string | undefined =>
      val ? undefined : `Title can't be empty`;

    const validateId = (val: string): string | undefined => {
      if (!val) {
        return `Id can't be empty`;
      }
      if (existingIds.includes(val)) {
        return `Id '${val}' already exists`;
      }
      return undefined;
    };

    const canCreate =
      kind === 'element'
        ? Boolean(selectedElement) && isTitleValid
        : isTitleValid && isIdValid;

    const create = (): void => {
      if (isReadOnly || !canCreate) {
        return;
      }
      if (kind === 'element' && selectedElement) {
        const executablePointer = new DataSpacePackageableElementExecutable();
        executablePointer.executable =
          PackageableElementExplicitReference.create(selectedElement);
        executablePointer.title = title;
        dataSpace_addExecutable(dataSpace, executablePointer);
        onCreated(executablePointer);
      } else if (kind === 'inlineQuery') {
        const executableTemplate = new DataSpaceExecutableTemplate();
        executableTemplate.id = id;
        executableTemplate.title = title;
        executableTemplate.query = stub_DataSpaceExecutableTemplateQuery();
        dataSpace_addExecutable(dataSpace, executableTemplate);
        onCreated(executableTemplate);
      }
      closeModal();
    };

    return (
      <Dialog
        open={isOpen}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: { classes: { root: 'search-modal__inner-container' } },
        }}
      >
        <form
          onSubmit={(event): void => {
            event.preventDefault();
            create();
          }}
          className="modal search-modal modal--dark"
        >
          <ModalTitle title="New Executable" />
          <PanelFormSection>
            <div className="dataSpace-editor__tab-toggle">
              <button
                type="button"
                className={clsx('dataSpace-editor__tab-toggle__tab', {
                  'dataSpace-editor__tab-toggle__tab--active':
                    kind === 'element',
                })}
                onClick={(): void => setKind('element')}
              >
                Existing Element
              </button>
              <button
                type="button"
                className={clsx('dataSpace-editor__tab-toggle__tab', {
                  'dataSpace-editor__tab-toggle__tab--active':
                    kind === 'inlineQuery',
                })}
                onClick={(): void => setKind('inlineQuery')}
              >
                Inline Query
              </button>
            </div>
          </PanelFormSection>
          {kind === 'element' && (
            <>
              <PanelFormSection>
                <div className="panel__content__form__section__header__label">
                  Element
                </div>
                <CustomSelectorInput
                  options={elementOptions}
                  onChange={(
                    option: { value: PackageableElement } | null,
                  ): void => {
                    const element = option?.value;
                    setSelectedElement(element);
                    if (element && !title) {
                      setTitle(element.name);
                    }
                  }}
                  value={
                    selectedElement
                      ? {
                          label: selectedElement.path,
                          value: selectedElement,
                        }
                      : null
                  }
                  placeholder="Select a function or service..."
                  darkMode={true}
                />
              </PanelFormSection>
              <PanelFormValidatedTextField
                name="Title"
                value={title}
                update={(value): void => setTitle(value ?? '')}
                validate={validateTitle}
                onValidate={(issue): void => setIsTitleValid(!issue)}
                isReadOnly={isReadOnly}
                placeholder="Enter a title"
                fullWidth={true}
              />
            </>
          )}
          {kind === 'inlineQuery' && (
            <>
              <PanelFormValidatedTextField
                name="Id"
                value={id}
                update={(value): void => setId(value ?? '')}
                validate={validateId}
                onValidate={(issue): void => setIsIdValid(!issue)}
                isReadOnly={isReadOnly}
                placeholder="Enter a unique id"
                fullWidth={true}
              />
              <PanelFormValidatedTextField
                name="Title"
                value={title}
                update={(value): void => setTitle(value ?? '')}
                validate={validateTitle}
                onValidate={(issue): void => setIsTitleValid(!issue)}
                isReadOnly={isReadOnly}
                placeholder="Enter a title"
                fullWidth={true}
              />
            </>
          )}
          <PanelDivider />
          <PanelFormSection>
            <div className="search-modal__actions">
              <button
                type="button"
                className="btn btn--dark"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--dark"
                disabled={isReadOnly || !canCreate}
              >
                Create
              </button>
            </div>
          </PanelFormSection>
        </form>
      </Dialog>
    );
  },
);

const ExecutableTemplateQueryEditor = observer(
  (props: {
    dataSpaceState: DataSpaceEditorState;
    executableTemplate: DataSpaceExecutableTemplate;
    isReadOnly: boolean;
  }) => {
    const { dataSpaceState, executableTemplate, isReadOnly } = props;
    const editorStore = dataSpaceState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const lambdaState: DataSpaceExecutableTemplateLambdaState =
      dataSpaceState.executableTemplateStates.getLambdaState(
        executableTemplate,
      );

    useEffect(() => {
      flowResult(
        lambdaState.convertLambdaObjectToGrammarString({ pretty: true }),
      ).catch(applicationStore.alertUnhandledError);
    }, [lambdaState, applicationStore]);

    const editInQueryBuilder = applicationStore.guardUnhandledError(async () =>
      editDataSpaceExecutableTemplateInQueryBuilder(
        dataSpaceState.dataSpace,
        executableTemplate,
        lambdaState,
        editorStore,
      ),
    );

    return (
      <div className="dataSpace-editor__configuration__section">
        <div className="dataSpace-editor__configuration__section__header">
          <div className="dataSpace-editor__configuration__section__title">
            Query
          </div>
        </div>
        <div className="dataSpace-editor__executable__query">
          <button
            className="dataSpace-editor__executable__query-builder-btn"
            onClick={editInQueryBuilder}
            disabled={isReadOnly}
            title="Edit query with Query Builder"
          >
            <PencilEditIcon />
            <span>Query Builder</span>
          </button>
          <InlineLambdaEditor
            className="dataSpace-editor__executable__lambda-editor"
            disabled={isReadOnly}
            lambdaEditorState={lambdaState}
            forceBackdrop={Boolean(lambdaState.parserError)}
          />
        </div>
      </div>
    );
  },
);

const ExecutableConfigurationEditor = observer(
  (props: {
    dataSpaceState: DataSpaceEditorState;
    executable: DataSpaceExecutable;
    isReadOnly: boolean;
  }) => {
    const { dataSpaceState, executable, isReadOnly } = props;
    const editorStore = dataSpaceState.editorStore;
    const dataSpace = dataSpaceState.dataSpace;
    const executionContextOptions = (dataSpace.executionContexts ?? []).map(
      (context) => ({ label: context.name, value: context.name }),
    );
    const executionContextKeyOption = executable.executionContextKey
      ? {
          label: executable.executionContextKey,
          value: executable.executionContextKey,
        }
      : null;

    return (
      <div className="dataSpace-editor__configuration">
        <PanelFormTextField
          name="Title"
          value={executable.title}
          update={(value): void =>
            dataSpace_setExecutableTitle(executable, value ?? '')
          }
          isReadOnly={isReadOnly}
          placeholder="Enter title"
          prompt="Provide a title for this executable"
          fullWidth={true}
        />
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Description
          </div>
          <div className="panel__content__form__section__header__prompt">
            Provide a description for this executable.
          </div>
          <textarea
            className="panel__content__form__section__textarea"
            spellCheck={false}
            disabled={isReadOnly}
            value={executable.description ?? ''}
            onChange={(event): void =>
              dataSpace_setExecutableDescription(
                executable,
                event.target.value || undefined,
              )
            }
            rows={3}
            placeholder="Enter description"
          />
        </PanelFormSection>
        {executable instanceof DataSpacePackageableElementExecutable && (
          <div className="dataSpace-editor__configuration__section">
            <div className="dataSpace-editor__configuration__section__header">
              <div className="dataSpace-editor__configuration__section__title">
                Element
              </div>
            </div>
            <div className="dataSpace-editor__configuration__row">
              <span className="dataSpace-editor__executable__pointer__path">
                {executable.executable.value.path}
              </span>
              <button
                className="btn--dark btn--sm dataSpace-editor__configuration__row__btn"
                onClick={(): void =>
                  editorStore.graphEditorMode.openElement(
                    executable.executable.value,
                  )
                }
                title="See element"
                tabIndex={-1}
              >
                <LongArrowRightIcon />
              </button>
            </div>
          </div>
        )}
        {Boolean(executionContextOptions.length) && (
          <div className="dataSpace-editor__configuration__section">
            <div className="dataSpace-editor__configuration__section__header">
              <div className="dataSpace-editor__configuration__section__title">
                Execution Context
              </div>
              <div className="dataSpace-editor__configuration__section__hint">
                Optional. Pins this executable to a specific execution. If not
                provided, points to the default execution context if set
              </div>
            </div>
            <CustomSelectorInput
              className="dataSpace-editor__configuration__row__select"
              disabled={isReadOnly}
              options={executionContextOptions}
              onChange={(option: { value: string } | null): void =>
                dataSpace_setExecutableExecutionContextKey(
                  executable,
                  option?.value,
                )
              }
              value={executionContextKeyOption}
              placeholder={
                dataSpace.defaultExecutionContext
                  ? 'Use default execution context'
                  : 'Choose execution context'
              }
              isClearable={true}
              darkMode={true}
            />
          </div>
        )}
        {executable instanceof DataSpaceExecutableTemplate && (
          <ExecutableTemplateQueryEditor
            dataSpaceState={dataSpaceState}
            executableTemplate={executable}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    );
  },
);

const ExecutableTab = observer(
  (props: {
    executable: DataSpaceExecutable;
    isActive: boolean;
    isReadOnly: boolean;
    onSelect: () => void;
    onDelete: () => void;
  }) => {
    const { executable, isActive, isReadOnly, onSelect, onDelete } = props;

    const remove = (event: React.MouseEvent): void => {
      event.stopPropagation();
      onDelete();
    };

    return (
      <div
        onClick={onSelect}
        className={clsx('service-editor__tab', 'dataSpace-editor__tab', {
          'service-editor__tab--active': isActive,
        })}
        role="tab"
      >
        <span className="dataSpace-editor__tab__label">
          {executable.title || '(untitled)'}
        </span>
        {!isReadOnly && (
          <button
            className="dataSpace-editor__tab__close-btn"
            onClick={remove}
            tabIndex={-1}
            title="Delete executable"
          >
            <TimesIcon />
          </button>
        )}
      </div>
    );
  },
);

export const DataspaceExecutablesSection = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;
  const isReadOnly = dataSpaceState.isReadOnly;
  const executables = dataSpace.executables ?? [];
  const [selectedExecutable, setSelectedExecutable] = useState<
    DataSpaceExecutable | undefined
  >(executables[0]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const currentSelection =
    selectedExecutable && executables.includes(selectedExecutable)
      ? selectedExecutable
      : executables[0];

  const handleRemoveExecutable = (executable: DataSpaceExecutable): void => {
    dataSpace_removeExecutable(dataSpace, executable);
    setSelectedExecutable((dataSpace.executables ?? [])[0]);
  };

  const addExecutable = (): void => setIsNewModalOpen(true);

  return (
    <div className="panel dataSpace-editor__tab-panel">
      <PanelHeader>
        <div className="uml-element-editor__tabs">
          {executables.map((executable) => (
            <ExecutableTab
              key={executable.hashCode}
              executable={executable}
              isActive={executable === currentSelection}
              isReadOnly={isReadOnly}
              onSelect={(): void => setSelectedExecutable(executable)}
              onDelete={(): void => handleRemoveExecutable(executable)}
            />
          ))}
          <button
            className="panel__header__action"
            disabled={isReadOnly}
            onClick={addExecutable}
            title="Add an executable"
            tabIndex={-1}
          >
            <PlusIcon />
          </button>
        </div>
      </PanelHeader>
      <PanelContent>
        {currentSelection ? (
          <ExecutableConfigurationEditor
            dataSpaceState={dataSpaceState}
            executable={currentSelection}
            isReadOnly={isReadOnly}
          />
        ) : (
          <BlankPanelPlaceholder
            text="Add an executable"
            onClick={addExecutable}
            clickActionType="add"
            tooltipText="Click to add an executable"
            disabled={isReadOnly}
          />
        )}
      </PanelContent>
      <NewExecutableModal
        dataSpaceState={dataSpaceState}
        isOpen={isNewModalOpen}
        isReadOnly={isReadOnly}
        onClose={(): void => setIsNewModalOpen(false)}
        onCreated={(executable): void => setSelectedExecutable(executable)}
      />
    </div>
  );
});
