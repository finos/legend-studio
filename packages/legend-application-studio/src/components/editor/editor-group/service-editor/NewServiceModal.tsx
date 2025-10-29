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
import {
  Dialog,
  ModalTitle,
  PanelDivider,
  PanelFormSection,
  PanelFormValidatedTextField,
} from '@finos/legend-art';
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
    const [isValid, setIsValid] = useState(true);

    const handleEnter = (): void => nameRef.current?.focus();
    const create = (): void => {
      if (servicePath && !isReadOnly && isValid) {
        promoteToService(packagePath, serviceName)
          .then(() => close())
          .catch(applicationStore.alertUnhandledError);
      }
    };

    const validateElementDoesNotAlreadyExist = (
      newServiceName: string,
    ): string | undefined => {
      const elementAlreadyExists =
        editorStore.graphManagerState.graph.allOwnElements
          .map((s) => s.path)
          .includes(packagePath + ELEMENT_PATH_DELIMITER + newServiceName);

      if (!elementAlreadyExists) {
        return undefined;
      } else {
        return 'Element with same path already exists';
      }
    };

    const changeValue = (value: string): void => {
      setServicePath(value);
    };

    return (
      <Dialog
        open={showModal}
        onClose={close}
        slotProps={{
          transition: {
            onEnter: handleEnter,
          },
          paper: {
            classes: {
              root: 'search-modal__inner-container',
            },
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
          <ModalTitle title="Promote to Service" />
          <PanelFormValidatedTextField
            ref={nameRef}
            isReadOnly={isReadOnly ?? false}
            update={(value: string | undefined): void => {
              changeValue(value ?? '');
            }}
            validate={validateElementDoesNotAlreadyExist}
            onValidate={(issue: string | undefined) => setIsValid(!issue)}
            value={servicePath}
            placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the service`}
          />
          <PanelDivider />
          <PanelFormSection>
            <div className="search-modal__actions">
              <button
                className="btn btn--dark"
                disabled={Boolean(isReadOnly) || !isValid}
                onClick={create}
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
