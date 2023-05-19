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

import { observer } from 'mobx-react-lite';
import { extractAnnotatedElementDocumentation } from '@finos/legend-graph';
import {
  BlankPanelContent,
  TreeView,
  type TreeNodeContainerProps,
  type TreeNodeViewProps,
  clsx,
  TimesIcon,
} from '@finos/legend-art';
import { isNonNullable, noop, prettyCONSTName } from '@finos/legend-shared';
import {
  UnsupportedFieldNode,
  type ProtocolValueBuilderState,
  type ProtocolValueFieldNode,
  StringFieldNode,
  OptionalStringFieldNode,
} from '../../../stores/editor/editor-state/element-editor-state/ProtocolValueBuilderState.js';

const UnsupportedFieldEditor = observer(
  (
    props: TreeNodeContainerProps<
      UnsupportedFieldNode,
      { builderState: ProtocolValueBuilderState }
    >,
  ) => {
    const { node } = props;
    const property = node.property;
    const documentation = extractAnnotatedElementDocumentation(property);

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {prettyCONSTName(property.name)}
        </div>
        {documentation && (
          <div className="panel__content__form__section__header__prompt">
            {documentation}
          </div>
        )}
        <div>unsupported</div>
      </div>
    );
  },
);

const StringFieldEditor = observer(
  (
    props: TreeNodeContainerProps<
      StringFieldNode,
      { builderState: ProtocolValueBuilderState }
    >,
  ) => {
    const { node } = props;
    const property = node.property;
    const documentation = extractAnnotatedElementDocumentation(property);

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {prettyCONSTName(property.name)}
        </div>
        {documentation && (
          <div className="panel__content__form__section__header__prompt">
            {documentation}
          </div>
        )}
        <input
          className="panel__content__form__section__input"
          spellCheck={false}
          value={node.value}
          onChange={(event) => node.setValue(event.target.value)}
        />
      </div>
    );
  },
);

const OptionalStringFieldEditor = observer(
  (
    props: TreeNodeContainerProps<
      OptionalStringFieldNode,
      { builderState: ProtocolValueBuilderState }
    >,
  ) => {
    const { node } = props;
    const property = node.property;
    const documentation = extractAnnotatedElementDocumentation(property);

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {prettyCONSTName(property.name)}
        </div>
        {documentation && (
          <div className="panel__content__form__section__header__prompt">
            {documentation}
          </div>
        )}
        <div className="panel__content__form__section__input__container">
          <input
            className="panel__content__form__section__input"
            spellCheck={false}
            value={node.value ?? ''}
            placeholder={node.value === undefined ? '(empty)' : undefined}
            onChange={(event) => node.setValue(event.target.value)}
          />
          <button
            className="panel__content__form__section__input__reset-btn"
            tabIndex={-1}
            onClick={() => node.setValue(undefined)}
            title="Reset"
          >
            <TimesIcon />
          </button>
        </div>
      </div>
    );
  },
);

const ProtocolValueFieldEditor = observer(
  (
    props: TreeNodeContainerProps<
      ProtocolValueFieldNode,
      { builderState: ProtocolValueBuilderState }
    >,
  ) => {
    const { node } = props;

    if (node instanceof UnsupportedFieldNode) {
      return <UnsupportedFieldEditor {...props} node={node} />;
    } else if (node instanceof StringFieldNode) {
      return <StringFieldEditor {...props} node={node} />;
    } else if (node instanceof OptionalStringFieldNode) {
      return <OptionalStringFieldEditor {...props} node={node} />;
    }
    return null;
  },
);

const ProtocolValueNodeView = observer(
  (
    props: TreeNodeViewProps<
      ProtocolValueFieldNode,
      {
        builderState: ProtocolValueBuilderState;
      }
    >,
  ) => {
    const { node, level, getChildNodes, classPrefix } = props;
    const childNodes = getChildNodes(node);
    if (!childNodes.length) {
      return <ProtocolValueFieldEditor {...props} />;
    }
    return (
      <div
        className={clsx('tree-view__node__block panel__content__form', {
          [`${classPrefix}__tree-view__node__block`]: classPrefix,
        })}
      >
        <ProtocolValueFieldEditor {...props} level={level + 1} />
        {node.isOpen &&
          childNodes.map((childNode) => (
            <ProtocolValueNodeView {...props} key={childNode.id} />
          ))}
      </div>
    );
  },
);

export const ProtocolValueBuilder = observer(
  (props: { builderState: ProtocolValueBuilderState }) => {
    const { builderState } = props;
    const treeData = builderState.treeData;
    const getChildNodes = (
      node: ProtocolValueFieldNode,
    ): ProtocolValueFieldNode[] => {
      if (!node.childrenIds.length || !treeData) {
        return [];
      }
      return node.childrenIds
        .map((childId) => treeData.nodes.get(childId))
        .filter(isNonNullable);
    };

    if (!treeData) {
      return (
        // TODO: show a JSON editor
        <BlankPanelContent>{`Can't display form editor`}</BlankPanelContent>
      );
    }
    return (
      <TreeView
        className="protocol-value-builder panel__content__form"
        components={{
          TreeNodeContainer: ProtocolValueFieldEditor,
          TreeNodeView: ProtocolValueNodeView,
        }}
        treeData={treeData}
        onNodeSelect={noop()}
        getChildNodes={getChildNodes}
        innerProps={{
          builderState,
        }}
      />
    );
  },
);
