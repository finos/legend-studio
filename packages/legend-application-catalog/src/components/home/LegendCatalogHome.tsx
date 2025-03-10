import { observer } from 'mobx-react-lite';
import { LegendCatalogHeader } from '../header/LegendCatalogHeader.js';

export const LegendCatalogHome = observer(() => {
  return (
    <div className="app__page">
      <div className="legend-catalog-home">
        <div className="legend-catalog-home__body">
          <LegendCatalogHeader />
          <div className="legend-catalog-home__content">
            <div className="legend-catalog-home__content__title">
              Welcome to Legend Catalog
            </div>
            <div className="legend-catalog-home__content__description">
              <p>
                Legend Catalog is a WIP. Please check back in the future for
                updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
