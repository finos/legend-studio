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

import React, { useRef } from 'react';
import { TEST_ID } from 'Const';
import Dialog from '@material-ui/core/Dialog';
import { observer } from 'mobx-react-lite';
import { NewPackageableRuntimeDriver, NewPackageableConnectionDriver, NewPureModelConnectionDriver, NewFileGenerationDriver, resolvePackageAndElementName } from 'Stores/NewElementState';
import { CustomSelectorInput } from 'Components/shared/CustomSelectorInput';
import { ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { useEditorStore } from 'Stores/EditorStore';
import { isElementTypeSupported } from 'Utilities/DemoUtil';
import { UnsupportedOperationError, compareLabelFn } from 'Utilities/GeneralUtil';
import { config } from 'ApplicationConfig';
import { FileGenerationTypeOption } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { PACKAGEABLE_ELEMENT_TYPE, PackageableElementSelectOption } from 'MM/model/packageableElements/PackageableElement';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Store } from 'MM/model/packageableElements/store/Store';
import { Class } from 'MM/model/packageableElements/domain/Class';

export const getElementTypeLabel = (type: PACKAGEABLE_ELEMENT_TYPE | undefined): string | undefined => {
  switch (type) {
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE: return 'package';
    case PACKAGEABLE_ELEMENT_TYPE.CLASS: return 'class';
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION: return 'enumeration';
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION: return 'association';
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE: return 'measure';
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE: return 'profile';
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION: return 'function';
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING: return 'mapping';
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: return 'connection';
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: return 'runtime';
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: return 'file generation';
    case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM: return 'diagram';
    case PACKAGEABLE_ELEMENT_TYPE.TEXT: return 'text';
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION: return 'generation specification';
    default: return undefined;
  }
};

interface ElementTypeSelectOption {
  label: string;
  value: PACKAGEABLE_ELEMENT_TYPE;
}

const buildElementTypeOption = (type: PACKAGEABLE_ELEMENT_TYPE): ElementTypeSelectOption => ({ label: type, value: type });

const NewRuntimeDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newRuntimeDriver = editorStore.newElementState.getNewElementDriver(NewPackageableRuntimeDriver);
  // mapping
  const mapping = newRuntimeDriver.mapping;
  const mappingOptions = editorStore.graphState.graph.mappingOptions;
  const selectedMappingOption = { label: mapping?.path ?? '', value: mapping };
  const onMappingSelectionChange = (val: PackageableElementSelectOption<Mapping>): void => { if (val.value !== mapping) { newRuntimeDriver.setMapping(val.value) } };

  if (!mapping) {
    // WIP: show warning
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

const NewPureModelConnectionDriverEditor = observer((props: {
  newConnectionValueDriver: NewPureModelConnectionDriver;
}) => {
  const { newConnectionValueDriver } = props;
  const editorStore = useEditorStore();
  // class
  const _class = newConnectionValueDriver.class;
  const classOptions = editorStore.graphState.graph.classOptions.slice().sort(compareLabelFn);
  const selectedClassOption = _class ? { label: _class.path, value: _class } : null;
  const onClassSelectionChange = (val: { label: string; value: Class } | null): void => { if (val) { newConnectionValueDriver.setClass(val.value) } };

  if (!_class) {
    // TODO: show warning
    return <div>no class found</div>;
  }
  return (
    <div>
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
});

const NewConnectionValueDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(NewPackageableConnectionDriver);
  const newConnectionValueDriver = newConnectionDriver.newConnectionValueDriver;
  /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
  if (newConnectionValueDriver instanceof NewPureModelConnectionDriver) {
    return <NewPureModelConnectionDriverEditor newConnectionValueDriver={newConnectionValueDriver} />;
  }
  throw new UnsupportedOperationError();
});

const NewConnectionDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(NewPackageableConnectionDriver);
  // store
  const store = newConnectionDriver.store;
  let storeOptions: { label: string; value?: Store }[] = [{ label: 'ModelStore', value: undefined }];
  storeOptions = storeOptions.concat(editorStore.graphState.graph.storeOptions.slice().sort(compareLabelFn));
  const selectedStoreOption = { label: store?.path ?? 'ModelStore', value: store };
  const onStoreSelectionChange = (val: { label: string; value?: Store }): void => newConnectionDriver.setStore(val.value);
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
      <NewConnectionValueDriverEditor />
    </div>
  );
});

const NewFileGenerationDriverEditor = observer(() => {
  const editorStore = useEditorStore();
  const newConnectionDriver = editorStore.newElementState.getNewElementDriver(NewFileGenerationDriver);
  const options = editorStore.graphState.graphGenerationState.fileGenerationConfigurationOptions;
  const onTypeSelectionChange = (val: FileGenerationTypeOption | null): void => {
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

// TODO: investigate the potential approach of VSCode to have inline input in the tree to create element quickly
export const CreateNewElementModal = observer(() => {
  const editorStore = useEditorStore();
  const newElementState = editorStore.newElementState;
  const selectedPackage = newElementState.selectedPackage;
  // Name
  const name = newElementState.name;
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = event => newElementState.setName(event.target.value);
  const elementNameInputRef = useRef<HTMLInputElement>(null);
  // Type
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  const typeOptions = [
    PACKAGEABLE_ELEMENT_TYPE.PACKAGE,
    PACKAGEABLE_ELEMENT_TYPE.CLASS,
    PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
    PACKAGEABLE_ELEMENT_TYPE.MEASURE,
    PACKAGEABLE_ELEMENT_TYPE.PROFILE,
    PACKAGEABLE_ELEMENT_TYPE.FUNCTION,
    PACKAGEABLE_ELEMENT_TYPE.CONNECTION,
    PACKAGEABLE_ELEMENT_TYPE.MAPPING,
    PACKAGEABLE_ELEMENT_TYPE.RUNTIME,
    PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION,
    PACKAGEABLE_ELEMENT_TYPE.DIAGRAM,
    PACKAGEABLE_ELEMENT_TYPE.TEXT,
    PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION,
    // NOTE: we can only create package in root
  ]
    .filter(type => (selectedPackage !== editorStore.graphState.graph.root) || type === PACKAGEABLE_ELEMENT_TYPE.PACKAGE)
    .filter(type => isElementTypeSupported(type, config.features.BETA__demoMode))
    .map(buildElementTypeOption);

  const selectedTypeOption = buildElementTypeOption(newElementState.type);
  const handleTypeChange = (val: ElementTypeSelectOption): void => newElementState.setElementType(val.value);
  // Submit button
  const closeModal = (): void => newElementState.closeModal();
  const [packageName, elementName] = resolvePackageAndElementName(selectedPackage, editorStore.graphState.graph.isRoot(selectedPackage), name);
  const resolvedPackage = editorStore.graphState.graph.getNullablePackage(packageName);
  const needsToOverride = resolvedPackage?.children.find(child => child.name === elementName);
  const isDisabled = !name || Boolean(needsToOverride) || !newElementState.isValid;
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

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  const renderNewElementDriver = (): React.ReactNode => {
    switch (newElementState.type) {
      case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: return <NewRuntimeDriverEditor />;
      case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: return <NewConnectionDriverEditor />;
      case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: return <NewFileGenerationDriverEditor />;
      default: return null;
    }
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
      <form data-testid={TEST_ID.NEW_ELEMENT_MODAL} onSubmit={handleSubmit} className="modal search-modal">
        <div className="modal__title">Create new {getElementTypeLabel(newElementState.type) ?? 'element'} ...</div>
        <div>
          {newElementState.showType &&
            <CustomSelectorInput
              options={typeOptions}
              disabled={typeOptions.length === 1}
              onChange={handleTypeChange}
              value={selectedTypeOption}
              isClearable={false}
            />
          }
          <input
            className="input explorer__new-element-modal__name-input"
            ref={elementNameInputRef}
            spellCheck={false}
            value={name}
            onChange={handleNameChange}
            placeholder={`Enter a name, use ${ENTITY_PATH_DELIMITER} to create new package(s) for the ${getElementTypeLabel(newElementState.type) ?? 'element'}`}
            name={`Element name`}
          />
          {renderNewElementDriver()}
        </div>
        <button type="button" className="btn u-pull-right" onClick={closeModal}>Cancel</button>
        <button
          title={`Create new ${newElementState.type.toLowerCase()}`}
          className="btn btn--primary u-pull-right"
          disabled={isDisabled}>
          {needsToOverride ? 'Overriding is not allowed' : 'Create'}
        </button>
      </form>
    </Dialog>
  );
});
