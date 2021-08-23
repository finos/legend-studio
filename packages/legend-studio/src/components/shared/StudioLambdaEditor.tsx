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

import { useMemo, useCallback } from 'react';
import type { IKeyboardEvent } from 'monaco-editor';
import { KeyCode } from 'monaco-editor';
import { observer } from 'mobx-react-lite';
import type {
  LambdaEditorOnKeyDownEventHandler,
  LambdaEditorState,
} from '@finos/legend-application';
import { LambdaEditor, useApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import type { Type } from '@finos/legend-graph';
import { useEditorStore } from '../editor/EditorStoreProvider';

export const StudioLambdaEditor = observer(
  (props: {
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
    forceExpansion?: boolean;
    useBaseTextEditorSettings?: boolean;
    hideErrorBar?: boolean;
  }) => {
    const {
      className,
      lambdaEditorState,
      disabled,
      forceBackdrop,
      expectedType,
      onExpectedTypeLabelSelect,
      matchedExpectedType,
      forceExpansion,
      useBaseTextEditorSettings,
      hideErrorBar,
    } = props;
    const applicationStore = useApplicationStore();
    const editorStore = useEditorStore();

    const backdropSetter = useCallback(
      (val: boolean) => editorStore.setBackdrop(val),
      [editorStore],
    );
    const onKeyDownEventHandlers: LambdaEditorOnKeyDownEventHandler[] = useMemo(
      () => [
        {
          matcher: (event: IKeyboardEvent): boolean =>
            event.keyCode === KeyCode.F8,
          action: (event: IKeyboardEvent): void => {
            flowResult(
              editorStore.graphState.checkLambdaParsingError(
                lambdaEditorState,
                !disabled,
                () => flowResult(editorStore.toggleTextMode()),
              ),
            ).catch(applicationStore.alertIllegalUnhandledError);
          },
        },
        {
          matcher: (event: IKeyboardEvent): boolean =>
            event.keyCode === KeyCode.F9,
          action: (event: IKeyboardEvent): void => {
            flowResult(
              editorStore.graphState.checkLambdaParsingError(
                lambdaEditorState,
                !disabled,
                () =>
                  flowResult(editorStore.graphState.globalCompileInFormMode()),
              ),
            ).catch(applicationStore.alertIllegalUnhandledError);
          },
        },
        {
          matcher: (event: IKeyboardEvent): boolean =>
            event.keyCode === KeyCode.F10,
          action: (event: IKeyboardEvent): void => {
            flowResult(
              editorStore.graphState.checkLambdaParsingError(
                lambdaEditorState,
                !disabled,
                () =>
                  flowResult(
                    editorStore.graphState.graphGenerationState.globalGenerate(),
                  ),
              ),
            ).catch(applicationStore.alertIllegalUnhandledError);
          },
        },
      ],
      [disabled, lambdaEditorState, applicationStore, editorStore],
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
        forceExpansion={forceExpansion}
        useBaseTextEditorSettings={useBaseTextEditorSettings}
        hideErrorBar={hideErrorBar}
        onKeyDownEventHandlers={onKeyDownEventHandlers}
      />
    );
  },
);
