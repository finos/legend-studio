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

/** What Dev Settings changes on an engine client: the engine server client's own setters */
export interface CubeEngineClientControls {
  setBaseUrl(url: string | undefined): void;
  setCompression(enabled: boolean): void;
}

/**
 * The settings every engine client of Cube shares (PLAN §11.16): the
 * engine's URL and whether requests are compressed. The engine, the
 * connection explorer and the catalogs each have their own client, built
 * from the same configuration; each registers here, so Dev Settings changes
 * them all at once. A change takes effect from the next request.
 */
export class CubeEngineClientSettings {
  /** The URL the host configured, to go back to */
  readonly defaultBaseUrl: string | undefined;
  baseUrl: string | undefined;
  requestCompression: boolean;
  private readonly clients: CubeEngineClientControls[] = [];

  constructor(config: {
    readonly baseUrl?: string | undefined;
    readonly enableCompression?: boolean | undefined;
  }) {
    this.defaultBaseUrl = config.baseUrl;
    this.baseUrl = config.baseUrl;
    this.requestCompression = Boolean(config.enableCompression);
  }

  /** Adds a client built from the same configuration, given the settings changed since */
  register(client: CubeEngineClientControls): void {
    this.clients.push(client);
    if (this.baseUrl !== this.defaultBaseUrl) {
      client.setBaseUrl(this.baseUrl);
    }
    client.setCompression(this.requestCompression);
  }

  setBaseUrl(url: string | undefined): void {
    this.baseUrl = url;
    this.clients.forEach((client) => client.setBaseUrl(url));
  }

  setRequestCompression(enabled: boolean): void {
    this.requestCompression = enabled;
    this.clients.forEach((client) => client.setCompression(enabled));
  }
}
