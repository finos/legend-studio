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

import packageJson from '../package.json';
import SpanBuilder from 'zipkin-javascript-opentracing';
import { BatchRecorder, jsonEncoder } from 'zipkin';
import { HttpLogger } from 'zipkin-transport-http';
import type { Span as ZipkinSpan } from 'opentracing';
import type {
  TraceData,
  TracerServicePluginManager,
} from '@finos/legend-shared';
import {
  CORE_TRACER_TAG,
  assertNonEmptyString,
  guaranteeNonNullable,
  isNonNullable,
  TracerServicePlugin,
} from '@finos/legend-shared';

interface ZipkinTracerPluginConfigData {
  url: string;
  serviceName: string;
}

export class ZipkinTracerPlugin extends TracerServicePlugin<ZipkinSpan> {
  private _spanBuilder?: SpanBuilder;

  constructor() {
    super(packageJson.name, packageJson.version);
  }

  override configure(_configData: object): TracerServicePlugin<ZipkinSpan> {
    const configData = _configData as ZipkinTracerPluginConfigData;
    assertNonEmptyString(
      configData.url,
      `Can't configure Zipkin tracer: Malformed configuration data: 'url' field is missing or empty`,
    );
    assertNonEmptyString(
      configData.serviceName,
      `Can't configure Zipkin tracer: Malformed configuration data: 'serviceName' field is missing or empty`,
    );
    this._spanBuilder = new SpanBuilder({
      recorder: new BatchRecorder({
        logger: new HttpLogger({
          endpoint: configData.url,
          jsonEncoder: jsonEncoder.JSON_V2,
          // NOTE: this fetch implementation will be used for sending `spans`. Here, we use `whatwg-fetch`
          // with some specific options, we have to customize this instead of using the default global fetch
          // See https://github.com/openzipkin/zipkin-js/tree/master/packages/zipkin-transport-http#optional
          fetchImplementation: (
            _url: string,
            options: Record<PropertyKey, unknown>,
          ) =>
            fetch(_url, {
              ...options,
              mode: 'cors', // allow CORS - See https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
              credentials: 'include', // allow sending credentials to other domain
              redirect: 'manual', // avoid following authentication redirects
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                Accept: 'application/json',
              },
            }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      }),
      serviceName: configData.serviceName,
      kind: 'client',
    });
    return this;
  }

  install(pluginManager: TracerServicePluginManager): void {
    pluginManager.registerTracerServicePlugin(this);
  }

  get spanBuilder(): SpanBuilder {
    return guaranteeNonNullable(
      this._spanBuilder,
      `Can't configure Zipkin tracer: Tracer service has not been configured`,
    );
  }

  bootstrap(clientSpan: ZipkinSpan | undefined, response: Response): void {
    clientSpan?.setTag(
      CORE_TRACER_TAG.HTTP_STATUS,
      `${response.status} (${response.statusText})`,
    );
  }

  createClientSpan(traceData: TraceData): ZipkinSpan {
    const clientSpan = this.spanBuilder.startSpan(
      traceData.spanName,
    ) as ZipkinSpan;
    if (traceData.tags) {
      Object.entries(traceData.tags).forEach(([tag, value]) => {
        if (isNonNullable(value)) {
          clientSpan.setTag(tag, value);
        }
      });
    }
    return clientSpan;
  }

  /**
   * Create a server span (or server span) for the specified client span. This child span acts as a placeholder span
   * which holds the trace ID, so in case the backend supports tracing (Open Tracing), this span will be replaced by the server
   */
  createServerSpan(
    clientSpan: ZipkinSpan,
    method: string,
    url: string,
    headers: Record<PropertyKey, unknown> = {},
  ): ZipkinSpan {
    // When the service (client) calls a downstream services (server), it’s useful to pass down the SpanContext, so that
    // Spans generated by this service could join the Spans from our service in a single trace. To do that, our service needs to
    // `inject` the SpanContext into the payload and the downstream services need to `extract` the context info create more Spans
    // See https://opentracing.io/guides/java/inject-extract/
    // See https://github.com/DanielMSchmidt/zipkin-javascript-opentracing
    this.spanBuilder.inject(
      clientSpan,
      SpanBuilder.FORMAT_HTTP_HEADERS,
      headers,
    );
    const serverSpan = this.spanBuilder.startSpan('http request', {
      childOf: clientSpan,
    }) as ZipkinSpan;
    serverSpan.setTag(CORE_TRACER_TAG.HTTP_REQUEST_METHOD, method);
    serverSpan.setTag(CORE_TRACER_TAG.HTTP_REQUEST_URL, url);
    return serverSpan;
  }

  concludeClientSpan(
    clientSpan: ZipkinSpan | undefined,
    error: Error | undefined,
  ): void {
    if (!clientSpan) {
      return;
    }
    if (error) {
      clientSpan.setTag(CORE_TRACER_TAG.RESULT, 'error');
      if (error.message) {
        clientSpan.setTag(CORE_TRACER_TAG.ERROR, error.message);
      }
    } else {
      clientSpan.setTag(CORE_TRACER_TAG.RESULT, 'success');
    }
    clientSpan.finish();
  }

  concludeServerSpan(serverSpan: ZipkinSpan | undefined): void {
    serverSpan?.finish();
  }
}
