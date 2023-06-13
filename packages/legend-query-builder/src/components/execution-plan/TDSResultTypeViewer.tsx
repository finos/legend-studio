import { observer } from 'mobx-react-lite';
import { PanelListItem, PanelDivider } from '@finos/legend-art';
import {
  PackageableElementImplicitReference,
  type TDSResultType,
} from '@finos/legend-graph';

export const TDSResultTypeViewer: React.FC<{
  resultType: TDSResultType;
}> = observer((props) => {
  const { resultType } = props;

  return (
    <div className="query-builder__result__container">
      <PanelListItem className="query-builder__result__container__item__tds">
        Result type: TDS
      </PanelListItem>
      <PanelDivider />
      {
        <table className="table query-builder__result__container__table">
          <thead>
            <tr>
              <th className="table__cell--left">Label</th>
              <th className="table__cell--left">Result DataType</th>
            </tr>
          </thead>
          <tbody>
            {resultType.tdsColumns.map((column) => (
              <tr key={column.name}>
                <td className="table__cell--left">{column.name}</td>
                <td className="table__cell--left">
                  {column.type instanceof PackageableElementImplicitReference &&
                    (column.type.input ?? '')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      <PanelDivider />
    </div>
  );
});
