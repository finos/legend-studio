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

import { useRef, useLayoutEffect, useEffect, useState, useMemo } from 'react';
import {
  SendIcon,
  LoadingIcon,
  SquareIcon,
  SparkleStarsIcon,
  CheckIcon,
  clsx,
} from '@finos/legend-art';
import type { LegendAIChatState, LegendAIScopeItem } from '../LegendAITypes.js';
import { LegendAIScopeSelector } from './LegendAIScopeSelector.js';

const MAX_TEXTAREA_HEIGHT = 160;

export const LegendAIChatInput = (props: {
  state: LegendAIChatState;
  scopes: LegendAIScopeItem[];
}): React.ReactNode => {
  const { state, scopes } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const modelLabel = useMemo(() => {
    const modelName = state.selectedModelName ?? 'Auto';
    return modelName.length > 18 ? `${modelName.slice(0, 17)}...` : modelName;
  }, [state.selectedModelName]);

  const effectiveModelName =
    state.selectedModelName ?? state.availableModelNames[0];

  useEffect(() => {
    if (!isModelDropdownOpen) {
      return undefined;
    }
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setIsModelDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModelDropdownOpen]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const nextHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
      el.style.height = `${nextHeight}px`;
    }
  }, [state.questionText]);

  return (
    <div className="legend-ai__input-area">
      <div className="legend-ai__question-wrapper">
        {state.selectedScopes.length > 0 && (
          <LegendAIScopeSelector
            scopes={scopes}
            selectedScopes={state.selectedScopes}
            onToggleScope={state.toggleScope}
            onRemoveScope={state.removeScope}
            hideSelector={true}
          />
        )}

        <div className="legend-ai__input-top">
          <textarea
            ref={textareaRef}
            className="legend-ai__question"
            placeholder="Ask anything about your data..."
            rows={1}
            spellCheck={false}
            value={state.questionText}
            onChange={(e): void => state.setQuestionText(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!state.isSending && state.questionText.trim()) {
                  state.askQuestion();
                }
              }
            }}
          />
        </div>

        <div className="legend-ai__input-bottom">
          <div className="legend-ai__input-bottom-left">
            <LegendAIScopeSelector
              scopes={scopes}
              selectedScopes={state.selectedScopes}
              onToggleScope={state.toggleScope}
              onRemoveScope={state.removeScope}
              hidePills={true}
            />

            {state.availableModelNames.length > 0 && (
              <div className="legend-ai__model-selector" ref={modelDropdownRef}>
                <button
                  type="button"
                  className="legend-ai__model-btn"
                  title="Select model"
                  aria-label="Select model"
                  aria-haspopup="true"
                  aria-expanded={isModelDropdownOpen}
                  onClick={(): void =>
                    setIsModelDropdownOpen((current) => !current)
                  }
                >
                  <span className="legend-ai__model-btn-icon">
                    <SparkleStarsIcon />
                  </span>
                  <span className="legend-ai__model-btn-label">
                    {modelLabel}
                  </span>
                </button>
                {isModelDropdownOpen && (
                  <div className="legend-ai__model-dropdown">
                    {state.availableModelNames.map((modelName) => {
                      const isSelected = modelName === effectiveModelName;
                      return (
                        <button
                          key={modelName}
                          type="button"
                          aria-pressed={isSelected}
                          className={clsx('legend-ai__model-dropdown-item', {
                            'legend-ai__model-dropdown-item--selected':
                              isSelected,
                          })}
                          onClick={(): void => {
                            state.setSelectedModelName(modelName);
                            setIsModelDropdownOpen(false);
                          }}
                        >
                          <span className="legend-ai__model-dropdown-item-label">
                            {modelName}
                          </span>
                          <span className="legend-ai__model-dropdown-item-check">
                            {isSelected ? <CheckIcon /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="legend-ai__input-bottom-right">
            {state.isSending && (
              <button
                type="button"
                title="Stop generation"
                aria-label="Stop generation"
                className="legend-ai__stop-btn"
                onClick={(): void => state.stopGeneration()}
              >
                <SquareIcon />
              </button>
            )}
            <button
              type="button"
              title="Send"
              aria-label="Send"
              className="legend-ai__send-btn"
              disabled={state.isSending || !state.questionText.trim()}
              onClick={(): void => state.askQuestion()}
            >
              {state.isSending ? (
                <LoadingIcon isLoading={true} />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
