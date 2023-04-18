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
  type Class,
  PackageableElementExplicitReference,
  PureSingleExecution,
  Service,
} from '@finos/legend-graph';
import {
  type QueryBuilderState,
  ClassQueryBuilderState,
} from '@finos/legend-query-builder';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import type { EmbeddedQueryBuilderState } from '../../../../stores/editor/EmbeddedQueryBuilderState.js';
import {
  service_initNewService,
  service_setExecution,
} from '../../../../stores/editor/utils/modifier/DSL_Service_GraphModifierHelper.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { NewServiceModal } from '../service-editor/NewServiceModal.js';

const promoteQueryToService = async (
  packagePath: string,
  serviceName: string,
  embeddedQueryBuilderState: EmbeddedQueryBuilderState,
  queryBuilderState: QueryBuilderState,
): Promise<void> => {
  const editorStore = embeddedQueryBuilderState.editorStore;
  const applicationStore = editorStore.applicationStore;
  try {
    const mapping = guaranteeNonNullable(
      queryBuilderState.mapping,
      'Mapping is required to create service execution',
    );
    const runtime = guaranteeNonNullable(
      queryBuilderState.runtimeValue,
      'Runtime is required to create service execution',
    );
    const query = queryBuilderState.buildQuery();
    const service = new Service(serviceName);
    service_initNewService(service);
    service_setExecution(
      service,
      new PureSingleExecution(
        query,
        service,
        PackageableElementExplicitReference.create(mapping),
        runtime,
      ),
      editorStore.changeDetectionState.observerContext,
    );
    await flowResult(
      editorStore.graphEditorMode.addElement(service, packagePath, true),
    );
    await flowResult(
      embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(undefined),
    ).catch(applicationStore.alertUnhandledError);
    applicationStore.notificationService.notifySuccess(
      `Service '${service.name}' created`,
    );
  } catch (error) {
    assertErrorThrown(error);
    applicationStore.notificationService.notifyError(error);
  }
};

const PromoteToServiceQueryBuilderAction = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.embeddedQueryBuilderState;
    const [openNewServiceModal, setOpenNewServiceModal] = useState(false);
    const showNewServiceModal = (): void => setOpenNewServiceModal(true);
    const closeNewServiceModal = (): void => setOpenNewServiceModal(false);
    const allowPromoteToService = Boolean(
      queryBuilderState.mapping && queryBuilderState.runtimeValue,
    );
    const promoteToService = async (
      packagePath: string,
      serviceName: string,
    ): Promise<void> => {
      if (allowPromoteToService) {
        await promoteQueryToService(
          packagePath,
          serviceName,
          queryBuilderExtension,
          queryBuilderState,
        );
      }
    };
    return (
      <>
        <button
          className="query-builder__dialog__header__custom-action"
          tabIndex={-1}
          onClick={showNewServiceModal}
          disabled={!allowPromoteToService}
        >
          Promote to Service
        </button>
        {queryBuilderState.mapping && (
          <NewServiceModal
            mapping={queryBuilderState.mapping}
            close={closeNewServiceModal}
            showModal={openNewServiceModal}
            promoteToService={promoteToService}
          />
        )}
      </>
    );
  },
);

export const queryClass = async (
  _class: Class,
  editorStore: EditorStore,
): Promise<void> => {
  const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
  await flowResult(
    embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
      setupQueryBuilderState: () => {
        const queryBuilderState = new ClassQueryBuilderState(
          embeddedQueryBuilderState.editorStore.applicationStore,
          embeddedQueryBuilderState.editorStore.graphManagerState,
        );
        queryBuilderState.changeClass(_class);
        queryBuilderState.propagateClassChange(_class);
        return queryBuilderState;
      },
      // TODO: when we modularize DSL service, we will create an extension
      // mechanism for this action config
      // See https://github.com/finos/legend-studio/issues/65
      actionConfigs: [
        {
          key: 'promote-to-service-btn',
          renderer: (queryBuilderState: QueryBuilderState): React.ReactNode => (
            <PromoteToServiceQueryBuilderAction
              queryBuilderState={queryBuilderState}
            />
          ),
        },
      ],
    }),
  );
};
