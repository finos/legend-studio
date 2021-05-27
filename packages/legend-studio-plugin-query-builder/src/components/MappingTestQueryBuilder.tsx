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

import type { MappingTestState, RawLambda } from '@finos/legend-studio';
import {
  EngineRuntime,
  PackageableElementExplicitReference,
  useApplicationStore,
  useEditorStore,
} from '@finos/legend-studio';
import { observer } from 'mobx-react-lite';
import { QueryBuilderState } from '../stores/QueryBuilderState';

export const MappingTestQueryBuilder = observer(
  (props: { testState: MappingTestState }) => {
    const { testState } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();
    const queryBuilderState =
      editorStore.getEditorExtensionState(QueryBuilderState);
    const editWithQueryBuilder = async (): Promise<void> => {
      const mapping = testState.mappingEditorState.mapping;
      const customRuntime = new EngineRuntime();
      customRuntime.addMapping(
        PackageableElementExplicitReference.create(mapping),
      );
      await queryBuilderState.querySetupState.setup(
        testState.queryState.query,
        mapping,
        customRuntime,
        (lambda: RawLambda): Promise<void> =>
          testState.queryState
            .updateLamba(lambda)
            .then(() =>
              editorStore.applicationStore.notifySuccess(
                `Mapping test query is updated`,
              ),
            )
            .catch(applicationStore.alertIllegalUnhandledError),
        testState.queryState.query.isStub,
      );
    };
    return (
      <button
        className="btn--dark mapping-test-query-builder__btn"
        onClick={editWithQueryBuilder}
      >
        Edit Query
      </button>
    );
  },
);
