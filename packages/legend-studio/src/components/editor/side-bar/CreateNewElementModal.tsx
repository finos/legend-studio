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
import { CORE_TEST_ID } from '../../../const';
import Dialog from '@material-ui/core/Dialog';
import { observer } from 'mobx-react-lite';
import {
  NewPackageableRuntimeDriver,
  NewPackageableConnectionDriver,
  NewPureModelConnectionDriver,
  NewFileGenerationDriver,
  resolvePackageAndElementName,
  CONNECTION_TYPE,
} from '../../../stores/NewElementState';
import { CustomSelectorInput } from '@finos/legend-studio-components';
import { ELEMENT_PATH_DELIMITER } from '../../../models/MetaModelConst';
import type { EditorStore } from '../../../stores/EditorStore';
import { useEditorStore } from '../../../stores/EditorStore';
import { compareLabelFn, prettyCONSTName } from '@finos/legend-studio-shared';
import type { FileGenerationTypeOption } from '../../../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { PackageableElementSelectOption } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { Mapping } from '../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import type { Store } from '../../../models/metamodels/pure/model/packageableElements/store/Store';
import type { Class } from '../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { DSL_EditorPlugin_Extension } from '../../../stores/EditorPlugin';

export const getElementTypeLabel = (
  editorStore: EditorStore,
  type: string | undefined,
): string | undefined => {
  switch (type) {
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE:
    case PACKAGEABLE_ELEMENT_TYPE.CLASS:
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION:
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION:
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE:
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE:
    case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM:
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
    default: {
      if (type) {
        const extraElementTypeLabelGetters =
          editorStore.applicationStore.pluginManager
            .getEditorPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_EditorPlugin_Extension
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

const NewRuntimeDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newRuntimeDriver = editorStore.newElementState.getNewElementDriver(
    NewPackageableRuntimeDriver,
  );
  // mapping
  const mapping = newRuntimeDriver.mapping;
  const mappingOptions = editorStore.mappingOptions;
  const selectedMappingOption = { label: mapping?.path ?? '', value: mapping };
  const onMappingSelectionChange = (
    val: PackageableElementSelectOption<Mapping>,
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
    <div>
      <div className="">
        <CustomSelectorInput
          className="panel__content__form__section__dropdown"
          options={mappingOptions}
          onChange={onMappingSelectionChange}
          value={selectedMappingOption}
          darkMode={true}
        />
      </div>
    </div>
  );
});

const NewPureModelConnectionDriverEditor = observer(
  (props: {
    newConnectionDriver: NewPackageableConnectionDriver;
    newConnectionValueDriver: NewPureModelConnectionDriver;
  }) => {
    const { newConnectionDriver, newConnectionValueDriver } = props;
    const editorStore = useEditorStore();
    // store
    const store = newConnectionDriver.store;
    let storeOptions: { label: string; value?: Store }[] = [
      { label: 'ModelStore', value: undefined },
    ];
    storeOptions = storeOptions.concat(
      editorStore.storeOptions.slice().sort(compareLabelFn),
    );
    const selectedStoreOption = {
      label: store?.path ?? 'ModelStore',
      value: store,
    };
    const onStoreSelectionChange = (val: {
      label: string;
      value?: Store;
    }): void => newConnectionDriver.setStore(val.value);
    // class
    const _class = newConnectionValueDriver.class;
    const classOptions = editorStore.classOptions.slice().sort(compareLabelFn);
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
      <div>
        <div className="">
          <CustomSelectorInput
            className="panel__content__form__section__dropdown"
            options={storeOptions}
            onChange={onStoreSelectionChange}
            value={selectedStoreOption}
            darkMode={true}
          />
        </div>
        <div className="">
          <CustomSelectorInput
            className="panel__content__form__section__dropdown"
            options={classOptions}
            onChange={onClassSelectionChange}
            value={selectedClassOption}
            darkMode={true}
          />
        </div>
      </div>
    );
  },
);

const NewConnectionValueDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(
    NewPackageableConnectionDriver,
  );
  const newConnectionValueDriver = newConnectionDriver.newConnectionValueDriver;
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  if (newConnectionValueDriver instanceof NewPureModelConnectionDriver) {
    return (
      <NewPureModelConnectionDriverEditor
        newConnectionDriver={newConnectionDriver}
        newConnectionValueDriver={newConnectionValueDriver}
      />
    );
  }
  return null;
});

const NewConnectionDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(
    NewPackageableConnectionDriver,
  );
  // type
  const currentConnectionType = newConnectionDriver.geDriverConnectionType();
  const currentConnectionTypeOption = {
    label: prettyCONSTName(currentConnectionType),
    value: currentConnectionType,
  };
  const connectionOptions = Object.values(CONNECTION_TYPE).map((e) => ({
    label: prettyCONSTName(e),
    value: e,
  }));
  const onConnectionChange = (
    val: { label: CONNECTION_TYPE; value: CONNECTION_TYPE } | null,
  ): void => {
    if (val?.value && currentConnectionTypeOption.value !== val.value) {
      newConnectionDriver.changeConnectionState(val.value);
    }
  };
  return (
    <div>
      <div>
        <div>
          <CustomSelectorInput
            className="panel__content__form__section__dropdown"
            options={connectionOptions}
            onChange={onConnectionChange}
            value={currentConnectionTypeOption}
            darkMode={true}
          />
        </div>
      </div>
      <NewConnectionValueDriverEditor />
    </div>
  );
});

const NewFileGenerationDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(
    NewFileGenerationDriver,
  );
  const options =
    editorStore.graphState.graphGenerationState
      .fileGenerationConfigurationOptions;
  const onTypeSelectionChange = (
    val: FileGenerationTypeOption | null,
  ): void => {
    if (!val) {
      newConnectionDriver.setTypeOption(undefined);
    } else {
      newConnectionDriver.setTypeOption(val);
    }
  };
  return (
    <div>
      <div className="">
        <CustomSelectorInput
          className="sub-panel__content__form__section__dropdown"
          options={options}
          onChange={onTypeSelectionChange}
          value={newConnectionDriver.typeOption}
        />
      </div>
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
    default: {
      const extraNewElementDriverEditorCreators =
        editorStore.applicationStore.pluginManager
          .getEditorPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_EditorPlugin_Extension
              ).getExtraNewElementDriverEditorCreators?.() ?? [],
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

// TODO: investigate the potential approach of VSCode to have inline input in the tree to create element quickly
export const CreateNewElementModal = observer(() => {
  const editorStore = useEditorStore();
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
        selectedPackage !== editorStore.graphState.graph.root ||
        type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
    )
    .map(buildElementTypeOption);

  const selectedTypeOption = buildElementTypeOption(newElementState.type);
  const handleTypeChange = (val: ElementTypeSelectOption): void =>
    newElementState.setElementType(val.value);
  // Submit button
  const closeModal = (): void => newElementState.closeModal();
  const [packageName, elementName] = resolvePackageAndElementName(
    selectedPackage,
    editorStore.graphState.graph.isRoot(selectedPackage),
    name,
  );
  const resolvedPackage =
    editorStore.graphState.graph.getNullablePackage(packageName);
  const needsToOverride = Boolean(
    resolvedPackage?.children.find((child) => child.name === elementName),
  );
  const isDisabled = !name || needsToOverride || !newElementState.isValid;
  const save = (): void => {
    newElementState.save();
  };
  const handleEnter = (): void => {
    newElementState.setName('');
    elementNameInputRef.current?.focus();
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    save();
  };

  if (!newElementState.modal) {
    return null;
  }
  return (
    <Dialog
      open={newElementState.modal}
      onClose={closeModal}
      onEnter={handleEnter}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <form
        data-testid={CORE_TEST_ID.NEW_ELEMENT_MODAL}
        onSubmit={handleSubmit}
        className="modal search-modal"
      >
        <div className="modal__title">
          Create a New{' '}
          {getElementTypeLabel(editorStore, newElementState.type) ?? 'element'}
        </div>
        <div>
          {newElementState.showType && (
            <CustomSelectorInput
              options={typeOptions}
              disabled={typeOptions.length === 1}
              onChange={handleTypeChange}
              value={selectedTypeOption}
              isClearable={false}
            />
          )}
          <input
            className="input explorer__new-element-modal__name-input"
            ref={elementNameInputRef}
            spellCheck={false}
            value={name}
            onChange={handleNameChange}
            placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the ${
              getElementTypeLabel(editorStore, newElementState.type) ??
              'element'
            }`}
            name={`Element name`}
          />
          {renderNewElementDriver(newElementState.type, editorStore)}
        </div>
        <button type="button" className="btn u-pull-right" onClick={closeModal}>
          Cancel
        </button>
        <button className="btn btn--primary u-pull-right" disabled={isDisabled}>
          Create
        </button>
      </form>
    </Dialog>
  );
});
