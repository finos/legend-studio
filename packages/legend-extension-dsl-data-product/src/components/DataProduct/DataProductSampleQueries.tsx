/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { useRef, useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@finos/legend-art';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import { generateAnchorForSection } from '../../stores/ProductViewerNavigation.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
} from '@finos/legend-code-editor';
import {
  V1_InLineSampleQueryInfo,
  V1_PackageableElementSampleQueryInfo,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';

const SampleQueryItem = observer(
  (props: {
    query: V1_InLineSampleQueryInfo | V1_PackageableElementSampleQueryInfo;
  }) => {
    const { query } = props;
    const applicationStore = useApplicationStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    const queryGrammar =
      query instanceof V1_InLineSampleQueryInfo
        ? query.queryGrammar
        : undefined;

    return (
      <div className="data-product__viewer__sample-query__item">
        <button
          className="data-product__viewer__sample-query__item__header"
          onClick={() => setIsExpanded(!isExpanded)}
          tabIndex={-1}
        >
          <div className="data-product__viewer__sample-query__item__header__icon">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </div>
          <div className="data-product__viewer__sample-query__item__header__content">
            <div className="data-product__viewer__sample-query__item__header__title">
              {query.title}
            </div>
            {query.description && (
              <div className="data-product__viewer__sample-query__item__header__description">
                {query.description}
              </div>
            )}
          </div>
        </button>
        {isExpanded && queryGrammar && (
          <div className="data-product__viewer__sample-query__item__content">
            <div className="data-product__viewer__sample-query__item__content__query">
              <CodeEditor
                language={CODE_EDITOR_LANGUAGE.PURE}
                inputValue={queryGrammar}
                isReadOnly={true}
                hideMinimap={true}
                hideGutter={true}
                lightTheme={
                  darkMode
                    ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK
                    : CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
                }
              />
            </div>
          </div>
        )}
        {isExpanded &&
          query instanceof V1_PackageableElementSampleQueryInfo && (
            <div className="data-product__viewer__sample-query__item__content">
              <div className="data-product__viewer__sample-query__item__content__info">
                Query Path: {query.queryPath}
              </div>
            </div>
          )}
      </div>
    );
  },
);

export const DataProductSampleQueries = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection('SAMPLE_QUERIES');

    useEffect(() => {
      if (sectionRef.current) {
        dataProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        dataProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataProductViewerState, anchor]);

    if (dataProductViewerState.getSampleQueries().length === 0) {
      return null;
    }

    return (
      <div
        ref={sectionRef}
        className="data-product__viewer__wiki__section data-product__viewer__sample-queries"
      >
        <div className="data-product__viewer__wiki__section__header">
          <div className="data-product__viewer__wiki__section__header__label">
            Sample Queries
          </div>
        </div>
        <div className="data-product__viewer__sample-queries__content">
          {dataProductViewerState.getSampleQueries().map((query) => {
            if (
              query instanceof V1_InLineSampleQueryInfo ||
              query instanceof V1_PackageableElementSampleQueryInfo
            ) {
              return <SampleQueryItem key={query.id} query={query} />;
            }
            return null;
          })}
        </div>
      </div>
    );
  },
);
