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

import axios, { type AxiosResponse } from 'axios';
import {
  ContentType,
  HttpHeader,
  parseLosslessJSON,
  type PlainObject,
} from '@finos/legend-shared';
import { ENGINE_TEST_SUPPORT_API_URL } from '@finos/legend-graph/test';

// Engine calls for Cube's engine tests (PLAN §3.4), as plain JSON. legend-graph's
// engine test support has no batch relation-type helper, and its `execute`
// parses the response, which would bypass Cube's lossless result reader

const PURE_API = `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1`;

const JSON_HEADERS = {
  [HttpHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON,
};

/** The commit of the engine the tests run against */
export const CUBE_ENGINE_TEST__getCommit = async (): Promise<string> => {
  const { data } = await axios.get<unknown, AxiosResponse<PlainObject>>(
    `${ENGINE_TEST_SUPPORT_API_URL}/server/v1/info`,
  );
  const info = data.info as { legendSDLC?: Record<string, string> } | undefined;
  return info?.legendSDLC?.['git.commit.id'] ?? 'unknown';
};

/**
 * The protocol JSON the engine parses Pure lambda text into, read losslessly
 * (a JSON parse would round large numbers) and without source information
 */
export const CUBE_ENGINE_TEST__grammarToJson_lambda = async (
  code: string,
): Promise<unknown> =>
  parseLosslessJSON(
    (
      await axios.post<unknown, AxiosResponse<string>>(
        `${PURE_API}/grammar/grammarToJson/lambda`,
        code,
        {
          headers: { [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN },
          params: { returnSourceInformation: false },
          responseType: 'text',
          transformResponse: (data: string) => data,
        },
      )
    ).data,
  );

/** The relation types of a batch of lambdas: `{result, errors}`, keyed as the input */
export const CUBE_ENGINE_TEST__lambdaRelationTypeBatch = async (
  input: object,
): Promise<PlainObject> =>
  (
    await axios.post<unknown, AxiosResponse<PlainObject>>(
      `${PURE_API}/compilation/lambdaRelationType/batch`,
      input,
      { headers: JSON_HEADERS },
    )
  ).data;

/** Compiles a model context; a model that doesn't compile is an HTTP 400 */
export const CUBE_ENGINE_TEST__compile = async (
  model: object,
): Promise<PlainObject> =>
  (
    await axios.post<unknown, AxiosResponse<PlainObject>>(
      `${PURE_API}/compilation/compile`,
      model,
      { headers: JSON_HEADERS },
    )
  ).data;

/** The Pure text of a lambda, as the engine renders it */
export const CUBE_ENGINE_TEST__jsonToGrammar_lambda = async (
  lambda: PlainObject,
  renderStyle?: string | undefined,
): Promise<string> =>
  (
    await axios.post<unknown, AxiosResponse<string>>(
      `${PURE_API}/grammar/jsonToGrammar/lambda`,
      lambda,
      {
        headers: {
          ...JSON_HEADERS,
          [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN,
        },
        params: { renderStyle },
        responseType: 'text',
        transformResponse: (data: string) => data,
      },
    )
  ).data;

/**
 * Executes a query and gives the response as the client's `returnAsResponse`
 * does, its body unread, so the lossless reader parses the raw text as it
 * does in the browser. A body given as text (with lossless numbers) is sent
 * as it is.
 */
export const CUBE_ENGINE_TEST__execute = async (
  input: object | string,
): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> => {
  const response = await axios.post<unknown, AxiosResponse<string>>(
    `${PURE_API}/execution/execute`,
    input,
    {
      headers: JSON_HEADERS,
      params: { serializationFormat: 'DEFAULT' },
      responseType: 'text',
      transformResponse: (data: string) => data,
      validateStatus: () => true,
    },
  );
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    text: async () => response.data,
  };
};
