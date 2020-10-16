/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Inner from 'zipkin-javascript-opentracing';
import { BatchRecorder, jsonEncoder } from 'zipkin';
import { HttpLogger } from 'zipkin-transport-http';
import { Span } from 'opentracing';
import { returnUndefOnError, guaranteeNonNullable, IllegalStateError, noop } from 'Utilities/GeneralUtil';

class DummyLogger {
  logSpan = noop();
}

// TODO: move this out of here and move it to the respective clients
export const APP_TRACER_NAME = 'legend studio';

export enum TRACER_TAG {
  USER = 'user',
  REALM = 'realm',
  RESULT = 'result',
  ERROR = 'error',
  HTTP_STATUS = 'status',
  HTTP_REQUEST_METHOD = 'method',
  HTTP_REQUEST_URL = 'url',
}

// TODO: move this out of here and move it to the respective clients
// NOTE: Zipkin sends tag in lowercase
export enum TRACER_SPAN {
  HTTP_REQUEST = 'HTTP request',
  // SDLC
  IMPORT_PROJECT = 'import project',
  CREATE_PROJECT = 'create project',
  UPDATE_PROJECT = 'update project',
  CREATE_WORKSPACE = 'create workspace',
  UPDATE_WORKSPACE = 'update workspace',
  DELETE_WORKSPACE = 'delete workspace',
  CREATE_VERSION = 'create version',
  UPDATE_CONFIGURATION = 'update configuration',
  PERFORM_ENTITY_CHANGES = 'perform entity changes',
  UPDATE_ENTITIES = 'update entities',
  CREATE_REVIEW = 'create review',
  COMMIT_REVIEW = 'update entities',
  // EXEC
  GRAMMAR_TO_JSON = 'transform grammar to JSON',
  JSON_TO_GRAMMAR = 'transform JSON to grammar',
  XSD_TO_PROTOCOL = 'transform xsd to protocol',
  EXTERNAL_FORMAT_TO_PROTOCOL = 'transform external format to protocol',
  GENERATE_FILE = 'generate file',
  COMPILE = 'compile',
  COMPILE_GRAMMAR = 'compile grammar',
  GET_LAMBDA_RETURN_TYPE = 'get lambda return type',
  EXECUTE = 'execute',
  GENERATE_EXECUTION_PLAN = 'generate execution plan'
  // COMPLEX FLOW
}

class TracerClient {
  static instance: TracerClient;
  static HEADERS = Inner.FORMAT_HTTP_HEADERS;
  private initialized = false;
  private _tracer?: Inner;
  private url?: string;
  private userId?: string;
  private realm?: string;

  initialize(baseUrl: string, userId: string, realm: string): void {
    if (this.initialized) { throw new IllegalStateError('Tracer initialization should only happen once') }
    const logger = baseUrl ? new HttpLogger({
      endpoint: baseUrl,
      jsonEncoder: jsonEncoder.JSON_V2,
      // NOTE: this fetch implementation will be used for sending `spans`. Here, we use `whatwg-fetch`
      // with some specific options, we have to customize this instead of using the default global fetch
      // See https://github.com/openzipkin/zipkin-js/tree/master/packages/zipkin-transport-http#optional
      fetchImplementation: (url: string, options: Record<PropertyKey, unknown>) => fetch(url, {
        ...options,
        mode: 'cors', // allow CORS - See https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
        credentials: 'include', // allow sending credentials to other domain
        redirect: 'manual', // avoid following authentication redirects
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) : new DummyLogger();

    const recorder = new BatchRecorder({
      logger
    });
    this._tracer = new Inner({
      recorder,
      serviceName: APP_TRACER_NAME,
      kind: 'client'
    });
    this.url = baseUrl;
    this.userId = userId;
    this.realm = realm;
    this.initialized = true;
  }

  get tracer(): Inner {
    return guaranteeNonNullable(this._tracer, 'Tracer has not been initialized yet');
  }

  wrapInSpan<T>(name: TRACER_SPAN, tags: Record<PropertyKey, unknown>, promiseSupplier: (_span: Span) => Promise<T>, childOf?: Record<PropertyKey, unknown>): Promise<T> {
    const span = (childOf ? this.tracer.startSpan(name, { childOf }) : this.tracer.startSpan(name)) as Span;
    Object.entries(tags).forEach(([tag, value]) => span.setTag(tag, value ?? '(not set)'));
    return promiseSupplier(span).then(result => {
      span.setTag(TRACER_TAG.USER, this.userId ?? '(unknown)');
      span.setTag(TRACER_TAG.REALM, this.realm ?? '(unknown)');
      span.setTag(TRACER_TAG.RESULT, 'success');
      return Promise.resolve(result);
    }).catch(error => {
      span.setTag(TRACER_TAG.USER, this.userId ?? '(unknown)');
      span.setTag(TRACER_TAG.REALM, this.realm ?? '(unknown)');
      span.setTag(TRACER_TAG.RESULT, 'error');
      span.setTag(TRACER_TAG.ERROR, error?.message ?? '(unknown)');
      return Promise.reject(error);
    }).finally(() => span.finish());
  }

  private startSpan(name: TRACER_SPAN, options: Record<PropertyKey, unknown>): Span {
    const span = (this.tracer.startSpan(name, options)) as Span;
    span.setTag(TRACER_TAG.USER, this.userId ?? '(unknown)');
    span.setTag(TRACER_TAG.REALM, this.realm ?? '(unknown)');
    return span;
  }

  /**
   * Create a child span for the specified span. This child span acts as a placeholder span so in case
   * the backend supports tracing (Open Tracing), it will override the span ID with its own
   */
  createPlaceholderChildSpan(parentSpan: Span, method: string, url: string, headers: Record<PropertyKey, unknown> = {}): Span | undefined {
    return returnUndefOnError(() => {
      const childSpan = this.startSpan(TRACER_SPAN.HTTP_REQUEST, { childOf: parentSpan });
      childSpan.setTag(TRACER_TAG.HTTP_REQUEST_METHOD, method);
      childSpan.setTag(TRACER_TAG.HTTP_REQUEST_URL, url);
      this.tracer.inject(childSpan, TracerClient.HEADERS, headers);
      return childSpan;
    });
  }
}

TracerClient.instance = new TracerClient();
export const tracerClient = TracerClient.instance;
