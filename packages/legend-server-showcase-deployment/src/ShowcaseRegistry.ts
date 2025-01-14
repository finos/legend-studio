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
import {
  Showcase,
  type ShowcaseMetadata,
  type ShowcaseTextSearchMatch,
  type ShowcaseTextSearchResult,
} from '@finos/legend-server-showcase';
import {
  FuzzySearchEngine,
  promisify,
  type PlainObject,
  at,
  ActionState,
} from '@finos/legend-shared';

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
  private config?: ShowcaseRegistryConfig;

  // NOTE: maintain these to improve performance
  private RAW__metadata: PlainObject<ShowcaseMetadata>[] = [];
  private RAW__showcaseIndex = new Map<string, PlainObject<Showcase>>();

  private showcasesIndex = new Map<string, Showcase>();
  private showcaseSearchEngine: FuzzySearchEngine<Showcase>;

  readonly fetchDataState = ActionState.create();

  // private constructor to enforce singleton
  private constructor() {
    // NOTE: due to the way we export the constructor of `FuzzySearchEngine`, when we run this with ESM
    // we can remove this workaround once Fuse supports ESM
    // See https://github.com/krisk/Fuse/pull/727
    this.showcaseSearchEngine = new FuzzySearchEngine([], {
      includeScore: true,
      // NOTE: we must not sort/change the order in the grid since
      // we want to ensure the element row is on top
      shouldSort: false,
      // Ignore location when computing the search score
      // See https://fusejs.io/concepts/scoring-theory.html
      ignoreLocation: true,
      // This specifies the point the search gives up
      // `0.0` means exact match where `1.0` would match anything
      // We set a relatively low threshold to filter out irrelevant results
      threshold: 0.2,
      keys: [
        {
          name: 'title',
          weight: 5,
        },
        {
          name: 'description',
          weight: 3,
        },
        {
          name: 'path',
          weight: 2,
        },
        {
          name: 'documentation',
          weight: 1,
        },
      ],
      // extended search allows for exact word match through single quote
      // See https://fusejs.io/examples.html#extended-search
      useExtendedSearch: true,
    });
  }

  static async initialize(
    config: ShowcaseRegistryConfig,
  ): Promise<ShowcaseRegistry> {
    const registry = new ShowcaseRegistry();
    registry.config = config;
    await registry.fetchData();
    return registry;
  }

  getShowcases(): PlainObject<ShowcaseMetadata>[] {
    return this.RAW__metadata;
  }

  getShowcase(path: string): PlainObject<Showcase> | undefined {
    return this.RAW__showcaseIndex.get(path);
  }

  async fetchData(): Promise<void> {
    if (this.fetchDataState.isInProgress) {
      return;
    }

    try {
      this.fetchDataState.inProgress();

      const RAW__metadata: PlainObject<ShowcaseMetadata>[] = [];
      const RAW__showcaseIndex = new Map<string, PlainObject<Showcase>>();
      const showcasesIndex = new Map<string, Showcase>();

      await Promise.all(
        this.config?.datasources.map(async (datasource) => {
          const content = await fetchShowcasesData(datasource);
          content.forEach((showcaseContent) => {
            const showcase = Showcase.serialization.fromJson(showcaseContent);
            // NOTE: do not allow override
            if (!showcasesIndex.has(showcase.path)) {
              showcasesIndex.set(showcase.path, showcase);
              RAW__showcaseIndex.set(showcase.path, showcaseContent);
              RAW__metadata.push({
                title: showcase.title,
                path: showcase.path,
                description: showcase.description,
                development: showcase.development,
              });
            }
          });
        }) ?? [],
      );

      // update in one go
      this.RAW__metadata = RAW__metadata;
      this.RAW__showcaseIndex = RAW__showcaseIndex;
      this.showcasesIndex = showcasesIndex;
      this.showcaseSearchEngine.remove(() => true);
      this.showcaseSearchEngine.setCollection(
        Array.from(this.showcasesIndex.values()),
      );
    } finally {
      this.fetchDataState.complete();
    }
  }

  async search(searchText: string): Promise<ShowcaseTextSearchResult> {
    // short-circuit when the text search length is too short, else we would end up putting strain on the server
    if (searchText.length <= 2) {
      return { showcases: [], textMatches: [] };
    }
    const matches: ShowcaseTextSearchMatch[] = [];
    // NOTE: for text search, we only support case-insensitive search now
    const lowerCaseSearchText = searchText.toLowerCase();
    await Promise.all(
      Array.from(this.showcasesIndex.values()).map((showcase) =>
        promisify(() => {
          const result: ShowcaseTextSearchMatch = {
            path: showcase.path,
            matches: [],
            preview: [],
          };
          const previewLines = new Map<number, string>();
          const code = showcase.code;
          const lines = code.split('\n');
          lines.forEach((line, lineIdx) => {
            const lowerCaseLine = line.toLowerCase();
            let fromIdx = 0;
            let currentMatchIdx = lowerCaseLine.indexOf(
              lowerCaseSearchText,
              fromIdx,
            );
            while (currentMatchIdx !== -1) {
              const previewTextStartLineIdx = Math.max(lineIdx - 1, 0);
              previewLines.set(
                previewTextStartLineIdx + 1,
                at(lines, previewTextStartLineIdx),
              );
              previewLines.set(lineIdx + 1, at(lines, lineIdx));
              const previewTextEndLineIdx = Math.min(
                lineIdx + 1,
                lines.length - 1,
              );
              previewLines.set(
                previewTextEndLineIdx + 1,
                at(lines, previewTextEndLineIdx),
              );
              result.matches.push({
                line: lineIdx + 1,
                startColumn: currentMatchIdx + 1,
                endColumn: currentMatchIdx + 1 + lowerCaseSearchText.length,
              });
              fromIdx = currentMatchIdx + lowerCaseSearchText.length;
              currentMatchIdx = lowerCaseLine.indexOf(
                lowerCaseSearchText,
                fromIdx,
              );
            }
          });
          if (!result.matches.length) {
            return;
          }
          result.preview = Array.from(previewLines.entries())
            .map(([line, text]) => ({ line, text }))
            .sort((a, b) => a.line - b.line);
          matches.push(result);
        }),
      ),
    );
    return {
      showcases: Array.from(
        this.showcaseSearchEngine.search(searchText).values(),
      ).map((result) => result.item.path),
      textMatches: matches,
    };
  }
}
