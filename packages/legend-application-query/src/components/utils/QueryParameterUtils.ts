/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type GraphManagerState,
  type QueryParameterValue,
  type RawLambda,
  buildLambdaVariableExpressions,
  PrimitiveType,
  VariableExpression,
} from '@finos/legend-graph';
import { filterByType, returnUndefOnError } from '@finos/legend-shared';

const QUERY_PARAM_SUFFIX = 'p:';

export const extractQueryParams = (
  urlQuery: Record<string, string | undefined>,
): Record<string, string> | undefined => {
  const queryParamEntries = Array.from(Object.entries(urlQuery));
  if (queryParamEntries.length) {
    const paramValues: Record<string, string> = {};
    queryParamEntries.forEach(([key, queryValue]) => {
      if (queryValue && key.startsWith(QUERY_PARAM_SUFFIX)) {
        paramValues[key.slice(QUERY_PARAM_SUFFIX.length)] = queryValue;
      }
    });
    return Object.values(paramValues).length === 0 ? undefined : paramValues;
  }

  return undefined;
};

export const processQueryParameters = (
  query: RawLambda,
  savedQueryParams: QueryParameterValue[] | undefined,
  urlParams: Record<string, string> | undefined,
  graphManagerState: GraphManagerState,
): Map<string, string> | undefined => {
  const resolvedStringParams = new Map<string, string>();
  savedQueryParams?.forEach((e) => {
    resolvedStringParams.set(e.name, e.content);
  });
  // here we overwrite any params coming from the url
  if (urlParams && Object.values(urlParams).length > 0) {
    const compiledParams = returnUndefOnError(() =>
      buildLambdaVariableExpressions(query, graphManagerState),
    )?.filter(filterByType(VariableExpression));
    Object.entries(urlParams).forEach(([key, value]) => {
      const cP = compiledParams?.find((e) => e.name === key);
      if (cP?.genericType?.value.rawType === PrimitiveType.STRING) {
        resolvedStringParams.set(key, `'${value}'`);
      } else if (
        cP?.genericType?.value.rawType === PrimitiveType.DATE ||
        cP?.genericType?.value.rawType === PrimitiveType.STRICTDATE ||
        cP?.genericType?.value.rawType === PrimitiveType.DATETIME
      ) {
        resolvedStringParams.set(key, `%${value}`);
      } else {
        resolvedStringParams.set(key, value);
      }
    });
  }
  return resolvedStringParams.size > 0 ? resolvedStringParams : undefined;
};
