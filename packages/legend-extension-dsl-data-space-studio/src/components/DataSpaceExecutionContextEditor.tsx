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
  CORE_DND_TYPE,
  type ElementDragSource,
  useEditorStore,
  type UMLEditorElementDropTarget,
} from '@finos/legend-application-studio';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  BlankPanelPlaceholder,
  clsx,
  CustomSelectorInput,
  Dialog,
  LongArrowRightIcon,
  ModalTitle,
  PanelContent,
  PanelDivider,
  PanelDropZone,
  PanelFormSection,
  PanelFormTextField,
  PanelFormValidatedTextField,
  PanelHeader,
  PlusIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  TimesIcon,
  WarningIcon,
} from '@finos/legend-art';
import {
  DataProduct,
  LakehouseRuntime,
  Mapping,
  ModelAccessPointGroup,
  PackageableElementExplicitReference,
  PackageableRuntime,
} from '@finos/legend-graph';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import {
  DataSpaceExecutionContext,
  DataSpaceMappingProvider,
  type DataSpaceExecutionContext as DataSpaceExecutionContextType,
} from '@finos/legend-extension-dsl-data-space/graph';
import { useCallback, useState } from 'react';
import { useDrop } from 'react-dnd';
import type { DataSpaceExecutionContextState } from '../stores/DataSpaceExecutionContextState.js';
import {
  dataSpace_setDefaultExecutionContext,
  dataSpace_setExecutionContextDefaultRuntime,
  dataSpace_setExecutionContextDescription,
  dataSpace_setExecutionContextMapping,
  dataSpace_setExecutionContextMappingProvider,
  dataSpace_setExecutionContextName,
  dataSpace_setExecutionContextTitle,
  dataSpace_setMappingProviderKeys,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  collectExecutionContextValidationIssues,
  hasExecutionContextValidationError,
  hasNoMappingSource,
  InlineIssue,
} from './DataSpaceGeneralEditor/DataSpaceValidation.js';

type MappingSourceKind = 'mapping' | 'mappingProvider';

const getDataProductsWithModelAccessPointGroups = (
  editorStore: ReturnType<typeof useEditorStore>,
): DataProduct[] =>
  editorStore.graphManagerState.graph.dataProducts.filter((dataProduct) =>
    dataProduct.accessPointGroups.some(
      (group) => group instanceof ModelAccessPointGroup,
    ),
  );

const getModelAccessPointGroupIds = (dataProduct: DataProduct): string[] =>
  dataProduct.accessPointGroups
    .filter((group) => group instanceof ModelAccessPointGroup)
    .map((group) => group.id);

const getMappingSourceKind = (
  executionContext: DataSpaceExecutionContextType,
): MappingSourceKind | undefined => {
  if (executionContext.mappingProvider) {
    return 'mappingProvider';
  }
  if (executionContext.mapping) {
    return 'mapping';
  }
  return undefined;
};

export const NewExecutionContextModal = observer(
  (props: {
    executionContextState: DataSpaceExecutionContextState;
    isReadOnly: boolean;
  }) => {
    const { executionContextState, isReadOnly } = props;
    const existingNames = executionContextState.executionContexts.map(
      (context) => context.name,
    );
    const [name, setName] = useState('');
    const [isNameValid, setIsNameValid] = useState(false);

    const validateName = (val: string): string | undefined => {
      if (!val) {
        return `Execution context name can't be empty`;
      }
      if (existingNames.includes(val)) {
        return `Execution context '${val}' already exists`;
      }
      return undefined;
    };

    const closeModal = (): void =>
      executionContextState.setNewExecutionContextModal(false);

    const create = (): void => {
      if (isReadOnly || !isNameValid) {
        return;
      }
      const context = new DataSpaceExecutionContext();
      context.name = name;
      executionContextState.addExecutionContext(context);
      closeModal();
    };

    return (
      <Dialog
        open={executionContextState.newExecutionContextModal}
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
          <ModalTitle title="New Execution Context" />
          <PanelFormValidatedTextField
            name="Name"
            value={name}
            update={(value): void => setName(value ?? '')}
            validate={validateName}
            onValidate={(issue): void => setIsNameValid(!issue)}
            isReadOnly={isReadOnly}
            placeholder="Enter a unique name"
            fullWidth={true}
          />
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
                disabled={isReadOnly || !isNameValid}
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

const MappingSourceEditor = observer(
  (props: {
    executionContextState: DataSpaceExecutionContextState;
    executionContext: DataSpaceExecutionContextType;
    isReadOnly: boolean;
    sourceKind: MappingSourceKind;
    setSourceKind: (val: MappingSourceKind) => void;
  }) => {
    const {
      executionContextState,
      executionContext,
      isReadOnly,
      sourceKind,
      setSourceKind,
    } = props;
    const editorStore = executionContextState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    const mapping = executionContext.mapping?.value;
    const mappingOptions =
      editorStore.graphManagerState.usableMappings.map(buildElementOption);
    const onMappingChange = (
      option: PackageableElementOption<Mapping> | null,
    ): void =>
      dataSpace_setExecutionContextMapping(
        executionContext,
        option
          ? PackageableElementExplicitReference.create(option.value)
          : undefined,
      );

    const mappingProvider = executionContext.mappingProvider;
    const providerElement = mappingProvider?.element.value;
    const providerDataProduct =
      providerElement instanceof DataProduct ? providerElement : undefined;
    const dataProductOptions =
      getDataProductsWithModelAccessPointGroups(editorStore).map(
        buildElementOption,
      );
    const onDataProductChange = (
      option: PackageableElementOption<DataProduct> | null,
    ): void => {
      if (!option) {
        dataSpace_setExecutionContextMappingProvider(
          executionContext,
          undefined,
        );
        return;
      }
      const provider = new DataSpaceMappingProvider();
      provider.element = PackageableElementExplicitReference.create(
        option.value,
      );
      const groupIds = getModelAccessPointGroupIds(option.value);
      provider.keys = groupIds.length === 1 && groupIds[0] ? [groupIds[0]] : [];
      dataSpace_setExecutionContextMappingProvider(executionContext, provider);
    };

    const accessPointGroupIds = providerDataProduct
      ? getModelAccessPointGroupIds(providerDataProduct)
      : [];
    const accessPointGroupOptions = accessPointGroupIds.map((id) => ({
      label: id,
      value: id,
    }));
    const accessPointGroupId = mappingProvider?.keys[0];
    const onAccessPointGroupChange = (
      option: { value: string } | null,
    ): void => {
      if (mappingProvider) {
        dataSpace_setMappingProviderKeys(
          mappingProvider,
          option ? [option.value] : [],
        );
      }
    };

    const handleMappingDrop = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (!isReadOnly && element instanceof Mapping) {
          dataSpace_setExecutionContextMapping(
            executionContext,
            PackageableElementExplicitReference.create(element),
          );
          setSourceKind('mapping');
        }
      },
      [isReadOnly, executionContext, setSourceKind],
    );
    const [{ isMappingDragOver }, mappingDropConnector] = useDrop<
      ElementDragSource,
      void,
      { isMappingDragOver: boolean }
    >(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_MAPPING],
        drop: (item) => handleMappingDrop(item),
        collect: (monitor) => ({
          isMappingDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleMappingDrop],
    );

    const providerElementIssue =
      providerElement && !providerDataProduct
        ? `'${providerElement.path}' is not a data product.`
        : undefined;
    const providerKeyIssue =
      providerDataProduct &&
      accessPointGroupId &&
      !accessPointGroupIds.includes(accessPointGroupId)
        ? `Access point group '${accessPointGroupId}' is not defined on '${providerDataProduct.path}'.`
        : undefined;

    return (
      <div className="dataSpace-editor__configuration__section">
        <div className="dataSpace-editor__configuration__section__header">
          <div className="dataSpace-editor__configuration__section__title">
            Mapping Source
          </div>
          <div className="dataSpace-editor__configuration__section__hint">
            Where this context gets its model from. Choose a mapping directly,
            or indirectly via a mapping provider.
          </div>
          {hasNoMappingSource(executionContext) && (
            <InlineIssue
              issue={{
                severity: 'error',
                message: 'Specify either a mapping or a mapping provider.',
              }}
            />
          )}
        </div>
        <div className="dataSpace-editor__tab-toggle">
          <button
            type="button"
            className={clsx('dataSpace-editor__tab-toggle__tab', {
              'dataSpace-editor__tab-toggle__tab--active':
                sourceKind === 'mapping',
            })}
            disabled={isReadOnly}
            onClick={(): void => setSourceKind('mapping')}
          >
            Mapping
          </button>
          <button
            type="button"
            className={clsx('dataSpace-editor__tab-toggle__tab', {
              'dataSpace-editor__tab-toggle__tab--active':
                sourceKind === 'mappingProvider',
            })}
            disabled={isReadOnly}
            onClick={(): void => setSourceKind('mappingProvider')}
          >
            Mapping Provider
          </button>
        </div>
        <div className="dataSpace-editor__configuration__section__body">
          {sourceKind === 'mapping' && (
            <PanelDropZone
              dropTargetConnector={mappingDropConnector}
              isDragOver={isMappingDragOver && !isReadOnly}
            >
              <div className="dataSpace-editor__configuration__row">
                <div className="dataSpace-editor__configuration__row__icon">
                  <PURE_MappingIcon />
                </div>
                <CustomSelectorInput
                  className="dataSpace-editor__configuration__row__select"
                  disabled={isReadOnly}
                  options={mappingOptions}
                  onChange={onMappingChange}
                  value={mapping ? buildElementOption(mapping) : null}
                  placeholder="Select a mapping..."
                  isClearable={true}
                  darkMode={darkMode}
                  hasError={!mapping}
                />
                <button
                  className="btn--dark btn--sm dataSpace-editor__configuration__row__btn"
                  onClick={(): void => {
                    if (mapping) {
                      editorStore.graphEditorMode.openElement(mapping);
                    }
                  }}
                  disabled={!mapping}
                  title="See mapping"
                  tabIndex={-1}
                >
                  <LongArrowRightIcon />
                </button>
              </div>
            </PanelDropZone>
          )}
          {sourceKind === 'mappingProvider' && (
            <div className="dataSpace-editor__mapping-provider">
              <div className="dataSpace-editor__configuration__row">
                <CustomSelectorInput
                  className="dataSpace-editor__configuration__row__select"
                  disabled={isReadOnly}
                  options={dataProductOptions}
                  onChange={onDataProductChange}
                  value={
                    providerDataProduct
                      ? buildElementOption(providerDataProduct)
                      : null
                  }
                  placeholder="Select a mapping provider..."
                  isClearable={true}
                  darkMode={darkMode}
                  hasError={!providerDataProduct}
                />
                <button
                  className="btn--dark btn--sm dataSpace-editor__configuration__row__btn"
                  onClick={(): void => {
                    if (providerDataProduct) {
                      editorStore.graphEditorMode.openElement(
                        providerDataProduct,
                      );
                    }
                  }}
                  disabled={!providerDataProduct}
                  title="See data product"
                  tabIndex={-1}
                >
                  <LongArrowRightIcon />
                </button>
              </div>
              {providerDataProduct && (
                <div className="dataSpace-editor__configuration__field">
                  <div className="dataSpace-editor__configuration__field__label">
                    Model Access Point Group
                  </div>
                  <CustomSelectorInput
                    disabled={isReadOnly}
                    options={accessPointGroupOptions}
                    onChange={onAccessPointGroupChange}
                    value={
                      accessPointGroupId
                        ? {
                            label: accessPointGroupId,
                            value: accessPointGroupId,
                          }
                        : null
                    }
                    placeholder="Select a model access point group..."
                    darkMode={darkMode}
                    hasError={!accessPointGroupId}
                  />
                </div>
              )}
              {providerElementIssue && (
                <InlineIssue
                  issue={{ severity: 'error', message: providerElementIssue }}
                />
              )}
              {providerKeyIssue && (
                <InlineIssue
                  issue={{ severity: 'error', message: providerKeyIssue }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

const DefaultRuntimeEditor = observer(
  (props: {
    executionContextState: DataSpaceExecutionContextState;
    executionContext: DataSpaceExecutionContextType;
    isReadOnly: boolean;
  }) => {
    const { executionContextState, executionContext, isReadOnly } = props;
    const editorStore = executionContextState.editorStore;
    const applicationStore = editorStore.applicationStore;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    const mapping = executionContext.mapping?.value;
    const defaultRuntime = executionContext.defaultRuntime?.value;
    const compatibleRuntimes =
      editorStore.graphManagerState.graph.runtimes.filter(
        (runtime) =>
          !mapping ||
          runtime.runtimeValue.mappings.map((m) => m.value).includes(mapping),
      );
    const runtimeOptions = (
      compatibleRuntimes.length
        ? compatibleRuntimes
        : editorStore.graphManagerState.graph.runtimes
    ).map(buildElementOption);

    const runtimeWarning =
      defaultRuntime &&
      mapping &&
      !(defaultRuntime.runtimeValue instanceof LakehouseRuntime) &&
      !compatibleRuntimes.includes(defaultRuntime)
        ? `Runtime is not associated with mapping '${mapping.path}'.`
        : undefined;

    const onRuntimeChange = (
      option: PackageableElementOption<PackageableRuntime> | null,
    ): void =>
      dataSpace_setExecutionContextDefaultRuntime(
        executionContext,
        option
          ? PackageableElementExplicitReference.create(option.value)
          : undefined,
      );

    const handleRuntimeDrop = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        const element = item.data.packageableElement;
        if (!isReadOnly && element instanceof PackageableRuntime) {
          dataSpace_setExecutionContextDefaultRuntime(
            executionContext,
            PackageableElementExplicitReference.create(element),
          );
        }
      },
      [isReadOnly, executionContext],
    );
    const [{ isRuntimeDragOver }, runtimeDropConnector] = useDrop<
      ElementDragSource,
      void,
      { isRuntimeDragOver: boolean }
    >(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_RUNTIME],
        drop: (item) => handleRuntimeDrop(item),
        collect: (monitor) => ({
          isRuntimeDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleRuntimeDrop],
    );

    return (
      <div className="dataSpace-editor__configuration__section">
        <div className="dataSpace-editor__configuration__section__header">
          <div className="dataSpace-editor__configuration__section__title">
            Default Runtime
          </div>
        </div>
        <div className="dataSpace-editor__configuration__section__body">
          <PanelDropZone
            dropTargetConnector={runtimeDropConnector}
            isDragOver={isRuntimeDragOver && !isReadOnly}
          >
            <div className="dataSpace-editor__configuration__row">
              <div className="dataSpace-editor__configuration__row__icon">
                <PURE_RuntimeIcon />
              </div>
              <CustomSelectorInput
                className="dataSpace-editor__configuration__row__select"
                disabled={isReadOnly}
                options={runtimeOptions}
                onChange={onRuntimeChange}
                value={
                  defaultRuntime ? buildElementOption(defaultRuntime) : null
                }
                placeholder="Select a default runtime (optional)..."
                isClearable={true}
                darkMode={darkMode}
              />
              <button
                className="btn--dark btn--sm dataSpace-editor__configuration__row__btn"
                onClick={(): void => {
                  if (defaultRuntime) {
                    editorStore.graphEditorMode.openElement(defaultRuntime);
                  }
                }}
                disabled={!defaultRuntime}
                title="See runtime"
                tabIndex={-1}
              >
                <LongArrowRightIcon />
              </button>
            </div>
          </PanelDropZone>
          {runtimeWarning && (
            <InlineIssue
              issue={{ severity: 'warning', message: runtimeWarning }}
            />
          )}
        </div>
      </div>
    );
  },
);

const ExecutionContextConfigurationEditor = observer(
  (props: {
    executionContextState: DataSpaceExecutionContextState;
    executionContext: DataSpaceExecutionContextType;
    isReadOnly: boolean;
  }) => {
    const { executionContextState, executionContext, isReadOnly } = props;
    const dataSpace = executionContextState.dataSpace;

    const [sourceKindOverride, setSourceKindOverride] = useState<
      MappingSourceKind | undefined
    >(undefined);
    const [trackedContext, setTrackedContext] = useState(executionContext);
    if (trackedContext !== executionContext) {
      setTrackedContext(executionContext);
      setSourceKindOverride(undefined);
    }
    const sourceKind =
      getMappingSourceKind(executionContext) ?? sourceKindOverride ?? 'mapping';

    const otherNames = executionContextState.executionContexts
      .filter((context) => context !== executionContext)
      .map((context) => context.name);
    const validateName = (val: string): string | undefined => {
      if (!val) {
        return `Execution context name can't be empty`;
      }
      if (otherNames.includes(val)) {
        return `Execution context '${val}' already exists`;
      }
      return undefined;
    };

    const isDefault = dataSpace.defaultExecutionContext === executionContext;
    const toggleDefault = (): void =>
      dataSpace_setDefaultExecutionContext(
        dataSpace,
        isDefault ? undefined : executionContext,
      );

    const issues = collectExecutionContextValidationIssues(executionContext);
    const nameError = validateName(executionContext.name);

    return (
      <div className="dataSpace-editor__configuration">
        <PanelFormTextField
          name="Name"
          value={executionContext.name}
          update={(value): void =>
            dataSpace_setExecutionContextName(executionContext, value ?? '')
          }
          isReadOnly={isReadOnly}
          placeholder="Enter a unique name"
          fullWidth={true}
          hasError={Boolean(nameError)}
          errorMessage={nameError}
          errorClassName="dataSpace-editor__field--error"
        />
        <PanelFormTextField
          name="Title"
          value={executionContext.title ?? ''}
          update={(value): void =>
            dataSpace_setExecutionContextTitle(executionContext, value)
          }
          isReadOnly={isReadOnly}
          placeholder="Enter title"
          prompt="Provide a title for this execution context"
          fullWidth={true}
        />
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Description
          </div>
          <div className="panel__content__form__section__header__prompt">
            Provide a description for this execution context.
          </div>
          <textarea
            className="panel__content__form__section__textarea"
            spellCheck={false}
            disabled={isReadOnly}
            value={executionContext.description ?? ''}
            onChange={(event): void =>
              dataSpace_setExecutionContextDescription(
                executionContext,
                event.target.value || undefined,
              )
            }
            rows={3}
            placeholder="Enter description"
          />
        </PanelFormSection>
        <MappingSourceEditor
          executionContextState={executionContextState}
          executionContext={executionContext}
          isReadOnly={isReadOnly}
          sourceKind={sourceKind}
          setSourceKind={setSourceKindOverride}
        />
        <DefaultRuntimeEditor
          executionContextState={executionContextState}
          executionContext={executionContext}
          isReadOnly={isReadOnly}
        />
        <PanelFormSection>
          <button
            className="btn btn--dark"
            onClick={toggleDefault}
            disabled={isReadOnly}
            tabIndex={-1}
          >
            {isDefault
              ? 'Unset as default execution context'
              : 'Set as default execution context'}
          </button>
        </PanelFormSection>
        {issues.length > 0 && (
          <div className="dataSpace-editor__configuration__issues">
            {issues.map((issue) => (
              <InlineIssue key={issue.message} issue={issue} />
            ))}
          </div>
        )}
      </div>
    );
  },
);

const ExecutionContextTab = observer(
  (props: {
    executionContextState: DataSpaceExecutionContextState;
    executionContext: DataSpaceExecutionContextType;
    isReadOnly: boolean;
  }) => {
    const { executionContextState, executionContext, isReadOnly } = props;
    const dataSpace = executionContextState.dataSpace;
    const isActive =
      executionContextState.selectedExecutionContext === executionContext;
    const isDefault = dataSpace.defaultExecutionContext === executionContext;
    const hasError = hasExecutionContextValidationError(executionContext);

    const select = (): void =>
      executionContextState.setSelectedExecutionContext(executionContext);
    const remove = (event: React.MouseEvent): void => {
      event.stopPropagation();
      executionContextState.removeExecutionContext(executionContext);
    };

    return (
      <div
        onClick={select}
        className={clsx('service-editor__tab', 'dataSpace-editor__tab', {
          'service-editor__tab--active': isActive,
        })}
        role="tab"
      >
        <span className="dataSpace-editor__tab__label">
          {executionContext.name}
        </span>
        {isDefault && (
          <span
            className="dataSpace-editor__tab__badge"
            title="Default execution context"
          >
            default
          </span>
        )}
        {hasError && (
          <WarningIcon
            className="dataSpace-editor__tab__error-icon"
            title="This execution context is incomplete"
          />
        )}
        {!isReadOnly && (
          <button
            className="dataSpace-editor__tab__close-btn"
            onClick={remove}
            tabIndex={-1}
            title="Delete execution context"
          >
            <TimesIcon />
          </button>
        )}
      </div>
    );
  },
);

export const DataSpaceExecutionContextEditor = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const executionContextState = dataSpaceState.executionContextState;
  const isReadOnly = dataSpaceState.isReadOnly;
  const executionContexts = executionContextState.executionContexts;

  const addExecutionContext = (): void =>
    executionContextState.setNewExecutionContextModal(true);

  return (
    <div className="panel dataSpace-editor__tab-panel">
      <PanelHeader>
        <div className="uml-element-editor__tabs">
          {executionContexts.map((executionContext) => (
            <ExecutionContextTab
              key={executionContext.name}
              executionContextState={executionContextState}
              executionContext={executionContext}
              isReadOnly={isReadOnly}
            />
          ))}
          <button
            className="panel__header__action"
            disabled={isReadOnly}
            onClick={addExecutionContext}
            title="Add an execution context"
            tabIndex={-1}
          >
            <PlusIcon />
          </button>
        </div>
      </PanelHeader>
      <PanelContent>
        {executionContextState.selectedExecutionContext ? (
          <ExecutionContextConfigurationEditor
            executionContextState={executionContextState}
            executionContext={executionContextState.selectedExecutionContext}
            isReadOnly={isReadOnly}
          />
        ) : (
          <BlankPanelPlaceholder
            text="Add an execution context"
            onClick={addExecutionContext}
            clickActionType="add"
            tooltipText="Click to add an execution context"
            disabled={isReadOnly}
          />
        )}
      </PanelContent>
      {executionContextState.newExecutionContextModal && (
        <NewExecutionContextModal
          executionContextState={executionContextState}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
});
