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

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  NewFunctionModal,
  promoteQueryToFunction,
} from '../uml-editor/ClassQueryBuilder.js';

export const PromoteAccessorQueryToFunctionAction = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.embeddedQueryBuilderState;
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const accessor = queryBuilderState.sourceAccessor;
    const allowPromotion = Boolean(
      accessor &&
        queryBuilderState.executionContextState.runtimeValue &&
        !queryBuilderState.allValidationIssues.length,
    );

    const renderSaveAsModal = (): React.ReactNode => {
      if (!showPromoteModal || !accessor) {
        return null;
      }
      const promoteToFunction = async (
        packagePath: string,
        functionName: string,
      ): Promise<void> => {
        if (allowPromotion) {
          await promoteQueryToFunction(
            packagePath,
            functionName,
            queryBuilderExtension,
            queryBuilderState,
          );
        }
      };
      return (
        <NewFunctionModal
          defaultFunctionName={`${accessor.accessor}_QueryFunction`}
          defaultPackagePath={accessor.parentElement.package?.path}
          close={(): void => setShowPromoteModal(false)}
          showModal={true}
          promoteToFunction={promoteToFunction}
        />
      );
    };

    return (
      <>
        <button
          className="query-builder__dialog__header__custom-action"
          title="Save query as a function"
          disabled={!allowPromotion}
          onClick={(): void => setShowPromoteModal(true)}
        >
          Save As Function
        </button>
        {renderSaveAsModal()}
      </>
    );
  },
);
