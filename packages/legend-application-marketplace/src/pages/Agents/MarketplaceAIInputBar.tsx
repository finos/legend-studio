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

import { useRef, useLayoutEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { SendIcon, LoadingIcon, TimesIcon } from '@finos/legend-art';
import { useLegendMarketplaceAIChatStore } from '../../application/providers/LegendMarketplaceAIChatStoreProvider.js';
import { MarketplaceAIScopeSelector } from './MarketplaceAIScopeSelector.js';

export const MarketplaceAIInputBar = observer(
  (props: { placeholder: string; onSubmit: () => void }): React.ReactNode => {
    const { placeholder, onSubmit } = props;
    const store = useLegendMarketplaceAIChatStore();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [store.questionText]);

    return (
      <>
        {store.scopeProducts.length > 0 && (
          <div className="ai-scope-selector__pills">
            {store.scopeProducts.map((sp, idx) => (
              <div
                key={`${sp.coordinates.group_id}:${sp.coordinates.artifact_id}:${sp.coordinates.version}`}
                className="ai-scope-selector__pill"
              >
                <span className="ai-scope-selector__pill-text">{sp.name}</span>
                <button
                  type="button"
                  className="ai-scope-selector__pill-dismiss"
                  title="Remove"
                  aria-label={`Remove ${sp.name}`}
                  onClick={(): void => store.removeScopeProduct(idx)}
                >
                  <TimesIcon />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="marketplace-ai-chat__input-row">
          <MarketplaceAIScopeSelector />
          <textarea
            ref={textareaRef}
            className="marketplace-ai-chat__textarea"
            placeholder={placeholder}
            rows={1}
            spellCheck={false}
            value={store.questionText}
            onChange={(e): void => store.setQuestionText(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <button
            type="button"
            title="Send"
            aria-label="Send"
            className="marketplace-ai-chat__send-btn"
            disabled={store.isSending || !store.questionText.trim()}
            onClick={onSubmit}
          >
            {store.isSending ? <LoadingIcon isLoading={true} /> : <SendIcon />}
          </button>
        </div>
      </>
    );
  },
);
