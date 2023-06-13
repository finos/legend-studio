import { observer } from 'mobx-react-lite';
import {
  type ResultType,
  TDSResultType,
  DataTypeResultType,
} from '@finos/legend-graph';
import { DataTypeResultTypeViewer } from './DataTypeResultTypeViewer.js';
import { TDSResultTypeViewer } from './TDSResultTypeViewer.js';

export const ResultTypeViewer: React.FC<{
  resultType: ResultType;
}> = observer((props) => {
  const { resultType } = props;
  if (resultType instanceof DataTypeResultType) {
    return <DataTypeResultTypeViewer resultType={resultType} />;
  } else if (resultType instanceof TDSResultType) {
    return <TDSResultTypeViewer resultType={resultType} />;
  } else {
    return <></>;
  }
});
