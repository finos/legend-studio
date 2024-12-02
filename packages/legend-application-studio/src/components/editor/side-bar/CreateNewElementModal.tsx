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

import { useRef } from 'react';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { observer } from 'mobx-react-lite';
import {
  NewPackageableRuntimeDriver,
  NewPackageableConnectionDriver,
  NewPureModelConnectionDriver,
  NewFileGenerationDriver,
  resolvePackageAndElementName,
  NewDataElementDriver,
  NewServiceDriver,
  CONNECTION_TYPE,
  type RuntimeOption,
} from '../../../stores/editor/NewElementState.js';
import { Dialog, compareLabelFn, CustomSelectorInput } from '@finos/legend-art';
import type { EditorStore } from '../../../stores/editor/EditorStore.js';
import {
  guaranteeNonNullable,
  prettyCONSTName,
  toTitleCase,
} from '@finos/legend-shared';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../../../stores/LegendStudioApplicationPlugin.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  type Mapping,
  type Store,
  type Class,
  ELEMENT_PATH_DELIMITER,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import type { EmbeddedDataTypeOption } from '../../../stores/editor/editor-state/element-editor-state/data/DataEditorState.js';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../../stores/extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../../stores/editor/utils/ModelClassifierUtils.js';
import { EmbeddedDataType } from '../../../stores/editor/editor-state/ExternalFormatState.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import type { GenerationTypeOption } from '../../../stores/editor/editor-state/GraphGenerationState.js';

export const getElementTypeLabel = (
  editorStore: EditorStore,
  type: string | undefined,
): string | undefined => {
  switch (type) {
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE:
    case PACKAGEABLE_ELEMENT_TYPE.CLASS:
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION:
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION:
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE:
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE:
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION:
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING:
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION:
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
    case PACKAGEABLE_ELEMENT_TYPE.SERVICE:
      return type.toLowerCase();
    case PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE:
      return 'flat-data store';
    case PACKAGEABLE_ELEMENT_TYPE.DATABASE:
      return 'relational database';
    case PACKAGEABLE_ELEMENT_TYPE.SERVICE_STORE:
      return 'service store';
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
      return 'file generation';
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
      return 'generation specification';
    case PACKAGEABLE_ELEMENT_TYPE.DATA:
      return 'data';
    case PACKAGEABLE_ELEMENT_TYPE.TEMPORARY__LOCAL_CONNECTION:
      return 'local connection';
    default: {
      if (type) {
        const extraElementTypeLabelGetters = editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_LegendStudioApplicationPlugin_Extension
              ).getExtraElementTypeLabelGetters?.() ?? [],
          );
        for (const typeLabelGetter of extraElementTypeLabelGetters) {
          const label = typeLabelGetter(type);
          if (label) {
            return label;
          }
        }
        return type.toLowerCase();
      }
      return undefined;
    }
  }
};

interface ElementTypeSelectOption {
  label: string;
  value: string;
}

const buildElementTypeOption = (type: string): ElementTypeSelectOption => ({
  label: type,
  value: type,
});

const NewDataElementDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const newDataELementDriver =
    editorStore.newElementState.getNewElementDriver(NewDataElementDriver);
  const selectedOption = newDataELementDriver.embeddedDataOption
    ? {
        label: prettyCONSTName(newDataELementDriver.embeddedDataOption.label),
        value: newDataELementDriver.embeddedDataOption.value,
      }
    : undefined;
  const extraOptionTypes = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
        ).getExtraEmbeddedDataTypeOptions?.() ?? [],
    );
  let options: EmbeddedDataTypeOption[] = Object.values(EmbeddedDataType)
    .filter((type) => type !== EmbeddedDataType.DATA_ELEMENT)
    .map((typeOption) => ({
      label: prettyCONSTName(typeOption),
      value: typeOption,
    }));
  options = options.concat(extraOptionTypes);
  const onTypeSelectionChange = (val: EmbeddedDataTypeOption | null): void => {
    if (!val) {
      newDataELementDriver.setEmbeddedDataOption(undefined);
    } else {
      newDataELementDriver.setEmbeddedDataOption(val);
    }
  };
  return (
    <div className="explorer__new-element-modal__driver">
      <CustomSelectorInput
        className="explorer__new-element-modal__driver__dropdown"
        options={options}
        onChange={onTypeSelectionChange}
        value={selectedOption}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
      />
    </div>
  );
});

const NewRuntimeDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const newRuntimeDriver = editorStore.newElementState.getNewElementDriver(
    NewPackageableRuntimeDriver,
  );
  // mapping
  const mapping = newRuntimeDriver.mapping;
  const mappingOptions =
    editorStore.graphManagerState.usableMappings.map(buildElementOption);
  const selectedMappingOption = mapping
    ? { label: mapping.path, value: mapping }
    : null;
  const onMappingSelectionChange = (
    val: PackageableElementOption<Mapping>,
  ): void => {
    if (val.value !== mapping) {
      newRuntimeDriver.setMapping(val.value);
    }
  };

  if (!mapping) {
    // TODO: show warning
    return <div>no mapping found</div>;
  }
  return (
    <div className="explorer__new-element-modal__driver">
      <CustomSelectorInput
        className="explorer__new-element-modal__driver__dropdown"
        options={mappingOptions}
        onChange={onMappingSelectionChange}
        value={selectedMappingOption}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
      />
    </div>
  );
});

const NewPureModelConnectionDriverEditor = observer(
  (props: { newConnectionValueDriver: NewPureModelConnectionDriver }) => {
    const { newConnectionValueDriver } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    // class
    const _class = newConnectionValueDriver.class;
    const classOptions = editorStore.graphManagerState.usableClasses
      .map(buildElementOption)
      .toSorted(compareLabelFn);
    const selectedClassOption = _class
      ? { label: _class.path, value: _class }
      : null;
    const onClassSelectionChange = (
      val: { label: string; value: Class } | null,
    ): void => {
      if (val) {
        newConnectionValueDriver.setClass(val.value);
      }
    };

    if (!_class) {
      // TODO: show warning
      return <div>no class found</div>;
    }
    return (
      <>
        <div className="panel__content__form__section__header__label">
          Source Class
        </div>
        <div className="explorer__new-element-modal__driver">
          <CustomSelectorInput
            className="sub-panel__content__form__section__dropdown"
            options={classOptions}
            onChange={onClassSelectionChange}
            value={selectedClassOption}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            formatOptionLabel={getPackageableElementOptionFormatter({
              darkMode:
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled,
            })}
          />
        </div>
      </>
    );
  },
);

const NewConnectionValueDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(
    NewPackageableConnectionDriver,
  );
  const newConnectionValueDriver = newConnectionDriver.newConnectionValueDriver;
  if (newConnectionValueDriver instanceof NewPureModelConnectionDriver) {
    return (
      <NewPureModelConnectionDriverEditor
        newConnectionValueDriver={newConnectionValueDriver}
      />
    );
  }
  return null;
});

const NewConnectionDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(
    NewPackageableConnectionDriver,
  );
  // type
  const currentConnectionType = newConnectionDriver.geDriverConnectionType();
  const currentConnectionTypeOption = {
    label: prettyCONSTName(currentConnectionType),
    value: currentConnectionType,
  };
  const extraOptionTypes = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
        ).getExtraConnectionTypeOptions?.() ?? [],
    );
  const connectionOptions = Object.values(CONNECTION_TYPE)
    .map((typeOption) => ({
      label: prettyCONSTName(typeOption),
      value: typeOption.toString(),
    }))
    .concat(extraOptionTypes);
  const onConnectionChange = (
    val: { label: string; value: string } | null,
  ): void => {
    if (val?.value && currentConnectionTypeOption.value !== val.value) {
      newConnectionDriver.changeConnectionState(val.value);
    }
  };

  // store
  const store = newConnectionDriver.store;
  let storeOptions: { label: string; value: Store | undefined }[] = [
    { label: 'ModelStore', value: undefined },
  ];
  // TODO: we should think more about this and filter the store by the connection type
  // or think about a way to completely revamp this workflow, maybe to let people select
  // the store first and then the type of the connection
  // See
  storeOptions = storeOptions.concat(
    editorStore.graphManagerState.usableStores
      .map(buildElementOption)
      .toSorted(compareLabelFn),
  );
  const selectedStoreOption = {
    label: store.path,
    value: store,
  };
  const onStoreSelectionChange = (val: {
    label: string;
    value: Store | undefined;
  }): void => {
    if (val.value) {
      newConnectionDriver.setStore(val.value);
    }
  };

  return (
    <>
      <div className="panel__content__form__section__header__label">
        Connection Type
      </div>
      <div className="explorer__new-element-modal__driver">
        <CustomSelectorInput
          className="explorer__new-element-modal__driver__dropdown"
          options={connectionOptions}
          onChange={onConnectionChange}
          value={currentConnectionTypeOption}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
      <div className="panel__content__form__section__header__label">
        Source Store
      </div>
      <div className="explorer__new-element-modal__driver">
        <CustomSelectorInput
          className="explorer__new-element-modal__driver__dropdown"
          options={storeOptions}
          onChange={onStoreSelectionChange}
          value={selectedStoreOption}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
      <NewConnectionValueDriverEditor />
    </>
  );
});

const NewServiceDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const runtimeSelectorPlaceholder = 'Choose a compatible runtime...';
  const newServiceDriver =
    editorStore.newElementState.getNewElementDriver(NewServiceDriver);
  // runtime
  const onRuntimeChange = (val: RuntimeOption | null): void => {
    if (val) {
      newServiceDriver.setRuntimeOption(val);
    }
  };
  // mapping
  const mappingOptions =
    editorStore.graphManagerState.usableMappings.map(buildElementOption);
  const onMappingChange = (
    val: PackageableElementOption<Mapping> | null,
  ): void => {
    if (!val) {
      newServiceDriver.setMappingOption(undefined);
    } else {
      newServiceDriver.setMappingOption(val);
    }
    //reset runtime
    newServiceDriver.setRuntimeOption(
      guaranteeNonNullable(newServiceDriver.runtimeOptions[0]),
    );
  };

  return (
    <>
      <div className="panel__content__form__section__header__label">
        Mapping
      </div>
      <div className="explorer__new-element-modal__driver">
        <CustomSelectorInput
          className="explorer__new-element-modal__driver__dropdown"
          options={mappingOptions}
          onChange={onMappingChange}
          value={newServiceDriver.mappingOption}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        />
      </div>
      <div className="panel__content__form__section__header__label">
        Runtime
      </div>
      <div className="explorer__new-element-modal__driver">
        <CustomSelectorInput
          className="explorer__new-element-modal__driver__dropdown"
          options={newServiceDriver.runtimeOptions}
          onChange={onRuntimeChange}
          value={newServiceDriver.runtimeOption}
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          placeholder={runtimeSelectorPlaceholder}
        />
      </div>
    </>
  );
});

const NewFileGenerationDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(
    NewFileGenerationDriver,
  );
  const options =
    editorStore.graphState.graphGenerationState.globalFileGenerationState
      .fileGenerationConfigurationOptions;
  const onTypeSelectionChange = (val: GenerationTypeOption | null): void => {
    if (!val) {
      newConnectionDriver.setTypeOption(undefined);
    } else {
      newConnectionDriver.setTypeOption(val);
    }
  };
  return (
    <div className="explorer__new-element-modal__driver">
      <CustomSelectorInput
        className="sub-panel__content__form__section__dropdown explorer__new-element-modal__driver__dropdown"
        options={options}
        onChange={onTypeSelectionChange}
        value={newConnectionDriver.typeOption}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
      />
    </div>
  );
});

const renderNewElementDriver = (
  type: string,
  editorStore: EditorStore,
): React.ReactNode => {
  switch (type) {
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
      return <NewRuntimeDriverEditor />;
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION:
      return <NewConnectionDriverEditor />;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
      return <NewFileGenerationDriverEditor />;
    case PACKAGEABLE_ELEMENT_TYPE.DATA:
      return <NewDataElementDriverEditor />;
    case PACKAGEABLE_ELEMENT_TYPE.SERVICE:
      return <NewServiceDriverEditor />;
    default: {
      const extraNewElementDriverEditorCreators = editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_LegendStudioApplicationPlugin_Extension
            ).getExtraNewElementDriverEditorRenderers?.() ?? [],
        );
      for (const creator of extraNewElementDriverEditorCreators) {
        const editor = creator(type);
        if (editor) {
          return editor;
        }
      }
      return null;
    }
  }
};

export const CreateNewLocalConnectionModal = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const newElementState = editorStore.newElementState;
  const selectedPackage = newElementState.selectedPackage;
  // Name
  const name = newElementState.name;
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => newElementState.setName(event.target.value);
  const elementNameInputRef = useRef<HTMLInputElement>(null);
  // Type
  const typeOptions = ([PACKAGEABLE_ELEMENT_TYPE.PACKAGE] as string[])
    .concat(editorStore.getSupportedElementTypes())
    .filter(
      // NOTE: we can only create package in root
      (type) =>
        selectedPackage !== editorStore.graphManagerState.graph.root ||
        type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
    )
    .map(buildElementTypeOption);

  const selectedTypeOption = buildElementTypeOption(newElementState.type);
  const handleTypeChange = (val: ElementTypeSelectOption): void =>
    newElementState.setElementType(val.value);
  // Submit button
  const closeModal = (): void => newElementState.closeModal();
  const [packagePath, elementName] = resolvePackageAndElementName(
    selectedPackage,
    selectedPackage === editorStore.graphManagerState.graph.root,
    name,
  );
  const resolvedPackage =
    editorStore.graphManagerState.graph.getNullablePackage(packagePath);
  const needsToOverride = Boolean(
    resolvedPackage?.children.find((child) => child.name === elementName),
  );
  const isDisabled = !name || needsToOverride || !newElementState.isValid;
  const save = applicationStore.guardUnhandledError(() =>
    flowResult(newElementState.save()),
  );
  const handleEnter = (): void => {
    newElementState.setName('');
    elementNameInputRef.current?.focus();
  };

  if (!newElementState.showModal) {
    return null;
  }
  return (
    <Dialog
      open={newElementState.showModal}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <form
        data-testid={LEGEND_STUDIO_TEST_ID.NEW_ELEMENT_MODAL}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="modal modal--dark search-modal"
      >
        <div className="modal__title">
          {`Create a New ${
            getElementTypeLabel(editorStore, newElementState.type) ?? 'element'
          }`}
        </div>
        <div>
          {newElementState.showType && (
            <CustomSelectorInput
              options={typeOptions}
              disabled={typeOptions.length === 1}
              onChange={handleTypeChange}
              value={selectedTypeOption}
              isClearable={false}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          )}
          <input
            className="input--dark explorer__new-element-modal__name-input"
            ref={elementNameInputRef}
            spellCheck={false}
            value={name}
            onChange={handleNameChange}
            placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the ${
              getElementTypeLabel(editorStore, newElementState.type) ??
              'element'
            }`}
          />
          {renderNewElementDriver(newElementState.type, editorStore)}
        </div>
        <div className="search-modal__actions">
          <button type="button" className="btn btn--dark" onClick={closeModal}>
            Cancel
          </button>
          <button className="btn btn--dark" disabled={isDisabled}>
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
});

export const CreateNewElementModal = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const newElementState = editorStore.newElementState;
  const selectedPackage = newElementState.selectedPackage;
  const elementLabel = getElementTypeLabel(editorStore, newElementState.type);
  // Name
  const name = newElementState.name;
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => newElementState.setName(event.target.value);
  const elementNameInputRef = useRef<HTMLInputElement>(null);
  // Type
  const typeOptions = ([PACKAGEABLE_ELEMENT_TYPE.PACKAGE] as string[])
    .concat(editorStore.getSupportedElementTypes())
    .filter(
      // NOTE: we can only create package in root
      (type) =>
        selectedPackage !== editorStore.graphManagerState.graph.root ||
        type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
    )
    .map(buildElementTypeOption);

  const selectedTypeOption = buildElementTypeOption(newElementState.type);
  const handleTypeChange = (val: ElementTypeSelectOption): void =>
    newElementState.setElementType(val.value);
  // Submit button
  const closeModal = (): void => newElementState.closeModal();
  const [packagePath, elementName] = resolvePackageAndElementName(
    selectedPackage,
    selectedPackage === editorStore.graphManagerState.graph.root,
    name,
  );
  const resolvedPackage =
    editorStore.graphManagerState.graph.getNullablePackage(packagePath);
  const needsToOverride = Boolean(
    resolvedPackage?.children.find((child) => child.name === elementName),
  );
  const isDisabled = !name || needsToOverride || !newElementState.isValid;
  const save = applicationStore.guardUnhandledError(() =>
    flowResult(newElementState.save()),
  );
  const handleEnter = (): void => {
    newElementState.setName('');
    elementNameInputRef.current?.focus();
  };

  if (!newElementState.showModal) {
    return null;
  }
  return (
    <Dialog
      open={newElementState.showModal}
      onClose={closeModal}
      TransitionProps={{
        onEnter: handleEnter,
      }}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <form
        data-testid={LEGEND_STUDIO_TEST_ID.NEW_ELEMENT_MODAL}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="modal modal--dark search-modal"
      >
        <div className="modal__title">
          {`Create a new ${
            elementLabel ? toTitleCase(elementLabel) : 'element'
          }`}
        </div>
        <div>
          {newElementState.showType && (
            <CustomSelectorInput
              options={typeOptions}
              disabled={typeOptions.length === 1}
              onChange={handleTypeChange}
              value={selectedTypeOption}
              isClearable={false}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          )}
          <input
            className="input--dark explorer__new-element-modal__name-input"
            ref={elementNameInputRef}
            spellCheck={false}
            value={name}
            onChange={handleNameChange}
            placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the ${
              getElementTypeLabel(editorStore, newElementState.type) ??
              'element'
            }`}
          />
          {renderNewElementDriver(newElementState.type, editorStore)}
        </div>
        <div className="search-modal__actions">
          <button type="button" className="btn btn--dark" onClick={closeModal}>
            Cancel
          </button>
          <button className="btn btn--dark" disabled={isDisabled}>
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
});
