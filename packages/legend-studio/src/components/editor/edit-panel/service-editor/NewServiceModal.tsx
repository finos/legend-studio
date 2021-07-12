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

import { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../../stores/EditorStore';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import { ELEMENT_PATH_DELIMITER } from '../../../../models/MetaModelConst';
import { resolvePackageNameAndElementName } from '../../../../models/MetaModelUtils';
import { guaranteeType } from '@finos/legend-studio-shared';
import Dialog from '@material-ui/core/Dialog';
import type { Mapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Package } from '../../../../models/metamodels/pure/model/packageableElements/domain/Package';

export const NewServiceModal = observer(
  (props: {
    mapping: Mapping;
    close: () => void;
    showModal: boolean;
    promoteToService: (
      packageName: string,
      serviceName: string,
    ) => Promise<void>;
    isReadOnly?: boolean;
  }) => {
    const { isReadOnly, mapping, close, promoteToService, showModal } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingPackage = guaranteeType(mapping.package, Package);
    const nameRef = useRef<HTMLInputElement>(null);
    const defaultServiceName = `${mapping.path}Service`;
    const [servicePath, setServicePath] = useState<string>(defaultServiceName);
    const [packageName, serviceName] = resolvePackageNameAndElementName(
      mappingPackage.path,
      servicePath,
    );
    const handleEnter = (): void => nameRef.current?.focus();
    const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      if (servicePath && !isReadOnly) {
        promoteToService(packageName, serviceName)
          .then(() => close())
          .catch(applicationStore.alertIllegalUnhandledError);
      }
    };
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setServicePath(event.target.value);
    const elementAlreadyExists = editorStore.graphState.graph.allElements
      .map((s) => s.path)
      .includes(packageName + ELEMENT_PATH_DELIMITER + serviceName);
    return (
      <Dialog
        open={showModal}
        onClose={close}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <form onSubmit={onSubmit} className="modal search-modal modal--dark">
          <div className="modal__title">Promote to Service</div>
          <input
            ref={nameRef}
            className="input mapping-execution-panel__service__modal__service-path"
            disabled={isReadOnly}
            value={servicePath}
            spellCheck={false}
            onChange={changeValue}
            placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the service`}
          />
          {elementAlreadyExists && (
            <div>Element with same path already exists</div>
          )}
          <button
            className="btn btn--primary u-pull-right"
            disabled={isReadOnly ?? elementAlreadyExists}
            color="primary"
          >
            Create
          </button>
        </form>
      </Dialog>
    );
  },
);
