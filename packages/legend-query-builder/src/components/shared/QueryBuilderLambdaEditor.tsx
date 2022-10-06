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

import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { type IKeyboardEvent, KeyCode } from 'monaco-editor';
import { useCallback, useMemo } from 'react';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import type { Type } from '@finos/legend-graph';
import {
  useApplicationStore,
  LambdaEditor,
  type LambdaEditorState,
  type LambdaEditorOnKeyDownEventHandler,
} from '@finos/legend-application';

export const QueryBuilderLambdaEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    className?: string;
    disabled: boolean;
    lambdaEditorState: LambdaEditorState;
    /**
     * TODO: when we pass in these expected type we should match a type as expected type if it's covariance, i.e. it is a subtype of
     * the expected type. Note that we also have to handle that relationship for Primitive type
     * See https://dzone.com/articles/covariance-and-contravariance
     */
    expectedType?: Type;
    matchedExpectedType?: () => boolean;
    onExpectedTypeLabelSelect?: () => void;
    forceBackdrop: boolean;
    disableExpansion?: boolean | undefined;
    forceExpansion?: boolean | undefined;
    disablePopUp?: boolean | undefined;
    useBaseTextEditorSettings?: boolean | undefined;
    hideErrorBar?: boolean | undefined;
    onEditorFocusEventHandler?: (() => void) | undefined;
  }) => {
    const {
      queryBuilderState,
      className,
      lambdaEditorState,
      disabled,
      forceBackdrop,
      expectedType,
      onExpectedTypeLabelSelect,
      matchedExpectedType,
      disableExpansion,
      forceExpansion,
      disablePopUp,
      useBaseTextEditorSettings,
      hideErrorBar,
      onEditorFocusEventHandler,
    } = props;
    const applicationStore = useApplicationStore();
    const backdropSetter = useCallback(
      (val: boolean) => queryBuilderState.setShowBackdrop(val),
      [queryBuilderState],
    );
    const onKeyDownEventHandlers: LambdaEditorOnKeyDownEventHandler[] = useMemo(
      () => [
        {
          matcher: (event: IKeyboardEvent): boolean =>
            event.keyCode === KeyCode.F9,
          action: (event: IKeyboardEvent): void => {
            const handler = async (): Promise<void> => {
              lambdaEditorState.clearErrors();
              if (!disabled) {
                await flowResult(
                  lambdaEditorState.convertLambdaGrammarStringToObject(),
                );
                // abort action if parser error occurred
                if (lambdaEditorState.parserError) {
                  return;
                }
              }
              await flowResult(queryBuilderState.compileQuery());
            };
            handler().catch(applicationStore.alertUnhandledError);
          },
        },
      ],
      [disabled, lambdaEditorState, applicationStore, queryBuilderState],
    );

    return (
      <LambdaEditor
        key={lambdaEditorState.uuid}
        className={className}
        disabled={disabled}
        lambdaEditorState={lambdaEditorState}
        expectedType={expectedType}
        matchedExpectedType={matchedExpectedType}
        onExpectedTypeLabelSelect={onExpectedTypeLabelSelect}
        forceBackdrop={forceBackdrop}
        backdropSetter={backdropSetter}
        disableExpansion={disableExpansion}
        forceExpansion={forceExpansion}
        disablePopUp={disablePopUp}
        useBaseTextEditorSettings={useBaseTextEditorSettings}
        hideErrorBar={hideErrorBar}
        onKeyDownEventHandlers={onKeyDownEventHandlers}
        onEditorFocusEventHandler={onEditorFocusEventHandler}
      />
    );
  },
);
