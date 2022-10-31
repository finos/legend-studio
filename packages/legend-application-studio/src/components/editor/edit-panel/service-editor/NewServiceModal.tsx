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
import { guaranteeType } from '@finos/legend-shared';
import { Dialog, ModalTitle } from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  type Mapping,
  ELEMENT_PATH_DELIMITER,
  resolvePackagePathAndElementName,
  Package,
} from '@finos/legend-graph';

export const NewServiceModal = observer(
  (props: {
    mapping: Mapping;
    close: () => void;
    showModal: boolean;
    promoteToService: (
      packagePath: string,
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
    const [packagePath, serviceName] = resolvePackagePathAndElementName(
      servicePath,
      mappingPackage.path,
    );
    const elementAlreadyExists =
      editorStore.graphManagerState.graph.allOwnElements
        .map((s) => s.path)
        .includes(packagePath + ELEMENT_PATH_DELIMITER + serviceName);
    const handleEnter = (): void => nameRef.current?.focus();
    const create = (): void => {
      if (servicePath && !isReadOnly && !elementAlreadyExists) {
        promoteToService(packagePath, serviceName)
          .then(() => close())
          .catch(applicationStore.alertUnhandledError);
      }
    };
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      setServicePath(event.target.value);
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
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
          className="modal search-modal modal--dark"
        >
          <ModalTitle title="Promot to Service" />
          <div className="input-group">
            <input
              ref={nameRef}
              className="input input--dark input-group__input"
              disabled={isReadOnly}
              value={servicePath}
              spellCheck={false}
              onChange={changeValue}
              placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the service`}
            />
            {elementAlreadyExists && (
              <div className="input-group__error-message">
                Element with same path already exists
              </div>
            )}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={Boolean(isReadOnly) || elementAlreadyExists}
              onClick={create}
            >
              Create
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);
