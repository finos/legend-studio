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

import {
  CaretDownIcon,
  CaretRightIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  type CubeJsonNode,
  formatCubeJsonPretty,
} from '../../stores/variant/CubeJson.js';
import { CUBE_PRIMARY_BUTTON_DARK_MODE } from '../CubeDialogTheme.js';

/** Levels open when the dialog opens: the document and its first fields */
const OPEN_DEPTH = 2;

/** What a closed object or array holds, e.g. `{2 keys}`, `[3 items]` */
const summarize = (node: CubeJsonNode): string =>
  node.kind === 'object'
    ? `{${node.entries.length} ${node.entries.length === 1 ? 'key' : 'keys'}}`
    : node.kind === 'array'
      ? `[${node.items.length} ${node.items.length === 1 ? 'item' : 'items'}]`
      : '';

/** A scalar, coloured by its kind: strings quoted, numbers as written */
const CubeJsonScalar: React.FC<{ node: CubeJsonNode }> = ({ node }) =>
  node.kind === 'string' ? (
    <span className="break-all text-[var(--color-category-enumeration)]">
      {JSON.stringify(node.value)}
    </span>
  ) : node.kind === 'number' ? (
    <span className="text-[var(--color-category-primitive)]">{node.text}</span>
  ) : node.kind === 'boolean' ? (
    <span className="text-[var(--color-category-class)]">
      {String(node.value)}
    </span>
  ) : (
    <span className="text-[var(--color-text-muted)]">null</span>
  );

/** One entry of the tree: its key or index, and its value, open or closed */
const CubeJsonTreeNode: React.FC<{
  label: string | undefined;
  node: CubeJsonNode;
  depth: number;
}> = ({ label, node, depth }) => {
  const [open, setOpen] = useState(depth < OPEN_DEPTH);
  const children =
    node.kind === 'object'
      ? node.entries.map(([key, value]) => [key, value] as const)
      : node.kind === 'array'
        ? node.items.map((item, index) => [`[${index}]`, item] as const)
        : undefined;
  const name =
    label === undefined ? undefined : (
      <span className="font-medium text-[var(--color-text-primary)]">
        {label}:{' '}
      </span>
    );
  if (!children) {
    return (
      <div className="py-px pl-5 font-mono text-sm">
        {name}
        <CubeJsonScalar node={node} />
      </div>
    );
  }
  return (
    <div className="font-mono text-sm">
      <button
        type="button"
        className="flex items-center gap-1 py-px text-left hover:bg-[var(--color-bg-hover)]"
        aria-expanded={open}
        aria-label={`${open ? 'Close' : 'Open'} ${label ?? 'the document'}`}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <CaretDownIcon aria-hidden={true} />
        ) : (
          <CaretRightIcon aria-hidden={true} />
        )}
        {name}
        <span className="text-[var(--color-text-secondary)]">
          {summarize(node)}
        </span>
      </button>
      {open && (
        <div className="ml-2 border-l border-[var(--color-border-subtle)] pl-2">
          {children.map(([key, value]) => (
            <CubeJsonTreeNode
              key={key}
              label={key}
              node={value}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Open JSON (PLAN §11.20): a Variant cell's document as a tree, each object
 * and array open to `OPEN_DEPTH` and opened or closed by a click, with Copy
 * JSON (indented, numbers as written); text that isn't JSON is shown as it is
 */
export const CubeJsonViewerDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const viewer = editorState.jsonViewer;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const document = viewer.document;
    const copy = (): void => {
      const text = document
        ? formatCubeJsonPretty(document)
        : (viewer.text ?? '');
      applicationStore.clipboardService
        .copyTextToClipboard(text)
        .catch(applicationStore.alertUnhandledError);
    };
    return (
      <Dialog open={viewer.isOpen} onClose={() => viewer.close()}>
        <Modal darkMode={darkMode} className="w-[720px] max-w-full">
          <ModalHeader>
            <div className="modal__title">{`JSON of ${viewer.column ?? ''}`}</div>
          </ModalHeader>
          <ModalBody>
            <div
              className="max-h-[60vh] overflow-auto rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-2"
              aria-label="JSON document"
              data-testid={LEGEND_CUBE_TEST_ID.JSON_VIEWER}
            >
              {document ? (
                <CubeJsonTreeNode
                  key={viewer.text}
                  label={undefined}
                  node={document}
                  depth={0}
                />
              ) : (
                <div className="break-all font-mono text-sm">{viewer.text}</div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={CUBE_PRIMARY_BUTTON_DARK_MODE}
              formatText={false}
              text="Copy JSON"
              onClick={copy}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Close"
              onClick={() => viewer.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
