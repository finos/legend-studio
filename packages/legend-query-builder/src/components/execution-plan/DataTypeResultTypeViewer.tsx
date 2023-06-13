import { observer } from 'mobx-react-lite';
import { PanelListItem, PanelDivider } from '@finos/legend-art';
import {
  PackageableElementImplicitReference,
  type DataTypeResultType,
} from '@finos/legend-graph';

export const DataTypeResultTypeViewer: React.FC<{
  resultType: DataTypeResultType;
}> = observer((props) => {
  const { resultType } = props;
  let type = '';
  if (resultType.type instanceof PackageableElementImplicitReference) {
    type = resultType.type.input ?? '';
  }

  if (type === '') {
    return <></>;
  }

  return (
    <div className="query-builder__result__container">
      <PanelListItem className="query-builder__result__container__item__data-type">
        <>
          <div className="query-builder__result__container__item__data-type__type">
            Result type:
          </div>
          <div className="query-builder__result__container__item__data-type__value">
            {type}
          </div>
        </>
      </PanelListItem>
      <PanelDivider />
    </div>
  );
});
