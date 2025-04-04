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
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import {
  LegendQueryDataCubeSource,
  RawLegendQueryDataCubeSource,
} from '../../stores/model/LegendQueryDataCubeSource.js';
import { useLegendDataCubeApplicationStore } from '../LegendDataCubeFrameworkProvider.js';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateQueryViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioViewUrl,
} from '../../__lib__/LegendDataCubeNavigation.js';
import { DataCubeIcon } from '@finos/legend-art';
import {
  _defaultPrimitiveTypeValue,
  _elementPtr,
  _primitiveValue,
  _property,
  FormButton,
  isPrimitiveType,
  UserDefinedFunctionDataCubeSource,
} from '@finos/legend-data-cube';
import { useCallback, useEffect, useState } from 'react';
import {
  type DepotServerClient,
  DepotScope,
  StoreProjectData,
} from '@finos/legend-server-depot';
import {
  guaranteeIsString,
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
  type PlainObject,
} from '@finos/legend-shared';
import {
  PRIMITIVE_TYPE,
  V1_deserializePureModelContext,
  V1_Enumeration,
  V1_LegendSDLC,
  V1_observe_ValueSpecification,
  V1_PackageableType,
  type V1_ParameterValue,
  V1_PureModelContextPointer,
  V1_ValueSpecification,
  type V1_Variable,
  type V1_PureModelContext,
  V1_CORE_SYSTEM_MODELS,
  V1_deserializePureModelContextData,
  type Enumeration,
  V1_deserializePackageableElement,
  type QueryInfo,
  type PureProtocolProcessorPlugin,
  V1_observe_ParameterValue,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import { V1_BasicValueSpecificationEditor } from '@finos/legend-query-builder';
import { LegendDataCubeBuilderState } from '../../stores/builder/LegendDataCubeBuilderStore.js';

const handleFetchProject = (
  depotServerClient: DepotServerClient,
  model: V1_PureModelContext,
  handleProjectChange: (val: StoreProjectData | undefined) => void,
) => {
  if (
    model instanceof V1_PureModelContextPointer &&
    model.sdlcInfo instanceof V1_LegendSDLC
  ) {
    depotServerClient
      .getProject(model.sdlcInfo.groupId, model.sdlcInfo.artifactId)
      .then((e) => {
        handleProjectChange(
          returnUndefOnError(() => StoreProjectData.serialization.fromJson(e)),
        );
      })
      .catch((e) => {
        // ignore
      });
  }
};

const generateStudioViewLink = (
  studio: string,
  project: StoreProjectData,
  version: string,
  element: string | undefined,
): string => {
  if (version.endsWith(DepotScope.SNAPSHOT)) {
    return EXTERNAL_APPLICATION_NAVIGATION__generateStudioViewUrl(
      studio,
      project.groupId,
      project.artifactId,
      version,
      element,
    );
  } else {
    return EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCViewUrl(
      studio,
      project.projectId,
      version,
      element,
    );
  }
};

const UserDefinedFunctionSourceViewer = observer(
  (props: { source: UserDefinedFunctionDataCubeSource }) => {
    const { source } = props;
    const sourceModel = returnUndefOnError(() =>
      V1_deserializePureModelContext(source.model),
    );
    const version =
      sourceModel instanceof V1_PureModelContextPointer &&
      sourceModel.sdlcInfo instanceof V1_LegendSDLC
        ? sourceModel.sdlcInfo.version
        : undefined;
    const store = useLegendDataCubeBuilderStore();
    const application = useLegendDataCubeApplicationStore();
    const [project, setProject] = useState<StoreProjectData | undefined>(
      undefined,
    );
    const link =
      project?.projectId && application.config.studioApplicationUrl && version
        ? generateStudioViewLink(
            application.config.studioApplicationUrl,
            project,
            version,
            source.functionPath,
          )
        : undefined;
    const _handleFetchProject = useCallback(() => {
      if (sourceModel) {
        handleFetchProject(store.depotServerClient, sourceModel, setProject);
      }
    }, [sourceModel, store.depotServerClient]);

    useEffect(() => {
      _handleFetchProject();
    }, [_handleFetchProject]);

    return (
      <div className="h-full w-full px-2 pt-2">
        <div className="h-[calc(100%_-_8px)] w-full border border-neutral-300 bg-white">
          <div className="h-full w-full select-none p-2">
            <div className="flex h-6">
              <div className="flex h-6 items-center text-xl font-medium">
                <DataCubeIcon.Table />
              </div>
              <div className="ml-1 flex h-6 items-center text-xl font-medium">
                User Defined Function
              </div>
            </div>
            {link && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 px-1.5 font-bold text-sky-500 underline">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="overflow-hidden overflow-ellipsis whitespace-nowrap"
                  >
                    {source.functionPath}
                  </a>
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    store.application.clipboardService
                      .copyTextToClipboard(link)
                      .catch((error) =>
                        store.alertService.alertUnhandledError(error),
                      );
                  }}
                  title="Copy Link"
                >
                  <DataCubeIcon.Clipboard />
                </button>
              </div>
            )}
            {!link && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 bg-neutral-200 px-1.5">
                  <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {source.functionPath}
                  </div>
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    application.clipboardService
                      .copyTextToClipboard(source.functionPath)
                      .catch((error) =>
                        store.alertService.alertUnhandledError(error),
                      );
                  }}
                  title="Copy ID"
                >
                  <DataCubeIcon.Clipboard />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

const isEnumerationParameter = (param: V1_Variable): boolean =>
  param.genericType?.rawType instanceof V1_PackageableType &&
  !Object.values(PRIMITIVE_TYPE)
    .map((type) => type.toString())
    .includes(param.genericType.rawType.fullPath);

const getEnumerationFromPath = async (
  path: string,
  queryInfo: QueryInfo,
  depotServerClient: DepotServerClient,
  plugins: PureProtocolProcessorPlugin[],
): Promise<V1_Enumeration> => {
  const systemModel = V1_deserializePureModelContextData(V1_CORE_SYSTEM_MODELS);

  // First, check if the enumeration exists in the system model
  const systemEnumeration = systemModel.elements.find(
    (element) => element.path === path && element instanceof V1_Enumeration,
  );
  if (systemEnumeration) {
    return systemEnumeration as V1_Enumeration;
  }

  // If not in the system model, fetch the enumeration from the depot server
  const enumerationElement = (
    await depotServerClient.getVersionEntity(
      queryInfo.groupId,
      queryInfo.artifactId,
      queryInfo.versionId,
      path,
    )
  ).content as PlainObject<Enumeration>;
  const enumeration = guaranteeType(
    V1_deserializePackageableElement(enumerationElement, plugins),
    V1_Enumeration,
  );
  return enumeration;
};

export const LegendDataCubeSourceViewer = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const source = store.builder?.source;
  const application = useLegendDataCubeApplicationStore();
  const [params, setParams] = useState<V1_ParameterValue[]>(
    source instanceof LegendQueryDataCubeSource
      ? source.parameterValues.map(V1_observe_ParameterValue)
      : [],
  );

  const [enumerations, setEnumerations] = useState<{
    [name: string]: V1_Enumeration;
  }>({});

  useEffect(() => {
    const fetchEnumerations = async (
      querySource: LegendQueryDataCubeSource,
    ) => {
      const fetchedEnumerations: typeof enumerations = {};
      for (const param of querySource.parameterValues) {
        const parameterVariable = querySource.lambda.parameters.find(
          (_param) => _param.name === param.name,
        );

        if (parameterVariable && isEnumerationParameter(parameterVariable)) {
          const packageableType = guaranteeType(
            parameterVariable.genericType?.rawType,
            V1_PackageableType,
            'Can only edit parameters with packageable type',
          );
          fetchedEnumerations[param.name] = await getEnumerationFromPath(
            packageableType.fullPath,
            querySource.info,
            store.depotServerClient,
            application.pluginManager.getPureProtocolProcessorPlugins(),
          );
        }
      }
      setEnumerations(fetchedEnumerations);
    };
    if (source instanceof LegendQueryDataCubeSource) {
      fetchEnumerations(source);
    }
  }, [source, application.pluginManager, store.depotServerClient]);

  if (!source) {
    return null;
  }
  if (source instanceof LegendQueryDataCubeSource) {
    const link = application.config.queryApplicationUrl
      ? EXTERNAL_APPLICATION_NAVIGATION__generateQueryViewUrl(
          application.config.queryApplicationUrl,
          source.info.id,
        )
      : undefined;

    const updateParameterValue = (
      name: string,
      valueSpec: V1_ValueSpecification,
    ): void => {
      setParams(
        params.map((param) => {
          if (param.name === name) {
            param.value = valueSpec;
          }
          return param;
        }),
      );
    };

    const queryHasParameters = params.length > 0;

    return (
      <div className="h-full w-full px-2 pt-2">
        <div
          className={`h-[calc(100%_-_${queryHasParameters ? 40 : 8}px)] w-full border border-neutral-300 bg-white`}
        >
          <div className="h-full w-full select-none p-2">
            <div className="flex h-6">
              <div className="flex h-6 items-center text-xl font-medium">
                <DataCubeIcon.Table />
              </div>
              <div className="ml-1 flex h-6 items-center text-xl font-medium">
                Legend Query
              </div>
            </div>
            {link && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 px-1.5 font-bold text-sky-500 underline">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="overflow-hidden overflow-ellipsis whitespace-nowrap"
                  >
                    {link}
                  </a>
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    store.application.clipboardService
                      .copyTextToClipboard(link)
                      .catch((error) =>
                        store.alertService.alertUnhandledError(error),
                      );
                  }}
                  title="Copy Link"
                >
                  <DataCubeIcon.Clipboard />
                </button>
              </div>
            )}
            {!link && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 bg-neutral-200 px-1.5">
                  <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
                    {source.info.id}
                  </div>
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    application.clipboardService
                      .copyTextToClipboard(source.info.id)
                      .catch((error) =>
                        store.alertService.alertUnhandledError(error),
                      );
                  }}
                  title="Copy ID"
                >
                  <DataCubeIcon.Clipboard />
                </button>
              </div>
            )}
            {queryHasParameters && (
              <div className="h-50 mt-2 w-full overflow-auto">
                <div>Parameters:</div>
                {params.map((parameter: V1_ParameterValue) => {
                  const parameterVariable = source.lambda.parameters.find(
                    (param) => param.name === parameter.name,
                  );
                  if (parameterVariable) {
                    const packageableType = guaranteeType(
                      parameterVariable.genericType?.rawType,
                      V1_PackageableType,
                      'Can only edit parameters with packageable type',
                    );
                    const resetValue = (): void => {
                      if (isPrimitiveType(packageableType.fullPath)) {
                        updateParameterValue(
                          parameter.name,
                          V1_observe_ValueSpecification(
                            _primitiveValue(
                              packageableType.fullPath,
                              _defaultPrimitiveTypeValue(
                                packageableType.fullPath,
                              ),
                            ),
                          ),
                        );
                      } else {
                        // If not a primitive, assume it is an enum
                        const typeParam = _elementPtr(
                          guaranteeIsString(packageableType.fullPath),
                        );
                        const valueSpec = _property('', [typeParam]);
                        updateParameterValue(
                          parameter.name,
                          V1_observe_ValueSpecification(valueSpec),
                        );
                      }
                    };
                    return (
                      <div
                        key={parameter.name}
                        className="mt-1 flex h-fit min-h-5 w-full"
                      >
                        <div className="my-auto">
                          {parameter.name}
                          {': '}
                        </div>
                        <V1_BasicValueSpecificationEditor
                          valueSpecification={guaranteeType(
                            parameter.value,
                            V1_ValueSpecification,
                          )}
                          multiplicity={parameterVariable.multiplicity}
                          typeCheckOption={{
                            expectedType: packageableType,
                            match:
                              packageableType.fullPath ===
                              PRIMITIVE_TYPE.DATETIME,
                          }}
                          setValueSpecification={(
                            val: V1_ValueSpecification,
                          ) => {
                            updateParameterValue(
                              parameter.name,
                              V1_observe_ValueSpecification(val),
                            );
                          }}
                          resetValue={resetValue}
                          className="ml-2 flex flex-auto"
                          enumeration={enumerations[parameter.name]}
                          selectorConfig={{
                            optionCustomization: { rowHeight: 20 },
                          }}
                          lightMode={true}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div key={parameter.name}>
                        Unable to find variable for parameter {parameter.name}
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
        {queryHasParameters && (
          <div className="flex h-10 items-center justify-end px-2">
            <FormButton onClick={() => store.sourceViewerDisplay.close()}>
              Close
            </FormButton>
            <FormButton
              className="ml-2"
              onClick={async () => {
                const newRawSource = new RawLegendQueryDataCubeSource();
                newRawSource.queryId = source.info.id;
                newRawSource.parameterValues = params.map((param) => {
                  const parameterVariable = source.lambda.parameters.find(
                    (_param) => _param.name === param.name,
                  );
                  return [
                    JSON.stringify(
                      V1_serializeValueSpecification(
                        guaranteeNonNullable(parameterVariable),
                        application.pluginManager.getPureProtocolProcessorPlugins(),
                      ),
                    ),
                    JSON.stringify(
                      V1_serializeValueSpecification(
                        guaranteeType(param.value, V1_ValueSpecification),
                        application.pluginManager.getPureProtocolProcessorPlugins(),
                      ),
                    ),
                  ];
                });
                const newRawSourceData =
                  RawLegendQueryDataCubeSource.serialization.toJson(
                    newRawSource,
                  );
                const newSource =
                  await store.engine.processSource(newRawSourceData);
                const newSpecification =
                  await store.engine.generateBaseSpecification(
                    RawLegendQueryDataCubeSource.serialization.toJson(
                      newRawSource,
                    ),
                    newSource,
                  );
                store.setBuilder(
                  new LegendDataCubeBuilderState(
                    newSpecification,
                    store.builder?.persistentDataCube,
                  ),
                );
                store.sourceViewerDisplay.close();
              }}
            >
              Update Query Parameters
            </FormButton>
          </div>
        )}
      </div>
    );
  } else if (source instanceof UserDefinedFunctionDataCubeSource) {
    return <UserDefinedFunctionSourceViewer source={source} />;
  }
  return (
    <div className="h-full w-full px-2 pt-2">{`Can't display source`}</div>
  );
});
