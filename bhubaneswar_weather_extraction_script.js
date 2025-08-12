// Google Earth Engine Script: Bhubaneswar Hyperlocal Weather & Static Features Extraction

// --- 1. Define Bhubaneswar City Boundary ---
var BhubaneswarBoundary = ee.FeatureCollection('users/sahityaatripathy/Bhubaneswar_shapefile');

// Visualize city boundary
Map.centerObject(BhubaneswarBoundary, 12);
Map.addLayer(BhubaneswarBoundary, {color: 'blue'}, 'Bhubaneswar BMC Boundary');

// --- 2. Create grid of points within/around the city boundary ---
var rect = BhubaneswarBoundary.geometry().bounds(); // Get the bounding box as an ee.Geometry.Rectangle

// Extract min/max lat/lon using server-side operations
var boundsList = ee.List(rect.coordinates().get(0)); // Get the outer ring of the rectangle (a list of points)
var lonMin_ee = ee.Number(ee.List(boundsList.get(0)).get(0)); // First point's longitude
var latMin_ee = ee.Number(ee.List(boundsList.get(0)).get(1)); // First point's latitude
var lonMax_ee = ee.Number(ee.List(boundsList.get(2)).get(0)); // Third point's longitude (diagonal)
var latMax_ee = ee.Number(ee.List(boundsList.get(2)).get(1)); // Third point's latitude (diagonal)

var gridStep = 0.01; // Finer grid for better spatial coverage (0.01 ~1km)

// Generate sequences of longitudes and latitudes server-side
var lons = ee.List.sequence(lonMin_ee, lonMax_ee, gridStep);
var lats = ee.List.sequence(latMin_ee, latMax_ee, gridStep);

// Create points using server-side map operations
var potentialGridPoints_ee = lons.map(function(lon) {
  return lats.map(function(lat) {
    return ee.Feature(ee.Geometry.Point([lon, lat]), {
      'latitude': lat,
      'longitude': lon
    });
  });
}).flatten();

var allPotentialLocalities = ee.FeatureCollection(potentialGridPoints_ee);
print('Potential grid points (server-side):', allPotentialLocalities.size());
Map.addLayer(allPotentialLocalities, {color: 'orange'}, 'All potential points');

// Buffer for edge inclusion
var bufferMeters = 1000; // 1km buffer for edge points
var bufferedBoundary = BhubaneswarBoundary.geometry().buffer(bufferMeters);

// Filter grid points inside/near the city boundary
var localities = allPotentialLocalities.filterBounds(bufferedBoundary);
print('Grid points inside buffered boundary:', localities.size());
Map.addLayer(localities, {color: 'red'}, 'Filtered grid points');

// --- 3. Add green and water cover (static features) to each locality ---
var bufferSize = 250; // meters for NDVI/NDWI cover calculation
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(BhubaneswarBoundary.geometry())
  .filterDate('2024-04-01', '2024-06-01')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .median();

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndwi = s2.normalizedDifference(['B3', 'B8']).rename('NDWI');

var addCoverFractions = function(pt) {
  var geom = pt.geometry().buffer(bufferSize);

  var ndviMasked = ndvi.gt(0.3);
  var ndviCover = ndviMasked.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geom,
    scale: 10,
    maxPixels: 1e6
  }).get('NDVI');

  var ndwiMasked = ndwi.gt(0.2);
  var waterCover = ndwiMasked.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geom,
    scale: 10,
    maxPixels: 1e6
  }).get('NDWI');

  return pt.set({'green_cover_frac': ndviCover, 'water_cover_frac': waterCover});
};

// Attach static features at the start to avoid repeated calculation
var localitiesWithCover = localities.map(addCoverFractions);
print('Number of localities/grid points (after adding cover):', localitiesWithCover.size());
Map.addLayer(localitiesWithCover, {color: 'green'}, 'Grid Points with Cover Data');

// --- 4. Helper functions for weather variables ---
var calculateRH = function(image) {
  var T_k = image.select('temperature_2m');
  var Td_k = image.select('dewpoint_temperature_2m');
  var T_c = T_k.subtract(273.15);
  var Td_c = Td_k.subtract(273.15);
  var es_t = ee.Image(6.112).multiply(ee.Image(Math.E).pow(ee.Image(17.67).multiply(T_c).divide(T_c.add(243.5))));
  var es_td = ee.Image(6.112).multiply(ee.Image(Math.E).pow(ee.Image(17.67).multiply(Td_c).divide(Td_c.add(243.5))));
  var rh = es_td.divide(es_t).multiply(100);
  return rh.min(100).max(0).rename('relative_humidity');
};

var calculateWindSpeed = function(image) {
  var u = image.select('u_component_of_wind_10m');
  var v = image.select('v_component_of_wind_10m');
  return u.hypot(v).rename('wind_speed_ms');
};

// --- 5. Weather data extraction function for a single hourly image ---
var processImage = function(image) {
  var imageWithNewBands = image
    .addBands(calculateRH(image))
    .addBands(calculateWindSpeed(image));

  var bandsToExtract = [
    'temperature_2m',
    'dewpoint_temperature_2m',
    'total_precipitation_hourly',
    'surface_solar_radiation_downwards_hourly',
    'u_component_of_wind_10m',
    'v_component_of_wind_10m',
    'relative_humidity',
    'wind_speed_ms'
  ];

  var extractedFeatures = imageWithNewBands.select(bandsToExtract).reduceRegions({
    collection: localitiesWithCover,
    reducer: ee.Reducer.first(),
    scale: 1000 // ERA5-Land ~9km, but 1km scale is safe for point sampling
  });

  var dateStr = image.date().format('YYYY-MM-dd');
  var hourVal = image.date().get('hour');

  return extractedFeatures.map(function(feature) {
    var lat = feature.get('latitude');
    var lon = feature.get('longitude');
    var locality_id = ee.Number(lat).format('%.4f').cat('_').cat(ee.Number(lon).format('%.4f'));
    return feature.set({
      'date': dateStr,
      'hour': hourVal,
      'locality_id': locality_id
    });
  });
};

// --- 6. Full data extraction for 2020-01-01 to today in yearly batches ---
var fullStartDate = ee.Date('2020-01-01');
var fullEndDate = ee.Date(Date.now());
var startYear = fullStartDate.get('year').getInfo();
var lastYear = fullEndDate.get('year').getInfo();

for (var year = startYear; year <= lastYear; year++) {
  var yearStart = ee.Date.fromYMD(year, 1, 1);
  var yearEnd = (year == lastYear) ? fullEndDate : ee.Date.fromYMD(year + 1, 1, 1);

  // Filter ERA5-Land collection for this year
  var era5LandHourlyFull = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
    .filterDate(yearStart, yearEnd)
    .filterBounds(BhubaneswarBoundary.geometry());

  // Process all hourly images for this year
  var collectionOfFeatureCollectionsFull = era5LandHourlyFull.map(processImage);
  var finalFeatureCollectionFull = collectionOfFeatureCollectionsFull.flatten();

  print('Feature count for year', year, ':', finalFeatureCollectionFull.size());

  // Export to Drive as CSV (one export per year)
  Export.table.toDrive({
    collection: finalFeatureCollectionFull,
    description: 'Bhubaneswar_Hyperlocal_Weather_' + year + '_GreenWater',
    folder: 'GEE_Exports_Hyperlocal',
    fileNamePrefix: 'bhubaneswar_hyperlocal_weather_greenwater_' + year,
    fileFormat: 'CSV'
  });
}

// Script finished. All export tasks have been initiated (check the Tasks tab in GEE).