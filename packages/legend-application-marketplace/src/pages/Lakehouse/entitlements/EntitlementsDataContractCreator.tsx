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
  ModalBody,
  ModalFooter,
  ModalHeader,
  Dialog,
  Modal,
  PanelForm,
  PanelFormValidatedTextField,
  ModalFooterButton,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import type { V1_AccessPointGroup } from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { withAuth, type AuthContextProps } from 'react-oidc-context';
import { flowResult } from 'mobx';

export const DataContractCreator = withAuth(
  observer(
    (props: {
      onClose: () => void;
      accessGroupPoint: V1_AccessPointGroup;
      viewerState: DataProductViewerState;
    }) => {
      const { onClose, viewerState, accessGroupPoint } = props;
      const [description, setDescription] = useState<string | undefined>(
        undefined,
      );
      const auth = (props as unknown as { auth: AuthContextProps }).auth;
      const onCreate = (): void => {
        if (description) {
          flowResult(
            props.viewerState.create(
              description,
              accessGroupPoint,
              auth.user?.access_token,
            ),
          ).catch(viewerState.applicationStore.alertUnhandledError);
        }
      };

      const patternRef = useRef<HTMLInputElement>(null);
      return (
        <Dialog
          open={true}
          onClose={onClose}
          classes={{ container: 'dataContract-creator-modal__container' }}
          PaperProps={{
            classes: { root: 'dataContract-creator-modal__inner-container' },
          }}
        >
          <Modal>
            <PanelLoadingIndicator
              isLoading={viewerState.creatingContractState.isInProgress}
            />
            <ModalHeader>Create Data Contract</ModalHeader>
            <ModalBody>
              <PanelForm>
                <PanelFormValidatedTextField
                  ref={patternRef}
                  name="Description"
                  prompt={'Description for the data contract'}
                  update={(value: string | undefined): void => {
                    setDescription(value ?? '');
                  }}
                  validate={undefined}
                  value={description}
                />
              </PanelForm>
            </ModalBody>

            <ModalFooter>
              <ModalFooterButton onClick={onCreate}>Create</ModalFooterButton>
            </ModalFooter>
          </Modal>
        </Dialog>
      );
    },
  ),
);
