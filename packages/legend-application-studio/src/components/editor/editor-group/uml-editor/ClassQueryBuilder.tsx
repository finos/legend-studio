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
  ConcreteFunctionDefinition,
  Multiplicity,
  resolvePackagePathAndElementName,
  ELEMENT_PATH_DELIMITER,
  RawVariableExpression,
  getFunctionSignature,
  GenericTypeExplicitReference,
  GenericType,
  type RawLambda,
  CORE_PURE_PATH,
  requireTypeArugments,
} from '@finos/legend-graph';
import {
  type QueryBuilderState,
  ClassQueryBuilderState,
  QueryBuilderAdvancedWorkflowState,
  QueryBuilderEmbeddedFromExecutionContextState,
} from '@finos/legend-query-builder';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import type { EmbeddedQueryBuilderState } from '../../../../stores/editor/EmbeddedQueryBuilderState.js';
import {
  service_initNewService,
  service_setExecution,
} from '../../../../stores/graph-modifier/DSL_Service_GraphModifierHelper.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { NewServiceModal } from '../service-editor/NewServiceModal.js';
import {
  CaretDownIcon,
  Dialog,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuContentItemLabel,
  ModalTitle,
  PanelDivider,
  PanelFormSection,
  PanelFormValidatedTextField,
} from '@finos/legend-art';

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
      queryBuilderState.executionContextState.mapping,
      'Mapping is required to create service execution',
    );
    const runtime = guaranteeNonNullable(
      queryBuilderState.executionContextState.runtimeValue,
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

export const promoteQueryToFunction = async (
  packagePath: string,
  functionName: string,
  embeddedQueryBuilderState: EmbeddedQueryBuilderState,
  queryBuilderState: QueryBuilderState,
): Promise<void> => {
  const editorStore = embeddedQueryBuilderState.editorStore;
  const applicationStore = editorStore.applicationStore;
  try {
    let query: RawLambda;
    if (
      queryBuilderState.executionContextState instanceof
      QueryBuilderEmbeddedFromExecutionContextState
    ) {
      query = queryBuilderState.buildQuery();
    } else {
      query = queryBuilderState.buildFromQuery();
    }
    const returnType = queryBuilderState.getQueryReturnType();
    const _genericType = new GenericType(returnType);
    if (requireTypeArugments(returnType)) {
      _genericType.typeArguments = [
        GenericTypeExplicitReference.create(
          new GenericType(
            editorStore.graphManagerState.graph.getType(CORE_PURE_PATH.ANY),
          ),
        ),
      ];
    }
    const _function = new ConcreteFunctionDefinition(
      functionName, // use functionName for now and it will be reset after composing _function.parameters and _function.returnType
      GenericTypeExplicitReference.create(_genericType),
      Multiplicity.ONE,
    );
    // we will copy the body of the query to the body of the function and extract the parameters out
    // to the function parameters
    _function.expressionSequence = query.body as object[];
    _function.parameters =
      queryBuilderState.parametersState.parameterStates.map(
        (e) =>
          new RawVariableExpression(
            e.parameter.name,
            e.parameter.multiplicity,
            PackageableElementExplicitReference.create(
              guaranteeNonNullable(e.parameter.genericType?.value.rawType),
            ),
          ),
      );
    // reset function name to be function signature
    _function.name = functionName + getFunctionSignature(_function);
    await flowResult(
      editorStore.graphEditorMode.addElement(_function, packagePath, true),
    );
    await flowResult(
      embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(undefined),
    ).catch(applicationStore.alertUnhandledError);
    applicationStore.notificationService.notifySuccess(
      `Function '${_function.name}' created`,
    );
  } catch (error) {
    assertErrorThrown(error);
    applicationStore.notificationService.notifyError(error);
  }
};

enum PROMOTE_QUERY_TYPE {
  FUNCTION = 'FUNCTION',
  SERVICE = 'SERVICE',
}

export const NewFunctionModal = observer(
  (props: {
    _class: Class | undefined;
    close: () => void;
    showModal: boolean;
    promoteToFunction: (
      packagePath: string,
      functionName: string,
    ) => Promise<void>;
    isReadOnly?: boolean;
  }) => {
    const { isReadOnly, close, _class, showModal, promoteToFunction } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const nameRef = useRef<HTMLInputElement>(null);
    const defaultFunctionname = _class
      ? `${_class.name}_QueryFunction`
      : `QueryFunction`;
    const [functionPath, setFunctionPath] =
      useState<string>(defaultFunctionname);
    const [packagePath, funcName] = resolvePackagePathAndElementName(
      functionPath,
      _class?.package?.path ?? 'model::functions',
    );
    const [isValid, setIsValid] = useState(true);

    const handleEnter = (): void => nameRef.current?.focus();
    const create = (): void => {
      if (functionPath && !isReadOnly && isValid) {
        promoteToFunction(packagePath, funcName)
          .then(() => close())
          .catch(applicationStore.alertUnhandledError);
      }
    };

    const validateElementDoesNotAlreadyExist = (
      myFunctionName: string,
    ): string | undefined => {
      const elementAlreadyExists =
        editorStore.graphManagerState.graph.allOwnElements
          .map((s) => s.path)
          .includes(packagePath + ELEMENT_PATH_DELIMITER + myFunctionName);

      if (!elementAlreadyExists) {
        return undefined;
      } else {
        return 'Element with same path already exists';
      }
    };

    const changeValue = (value: string): void => {
      setFunctionPath(value);
    };

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
          <ModalTitle title="Promote to Function" />
          <PanelFormValidatedTextField
            ref={nameRef}
            isReadOnly={isReadOnly ?? false}
            update={(value: string | undefined): void => {
              changeValue(value ?? '');
            }}
            validate={validateElementDoesNotAlreadyExist}
            onValidate={(issue: string | undefined) => setIsValid(!issue)}
            value={functionPath}
            placeholder={`Enter a name, use ${ELEMENT_PATH_DELIMITER} to create new package(s) for the function`}
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

const PromoteToServiceQueryBuilderAction = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const editorStore = useEditorStore();
    const queryBuilderExtension = editorStore.embeddedQueryBuilderState;
    const [promoteQueryModal, setPromoteQueryType] = useState<
      PROMOTE_QUERY_TYPE | undefined
    >(undefined);
    const showPromoteQueryModal = (type: PROMOTE_QUERY_TYPE): void =>
      setPromoteQueryType(type);
    const closeNewServiceModal = (): void => setPromoteQueryType(undefined);
    const allowPromotion = Boolean(
      queryBuilderState.executionContextState.mapping &&
        queryBuilderState.executionContextState.runtimeValue &&
        !queryBuilderState.allValidationIssues.length,
    );

    const renderSaveAsModal = (): React.ReactNode => {
      if (
        promoteQueryModal === PROMOTE_QUERY_TYPE.SERVICE &&
        queryBuilderState.executionContextState.mapping
      ) {
        const promoteToService = async (
          packagePath: string,
          serviceName: string,
        ): Promise<void> => {
          if (allowPromotion) {
            await promoteQueryToService(
              packagePath,
              serviceName,
              queryBuilderExtension,
              queryBuilderState,
            );
          }
        };

        return (
          <NewServiceModal
            mapping={queryBuilderState.executionContextState.mapping}
            close={closeNewServiceModal}
            showModal={true}
            promoteToService={promoteToService}
          />
        );
      } else if (promoteQueryModal === PROMOTE_QUERY_TYPE.FUNCTION) {
        const promoteToFunction = async (
          packagePath: string,
          serviceName: string,
        ): Promise<void> => {
          if (allowPromotion) {
            await promoteQueryToFunction(
              packagePath,
              serviceName,
              queryBuilderExtension,
              queryBuilderState,
            );
          }
        };

        return (
          <NewFunctionModal
            _class={queryBuilderState.class}
            close={closeNewServiceModal}
            showModal={true}
            promoteToFunction={promoteToFunction}
          />
        );
      }
      return null;
    };

    return (
      <>
        <ControlledDropdownMenu
          className="query-builder__dialog__header__custom-action"
          title="Promote Query..."
          content={
            <MenuContent>
              {Object.values(PROMOTE_QUERY_TYPE).map((type) => (
                <MenuContentItem
                  key={type}
                  disabled={!allowPromotion}
                  onClick={(): void => showPromoteQueryModal(type)}
                >
                  <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                    {prettyCONSTName(type)}
                  </MenuContentItemLabel>
                </MenuContentItem>
              ))}
            </MenuContent>
          }
          menuProps={{
            anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
            transformOrigin: { vertical: 'top', horizontal: 'right' },
            elevation: 7,
          }}
        >
          <div className="query-builder__sub-header__custom-action__label">
            Save As...
          </div>
          <CaretDownIcon className="query-builder__sub-header__custom-action__icon" />
        </ControlledDropdownMenu>
        {renderSaveAsModal()}
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
      setupQueryBuilderState: async () => {
        const queryBuilderState = new ClassQueryBuilderState(
          embeddedQueryBuilderState.editorStore.applicationStore,
          embeddedQueryBuilderState.editorStore.graphManagerState,
          QueryBuilderAdvancedWorkflowState.INSTANCE,
          editorStore.applicationStore.config.options.queryBuilderConfig,
          editorStore.editorMode.getSourceInfo(),
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
