import { generateExtensionUrlPattern } from '@finos/legend-application';
import {
  LEGEND_QUERY_PATH_PARAM_TOKEN,
  LEGEND_QUERY_QUERY_PARAM_TOKEN,
} from '@finos/legend-query';
import { generateGAVCoordinates } from '@finos/legend-server-depot';
import { generatePath } from 'react-router';

export enum DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN {
  DATA_SPACE_PATH = 'dataSpacePath',
  EXECUTION_CONTEXT = 'executionContext',
}

export interface DataSpaceQueryEditorPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: string;
  [DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.DATA_SPACE_PATH]: string;
  [DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.EXECUTION_CONTEXT]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]?: string;
}

export interface DataSpaceQueryEditorQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.CLASS_PATH]?: string;
}

export const DATA_SPACE_QUERY_EDITOR_ROUTE_PATTERN = `/dataspace/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GAV}/:${DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.DATA_SPACE_PATH}/:${DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.EXECUTION_CONTEXT}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH}?`;

export const generateDataSpaceQueryEditorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  dataSpacePath: string,
  executionContextKey: string,
  runtimePath?: string | undefined,
  classPath?: string | undefined,
): string =>
  `${generatePath(
    generateExtensionUrlPattern(DATA_SPACE_QUERY_EDITOR_ROUTE_PATTERN),
    {
      [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: generateGAVCoordinates(
        groupId,
        artifactId,
        versionId,
      ),
      [DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.DATA_SPACE_PATH]: dataSpacePath,
      [DATA_SPACE_QUERY_EDITOR_PATH_PARAM_TOKEN.EXECUTION_CONTEXT]:
        executionContextKey,
      [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: runtimePath,
    },
  )}${
    classPath
      ? `?${LEGEND_QUERY_QUERY_PARAM_TOKEN.CLASS_PATH}=${classPath}`
      : ''
  }`;
