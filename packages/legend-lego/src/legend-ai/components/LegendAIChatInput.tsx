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

import { useRef, useEffect, useState, useMemo } from 'react';
import { SparkleStarsIcon, CheckIcon, clsx } from '@finos/legend-art';
import {
  type LegendAIChatState,
  type LegendAIScopeItem,
  LEGEND_AI_DEFAULT_MODEL_LABEL,
} from '../LegendAITypes.js';
import { LegendAIScopeSelector } from './LegendAIScopeSelector.js';
import { LegendAIChatComposer } from './LegendAIChatComposer.js';

export const LegendAIChatInput = (props: {
  state: LegendAIChatState;
  scopes: LegendAIScopeItem[];
}): React.ReactNode => {
  const { state, scopes } = props;
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const modelLabel = useMemo(() => {
    const modelName = state.selectedModelName ?? LEGEND_AI_DEFAULT_MODEL_LABEL;
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
        event.target instanceof Node &&
        !modelDropdownRef.current.contains(event.target)
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

  return (
    <LegendAIChatComposer
      value={state.questionText}
      onChange={state.setQuestionText}
      onSend={(): void => state.askQuestion()}
      onStop={(): void => state.stopGeneration()}
      isSending={state.isSending}
      placeholder="Ask anything about your data..."
      header={
        state.selectedScopes.length > 0 && (
          <LegendAIScopeSelector
            scopes={scopes}
            selectedScopes={state.selectedScopes}
            onToggleScope={state.toggleScope}
            onRemoveScope={state.removeScope}
            hideSelector={true}
          />
        )
      }
      leftSlot={
        <>
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
                <span className="legend-ai__model-btn-label">{modelLabel}</span>
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
        </>
      }
    />
  );
};
