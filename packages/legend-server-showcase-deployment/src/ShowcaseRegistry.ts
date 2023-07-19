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

import { get } from 'https';
import { readFileSync } from 'fs';
import { Showcase, type ShowcaseMetadata } from '@finos/legend-server-showcase';
import { type PlainObject } from '@finos/legend-shared';

async function fetchExternalLinkSiteData(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      const chunks_of_data: Uint8Array[] = [];
      response.on('data', (fragments) => {
        chunks_of_data.push(fragments);
      });
      response.on('end', () => {
        resolve(Buffer.concat(chunks_of_data).toString());
      });
      response.on('error', (error) => {
        reject(error);
      });
    });
  });
}

const fetchShowcasesData = async (datasource: {
  url?: string;
  path?: string;
}): Promise<PlainObject<Showcase>[]> => {
  let content: unknown;
  if (datasource.url) {
    content = JSON.parse(await fetchExternalLinkSiteData(datasource.url));
  } else if (datasource.path) {
    content = JSON.parse(readFileSync(datasource.path, { encoding: 'utf-8' }));
  }
  return content && Array.isArray(content) ? content : [];
};

export type ShowcaseRegistryConfig = {
  datasources: {
    url?: string;
    path?: string;
  }[];
};

export class ShowcaseRegistry {
  // NOTE: maintain these to improve performance
  private readonly RAW__metadata: PlainObject<ShowcaseMetadata>[] = [];
  private readonly RAW__showcaseIndex = new Map<
    string,
    PlainObject<Showcase>
  >();

  private readonly showcasesIndex = new Map<string, Showcase>();

  private constructor() {
    // private constructor to enforce singleton
  }

  static async initialize(
    config: ShowcaseRegistryConfig,
  ): Promise<ShowcaseRegistry> {
    const registry = new ShowcaseRegistry();

    await Promise.all(
      config.datasources.map(async (datasource) => {
        const content = await fetchShowcasesData(datasource);
        content.forEach((showcaseContent) => {
          const showcase = Showcase.serialization.fromJson(showcaseContent);
          // NOTE: do not allow override
          if (!registry.showcasesIndex.has(showcase.path)) {
            registry.showcasesIndex.set(showcase.path, showcase);
            registry.RAW__showcaseIndex.set(showcase.path, showcaseContent);
            registry.RAW__metadata.push({
              title: showcase.title,
              path: showcase.path,
              description: showcase.description,
            });
          }
        });
      }),
    );

    return registry;
  }

  getShowcases(): PlainObject<ShowcaseMetadata>[] {
    return this.RAW__metadata;
  }

  getShowcase(path: string): PlainObject<Showcase> | undefined {
    return this.RAW__showcaseIndex.get(path);
  }
}
