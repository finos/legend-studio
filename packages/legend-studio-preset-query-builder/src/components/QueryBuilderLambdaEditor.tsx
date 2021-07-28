import type {
  LambdaEditorOnKeyDownEventHandler,
  LambdaEditorState,
  Type,
} from '@finos/legend-studio';
import { LambdaEditor, useApplicationStore } from '@finos/legend-studio';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import type { IKeyboardEvent } from 'monaco-editor';
import { KeyCode } from 'monaco-editor';
import { useCallback, useMemo } from 'react';
import type { QueryBuilderState } from '../stores/QueryBuilderState';

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
    forceExpansion?: boolean;
    useBaseTextEditorSettings?: boolean;
    hideErrorBar?: boolean;
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
      forceExpansion,
      useBaseTextEditorSettings,
      hideErrorBar,
    } = props;
    const applicationStore = useApplicationStore();
    const backdropSetter = useCallback(
      (val: boolean) => queryBuilderState.setBackdrop(val),
      [queryBuilderState],
    );
    const onKeyDownEventHandlers: LambdaEditorOnKeyDownEventHandler[] = useMemo(
      () => [
        {
          matcher: (event: IKeyboardEvent): boolean =>
            event.keyCode === KeyCode.F9,
          action: (event: IKeyboardEvent): void => {
            flowResult(
              // TODO?: we can genericise this so we don't need to rely on `EditorStore`
              queryBuilderState.editorStore.graphState.checkLambdaParsingError(
                lambdaEditorState,
                !disabled,
                () => flowResult(queryBuilderState.compileQuery()),
              ),
            ).catch(applicationStore.alertIllegalUnhandledError);
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
        forceExpansion={forceExpansion}
        useBaseTextEditorSettings={useBaseTextEditorSettings}
        hideErrorBar={hideErrorBar}
        onKeyDownEventHandlers={onKeyDownEventHandlers}
      />
    );
  },
);
