// 1. Barbados sınırlarını tanımla
var barbados = ee.FeatureCollection('FAO/GAUL/2015/level0')
                 .filter(ee.Filter.eq('ADM0_NAME', 'Barbados'));
Map.centerObject(barbados, 10);
Map.addLayer(barbados, {color: 'red'}, 'Barbados');

// 2. Sentinel-2 verilerini yükle
var sentinel2 = ee.ImageCollection('COPERNICUS/S2')
                   .filterBounds(barbados)
                   .filterDate('2023-01-01', '2023-12-31')
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));
var composite = sentinel2.median();
Map.addLayer(composite, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'Sentinel-2 True Color');

// 3. NDWI hesapla ve plajları ayıkla
var ndwi = composite.normalizedDifference(['B3', 'B8']).rename('NDWI');
Map.addLayer(ndwi, {min: -1, max: 1, palette: ['blue', 'white', 'green']}, 'NDWI');

// NDWI'yi Barbados sınırları içinde sınırla
var beachMask = ndwi.lt(0).and(ndwi.gt(-0.2)).updateMask(ndwi.clip(barbados.geometry()));
Map.addLayer(beachMask.updateMask(beachMask), {palette: ['yellow']}, 'Plaj Alanları');

// 4. Plaj alanlarını vektörize et
var beachVectors = beachMask.reduceToVectors({
  geometry: barbados.geometry(), // Barbados sınırlarını burada tanımlıyoruz
  geometryType: 'polygon',
  reducer: ee.Reducer.countEvery(),
  scale: 10,
  maxPixels: 1e8
});
Map.addLayer(beachVectors, {color: 'yellow'}, 'Beach Polygons');

// 5. Poligonları dışa aktar
Export.table.toDrive({
  collection: beachVectors,
  description: 'Barbados_Beach_Polygons',
  fileFormat: 'GeoJSON'
});
