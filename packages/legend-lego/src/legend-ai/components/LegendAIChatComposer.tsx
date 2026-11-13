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
import { useLayoutEffect, useRef } from 'react';
import {
  LoadingIcon,
  SendIcon,
  SquareIcon,
  UploadIcon,
} from '@finos/legend-art';

const MAX_TEXTAREA_HEIGHT = 160;

/**
 * The chat's input box: the text grows with what is typed, Enter sends and
 * Shift+Enter breaks the line. Stop shows while sending when `onStop` is
 * given. `header` sits above the text (e.g. selected scope pills),
 * `leftSlot` beside the send button (e.g. a scope or model picker).
 */
export const LegendAIChatComposer = (props: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  placeholder: string;
  ariaLabel?: string | undefined;
  onStop?: (() => void) | undefined;
  header?: React.ReactNode;
  leftSlot?: React.ReactNode;
}): React.ReactNode => {
  const {
    value,
    onChange,
    onSend,
    isSending,
    placeholder,
    ariaLabel,
    onStop,
    header,
    leftSlot,
  } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !isSending && Boolean(value.trim());

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }
  }, [value]);

  return (
    <div className="legend-ai__input-area">
      <div className="legend-ai__question-wrapper">
        {header}
        <div className="legend-ai__input-top">
          <textarea
            ref={textareaRef}
            className="legend-ai__question"
            placeholder={placeholder}
            aria-label={ariaLabel}
            rows={1}
            spellCheck={false}
            value={value}
            onChange={(e): void => onChange(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) {
                  onSend();
                }
              }
            }}
          />
        </div>
        <div className="legend-ai__input-bottom">
          <div className="legend-ai__input-bottom-left">{leftSlot}</div>
          <div className="legend-ai__input-bottom-right">
            {isSending && onStop && (
              <button
                type="button"
                title="Stop generation"
                aria-label="Stop generation"
                className="legend-ai__stop-btn"
                onClick={onStop}
              >
                <SquareIcon />
              </button>
            )}
            <button
              type="button"
              title="Send"
              aria-label="Send"
              className="legend-ai__send-btn"
              disabled={!canSend}
              onClick={onSend}
            >
              {isSending ? <LoadingIcon isLoading={true} /> : <SendIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Attach files, for the composer's `leftSlot`. `accept` only narrows the
 * picker; whoever receives the files decides what it takes.
 */
export const LegendAIAttachButton = (props: {
  onFiles: (files: File[]) => void;
  accept?: string | undefined;
  disabled?: boolean | undefined;
  isUploading?: boolean | undefined;
  title?: string | undefined;
}): React.ReactNode => {
  const { onFiles, accept, disabled, isUploading, title } = props;
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={picker}
        type="file"
        multiple={true}
        accept={accept}
        hidden={true}
        aria-label="Files to attach"
        onChange={(event): void => {
          const files = Array.from(event.target.files ?? []);
          // Cleared so picking the same file again still fires.
          event.target.value = '';
          onFiles(files);
        }}
      />
      <button
        type="button"
        className="legend-ai__attach-btn"
        disabled={Boolean(disabled) || Boolean(isUploading)}
        title={title}
        onClick={(): void => picker.current?.click()}
      >
        {isUploading ? <LoadingIcon isLoading={true} /> : <UploadIcon />}
        <span>{isUploading ? 'Uploading…' : 'Attach'}</span>
      </button>
    </>
  );
};
