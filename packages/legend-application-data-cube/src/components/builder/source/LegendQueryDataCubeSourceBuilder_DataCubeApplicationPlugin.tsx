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

import { guaranteeType } from '@finos/legend-shared';
import packageJson from '../../../../package.json' with { type: 'json' };
import { LegendDataCubeApplicationPlugin } from '../../../application/LegendDataCubeApplicationPlugin.js';
import type { LegendDataCubeBuilderState } from '../../../stores/builder/LegendDataCubeBuilderStore.js';
import { LegendQueryDataCubeSource } from '../../../stores/model/LegendQueryDataCubeSource.js';
import { V1_AppliedFunction, V1_ValueSpecification } from '@finos/legend-graph';
import { clsx } from '@finos/legend-art';
import type {
  ApplicationStore,
  LegendApplicationConfig,
  LegendApplicationPluginManager,
  LegendApplicationPlugin,
} from '@finos/legend-application';
import {
  buildDatePickerOption,
  getV1_ValueSpecificationStringValue,
} from '@finos/legend-query-builder';

const getNameOfV1ValueSpecification = (
  value: V1_ValueSpecification,
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
): string | undefined => {
  if (value instanceof V1_AppliedFunction) {
    const possibleDateLabel = buildDatePickerOption(
      value,
      applicationStore,
    ).label;
    if (possibleDateLabel) {
      return possibleDateLabel;
    }
  }
  return getV1_ValueSpecificationStringValue(value, applicationStore);
};

export class LegendQueryDataCubeSourceBuilder_DataCubeApplicationPlugin extends LegendDataCubeApplicationPlugin {
  static NAME = packageJson.extensions.legendQueryDataCubeSourceBuilderPlugin;

  constructor() {
    super(
      LegendQueryDataCubeSourceBuilder_DataCubeApplicationPlugin.NAME,
      packageJson.version,
    );
  }

  override getSourceViewerHeight(
    builder: LegendDataCubeBuilderState | undefined,
  ): number | undefined {
    if (builder?.source instanceof LegendQueryDataCubeSource) {
      return (
        200 +
        20 * builder?.source?.parameterValues?.length +
        (builder?.dataCube?.isCachingEnabled() ? 70 : 0)
      );
    }
    return undefined;
  }

  override builderInnerHeaderRenderer(
    builder: LegendDataCubeBuilderState | undefined,
  ): React.ReactNode | null {
    if (
      builder?.source instanceof LegendQueryDataCubeSource &&
      builder.source.parameterValues.length
    ) {
      const source = guaranteeType(builder.source, LegendQueryDataCubeSource);

      return (
        <div
          key={LegendQueryDataCubeSourceBuilder_DataCubeApplicationPlugin.NAME}
          className="flex h-full flex-auto items-center overflow-auto border-l border-neutral-300 pl-2"
        >
          Parameters:
          {source.parameterValues.map((param) => {
            const paramValue = getNameOfV1ValueSpecification(
              guaranteeType(param.valueSpec, V1_ValueSpecification),
              builder._store.application,
            );
            return (
              <div
                key={param.variable.name}
                className="max-w-200 ml-2 flex cursor-pointer hover:brightness-95"
                onClick={() => {
                  // Set sourceViewerDisplay height based on length of parameters.
                  // Height should also be increased if we need to show the parameter
                  // editing disabled message.
                  builder._store.sourceViewerDisplay.configuration.window.height =
                    Math.min(600, this.getSourceViewerHeight(builder) ?? 200);
                  builder._store.sourceViewerDisplay.open();
                }}
              >
                <span className="truncate bg-neutral-300 px-1">
                  {param.variable.name}
                </span>
                <span
                  className={clsx('truncate bg-neutral-200 px-1', {
                    'text-neutral-500': paramValue === '',
                  })}
                >
                  {paramValue === '' ? '(empty)' : paramValue}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  }
}
