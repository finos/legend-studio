import {
  CustomSelectorInput,
  LongArrowRightIcon,
  PURE_ConnectionIcon,
} from '@finos/legend-art';
import {
  type IdentifiedConnection,
  ConnectionPointer,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { ConnectionTestDataState } from '../../../../../stores/editor-state/element-editor-state/service/ServiceTestEditorState';
import { EmbeddedDataEditor } from '../../data-editor/EmbeddedDataEditor';

export const ConnectionTestDataEditor = observer(
  (props: { connectionTestDataState: ConnectionTestDataState }) => {
    const { connectionTestDataState } = props;
    const connectionTestData = connectionTestDataState.connectionData;
    const currentIdentifiedConnection =
      connectionTestDataState.identifiedConnection;
    const currentConnection = currentIdentifiedConnection?.connection;
    const isCurrentConnectionPointer =
      currentConnection instanceof ConnectionPointer;
    const serviceEditorState =
      connectionTestDataState.testSuiteState.serviceTestableState
        .serviceEditorState;
    const options = connectionTestDataState
      .getAllIdentifiedConnections()
      .map((e) => ({
        label: e.id,
        value: e,
      }));
    const selectedOption = options.find(
      (e) => e.value.id === connectionTestData.connectionId,
    ) ?? {
      label: connectionTestData.connectionId,
      value: null,
    };
    const onRuntimeSelectionChange = (val: {
      label: string;
      value?: IdentifiedConnection;
    }): void => {
      if (val.value === undefined) {
        connectionTestData.connectionId = '';
      } else if (val.value !== selectedOption.value) {
        connectionTestData.connectionId = val.value.id;
      }
    };
    const visitConnection = (): void => {
      if (isCurrentConnectionPointer) {
        connectionTestDataState.editorStore.openElement(
          currentConnection.packageableConnection.value,
        );
      }
    };
    return (
      <div className="service-test-data-editor">
        <div className="service-test-data-editor__connection">
          <div>
            <div className="panel__content__form__section__header__label">
              Connection
            </div>
            <div className="panel__content__form__section__header__prompt">
              Connection to construct with the mock embedded data.
            </div>
          </div>
          <div className="service-test-data-editor__connection__value">
            <div className="btn--sm service-test-data-editor__connection__value__label">
              <PURE_ConnectionIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown service-test-data-editor__connection__value__dropdown"
              disabled={serviceEditorState.isReadOnly}
              options={options}
              onChange={onRuntimeSelectionChange}
              value={selectedOption}
              darkMode={true}
            />
            <button
              className="btn--dark btn--sm service-test-data-editor__connection__value-btn"
              onClick={visitConnection}
              disabled={!isCurrentConnectionPointer}
              tabIndex={-1}
              title={'See connection'}
            >
              <LongArrowRightIcon />
            </button>
          </div>
        </div>
        <div className="service-test-data-editor__data">
          <EmbeddedDataEditor
            isReadOnly={serviceEditorState.isReadOnly}
            embeddedDataEditorState={
              connectionTestDataState.embeddedEditorState
            }
          />
        </div>
      </div>
    );
  },
);
