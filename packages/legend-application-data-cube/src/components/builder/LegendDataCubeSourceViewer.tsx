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
import { LakehouseConsumerDataCubeSource } from '../../stores/model/LakehouseConsumerDataCubeSource.js';
import { useLegendDataCubeApplicationStore } from '../LegendDataCubeFrameworkProvider.js';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateQueryViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateLakehouseViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateLakehouseAdHocViewUrl,
} from '../../__lib__/LegendDataCubeNavigation.js';
import { DataCubeIcon } from '@finos/legend-art';
import {
  _defaultPrimitiveTypeValue,
  _elementPtr,
  _primitiveValue,
  _property,
  AlertType,
  FormAlert,
  FormButton,
  isPrimitiveType,
  UserDefinedFunctionDataCubeSource,
} from '@finos/legend-data-cube';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type DepotServerClient,
  DepotScope,
  StoreProjectData,
} from '@finos/legend-server-depot';
import {
  deepClone,
  guaranteeIsString,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import {
  type LightQuery,
  type PureProtocolProcessorPlugin,
  type V1_Enumeration,
  type V1_PureModelContext,
  type V1_PureModelContextData,
  type V1_Variable,
  PRIMITIVE_TYPE,
  V1_CORE_SYSTEM_MODELS,
  V1_deserializePureModelContext,
  V1_deserializePureModelContextData,
  V1_LegendSDLC,
  V1_observe_ValueSpecification,
  V1_PackageableType,
  V1_PureModelContextPointer,
  V1_serializeValueSpecification,
  V1_ValueSpecification,
} from '@finos/legend-graph';
import {
  isValidV1_ValueSpecification,
  V1_BasicValueSpecificationEditor,
} from '@finos/legend-query-builder';
import { LegendDataCubeBuilderState } from '../../stores/builder/LegendDataCubeBuilderStore.js';
import {
  fetchV1Enumeration,
  isVariableEnumerationType,
} from '../../stores/builder/source/LegendQueryDataCubeSourceBuilderStateHelper.js';
import { generateGAVCoordinates } from '@finos/legend-storage';

const handleFetchEnumerations = async (
  enumerationVariables: V1_Variable[],
  query: LightQuery,
  systemModel: V1_PureModelContextData,
  depotServerClient: DepotServerClient,
  plugins: PureProtocolProcessorPlugin[],
  updateCallback: (val: { [name: string]: V1_Enumeration }) => void,
) => {
  await Promise.all(
    enumerationVariables.map(async (variable) => {
      const packageableType = guaranteeType(
        variable.genericType?.rawType,
        V1_PackageableType,
        'Can only edit parameters with packageable type',
      );
      const enumeration = await fetchV1Enumeration(
        packageableType.fullPath,
        query,
        systemModel,
        depotServerClient,
        plugins,
      );
      return { variable, enumeration };
    }),
  ).then((response) => {
    const result = response.reduce(
      (acc, { variable, enumeration }) => {
        acc[variable.name] = enumeration;
        return acc;
      },
      {} as { [name: string]: V1_Enumeration },
    );
    updateCallback(result);
  });
};

const LegendQuerySourceViewer = observer(
  (props: { source: LegendQueryDataCubeSource }) => {
    const { source } = props;
    const store = useLegendDataCubeBuilderStore();
    const application = useLegendDataCubeApplicationStore();

    const systemModel = useMemo(
      () => V1_deserializePureModelContextData(V1_CORE_SYSTEM_MODELS),
      [],
    );
    const [params, setParams] = useState<
      { variable: V1_Variable; valueSpec: V1_ValueSpecification }[]
    >(source.parameterValues.map(deepClone));
    const [enumerations, setEnumerations] = useState<{
      [name: string]: V1_Enumeration;
    }>({});
    const [isUpdatingParameters, setIsUpdatingParameters] = useState(false);

    // If caching is enabled on the grid, we disable editing the query parameters.
    // User will need to disable caching to be able to edit parameters.
    const isCachingEnabled =
      store.builder?.dataCube?.isCachingEnabled() ?? false;

    const _handleFetchEnumerations = useCallback(async () => {
      const enumerationVariables = source.parameterValues
        .map((parameter) =>
          source.lambda.parameters.find(
            (_param) => parameter.variable.name === _param.name,
          ),
        )
        .filter(isNonNullable)
        .filter(isVariableEnumerationType);
      await handleFetchEnumerations(
        enumerationVariables,
        source.info,
        systemModel,
        store.depotServerClient,
        application.pluginManager.getPureProtocolProcessorPlugins(),
        setEnumerations,
      );
    }, [
      application.pluginManager,
      source,
      store.depotServerClient,
      systemModel,
    ]);

    useEffect(() => {
      // eslint-disable-next-line no-void
      void void _handleFetchEnumerations();
    }, [_handleFetchEnumerations]);

    const updateParameterValue = (
      name: string,
      valueSpec: V1_ValueSpecification,
    ): void => {
      setParams(
        params.map((param) => {
          if (param.variable.name === name) {
            param.valueSpec = valueSpec;
          }
          return param;
        }),
      );
    };

    const updateBuilderWithNewSpecification = async () => {
      // Verify that all params are valid
      if (
        params.some(
          (param) =>
            !isValidV1_ValueSpecification(
              param.valueSpec,
              param.variable.multiplicity,
            ),
        )
      ) {
        return;
      }

      setIsUpdatingParameters(true);

      try {
        // Create the new raw source with new parameter values
        const newRawSource = new RawLegendQueryDataCubeSource();
        newRawSource.queryId = source.info.id;
        newRawSource.parameterValues = params.map((param) => {
          const parameterVariable = source.lambda.parameters.find(
            (_param) => _param.name === param.variable.name,
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
                guaranteeType(param.valueSpec, V1_ValueSpecification),
                application.pluginManager.getPureProtocolProcessorPlugins(),
              ),
            ),
          ];
        });
        const newRawSourceData =
          RawLegendQueryDataCubeSource.serialization.toJson(newRawSource);

        // Process the new raw source and create the new specification
        const newSource = await store.engine.processSource(newRawSourceData);
        const newSpecification = await store.engine.generateBaseSpecification(
          RawLegendQueryDataCubeSource.serialization.toJson(newRawSource),
          newSource,
        );
        newSpecification.configuration =
          store.builder?.initialSpecification.configuration;

        // Update the builder with a new state containing the new specification
        // We pass in the existing persistent data cube so we don't lose the
        // saved state of the data cube, if it exists.
        store.setBuilder(
          new LegendDataCubeBuilderState(
            store,
            newSpecification,
            store.builder?.persistentDataCube,
          ),
        );

        store.sourceViewerDisplay.close();
      } finally {
        setIsUpdatingParameters(false);
      }
    };

    const link = application.config.queryApplicationUrl
      ? EXTERNAL_APPLICATION_NAVIGATION__generateQueryViewUrl(
          application.config.queryApplicationUrl,
          source.info.id,
        )
      : undefined;
    const queryHasParameters = params.length > 0;

    return (
      <div className="h-full w-full px-2 pt-2">
        <div
          className={`h-[calc(100%_-_${queryHasParameters ? 40 : 8}px)] w-full border border-neutral-300 bg-white`}
        >
          <div className="h-full w-full select-none overflow-auto p-2">
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
                {params.map(
                  (parameter: {
                    variable: V1_Variable;
                    valueSpec: V1_ValueSpecification;
                  }) => {
                    const parameterVariable = guaranteeNonNullable(
                      source.lambda.parameters.find(
                        (param) => param.name === parameter.variable.name,
                      ),
                      `Unable to find parameter with name ${parameter.variable.name} in source lambda`,
                    );
                    const packageableType = guaranteeType(
                      parameterVariable.genericType?.rawType,
                      V1_PackageableType,
                      'Can only edit parameters with packageable type',
                    );

                    const resetValue = (): void => {
                      if (isPrimitiveType(packageableType.fullPath)) {
                        updateParameterValue(
                          parameter.variable.name,
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
                          parameter.variable.name,
                          V1_observe_ValueSpecification(valueSpec),
                        );
                      }
                    };

                    return (
                      <div
                        key={parameter.variable.name}
                        className="mt-1 flex h-fit min-h-5 w-full"
                      >
                        <div className="my-auto">
                          {parameter.variable.name}
                          {': '}
                        </div>
                        <V1_BasicValueSpecificationEditor
                          valueSpecification={guaranteeType(
                            parameter.valueSpec,
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
                              parameter.variable.name,
                              V1_observe_ValueSpecification(val),
                            );
                          }}
                          resetValue={resetValue}
                          className="ml-2 flex flex-auto"
                          enumeration={enumerations[parameter.variable.name]}
                          selectorConfig={{
                            optionCustomization: { rowHeight: 20 },
                          }}
                          lightMode={true}
                          readOnly={isCachingEnabled}
                        />
                      </div>
                    );
                  },
                )}
                {isCachingEnabled && (
                  <FormAlert
                    message="Parameter editing disabled"
                    type={AlertType.WARNING}
                    text="Parameter editing is disabled while caching is enabled. To update query parameter values, disable caching first."
                    className="mt-3"
                  />
                )}
              </div>
            )}
          </div>
        </div>
        {queryHasParameters && (
          <div className="flex h-10 items-center justify-end px-2">
            <FormButton
              disabled={isUpdatingParameters}
              onClick={() => store.sourceViewerDisplay.close()}
            >
              Cancel
            </FormButton>
            <FormButton
              className="ml-2"
              disabled={
                params.some(
                  (param) =>
                    !isValidV1_ValueSpecification(
                      param.valueSpec,
                      param.variable.multiplicity,
                    ),
                ) ||
                isCachingEnabled ||
                isUpdatingParameters
              }
              onClick={() => {
                // eslint-disable-next-line no-void
                void (async () => {
                  await updateBuilderWithNewSpecification();
                })();
              }}
            >
              Update Query Parameters
            </FormButton>
          </div>
        )}
      </div>
    );
  },
);

const LakehouseConsumerSourceViewer = observer(
  (props: { source: LakehouseConsumerDataCubeSource }) => {
    const { source } = props;
    const store = useLegendDataCubeBuilderStore();
    const application = useLegendDataCubeApplicationStore();
    const dataSpacePath = guaranteeNonNullable(source.paths[0]);
    const accessPoint = guaranteeNonNullable(source.paths[1]);
    const accessPointPath = `${dataSpacePath}.${accessPoint}`;
    const link =
      application.config.legendLakehouseUrl && source.dpCoordinates
        ? EXTERNAL_APPLICATION_NAVIGATION__generateLakehouseViewUrl(
            application.config.legendLakehouseUrl,
            generateGAVCoordinates(
              source.dpCoordinates.groupId,
              source.dpCoordinates.artifactId,
              source.dpCoordinates.versionId,
            ),
            dataSpacePath,
          )
        : application.config.legendLakehouseUrl && source.deploymentId
          ? EXTERNAL_APPLICATION_NAVIGATION__generateLakehouseAdHocViewUrl(
              application.config.legendLakehouseUrl,
              guaranteeNonNullable(dataSpacePath.split('::').pop()),
              source.deploymentId,
            )
          : undefined;
    return (
      <div className="h-full w-full px-2 pt-2">
        <div
          className={`h-[calc(100%_-_8px)] w-full border border-neutral-300 bg-white`}
        >
          <div className="h-full w-full select-none overflow-auto p-2">
            <div className="flex h-6">
              <div className="flex h-6 items-center text-xl font-medium">
                <DataCubeIcon.Table />
              </div>
              <div className="ml-1 flex h-6 items-center text-xl font-medium">
                Lakehouse Consumer
              </div>
            </div>
            {accessPointPath && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_24px)] items-center border border-r-0 border-neutral-400 px-1.5">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="overflow-hidden overflow-ellipsis whitespace-nowrap font-bold text-sky-500 underline"
                  >
                    {accessPointPath}
                  </a>
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    store.application.clipboardService
                      .copyTextToClipboard(link ?? accessPointPath)
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
            {source.environment && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 px-1.5">
                  {source.environment}
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    store.application.clipboardService
                      .copyTextToClipboard(source.environment)
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
            {source.warehouse && (
              <div className="mt-2 flex h-6 w-full">
                <div className="flex h-full w-[calc(100%_-_20px)] items-center border border-r-0 border-neutral-400 px-1.5">
                  {source.warehouse}
                </div>
                <button
                  className="flex aspect-square h-full w-6 items-center justify-center border border-neutral-400 bg-neutral-300 hover:brightness-95"
                  onClick={() => {
                    store.application.clipboardService
                      .copyTextToClipboard(source.warehouse)
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
          </div>
        </div>
      </div>
    );
  },
);

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

export const LegendDataCubeSourceViewer = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const source = store.builder?.source;

  if (!source) {
    return null;
  }
  if (source instanceof LegendQueryDataCubeSource) {
    return <LegendQuerySourceViewer source={source} />;
  } else if (source instanceof UserDefinedFunctionDataCubeSource) {
    return <UserDefinedFunctionSourceViewer source={source} />;
  } else if (source instanceof LakehouseConsumerDataCubeSource) {
    return <LakehouseConsumerSourceViewer source={source} />;
  }
  return (
    <div className="h-full w-full px-2 pt-2">{`Can't display source`}</div>
  );
});
