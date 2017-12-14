/* eslint-disable global-require */
const vizMap = {
  area: require('./nvd3_vis.js'),
  bar: require('./nvd3_vis.js'),
  big_number: require('./big_number.js'),
  big_number_total: require('./big_number.js'),
  box_plot: require('./nvd3_vis.js'),
  bubble: require('./nvd3_vis.js'),
  catscat: require('./catscat.js'),
  bullet: require('./nvd3_vis.js'),
  cal_heatmap: require('./cal_heatmap.js'),
  compare: require('./nvd3_vis.js'),
  directed_force: require('./directed_force.js'),
  chord: require('./chord.jsx'),
  dist_bar: require('./nvd3_vis.js'),
  filter_box: require('./filter_box.jsx'),
  heatmap: require('./heatmap.js'),
  histogram: require('./histogram.js'),
  horizon: require('./horizon.js'),
  iframe: require('./iframe.js'),
  line: require('./nvd3_vis.js'),
  time_pivot: require('./nvd3_vis.js'),
  mapbox: require('./mapbox.jsx'),
  markup: require('./markup.js'),
  para: require('./parallel_coordinates.js'),
  pie: require('./nvd3_vis.js'),
  pivot_table: require('./pivot_table.js'),
  sankey: require('./sankey.js'),
  separator: require('./markup.js'),
  sunburst: require('./sunburst.js'),
  table: require('./table.js'),
  time_table: require('./time_table.jsx'),
  treemap: require('./treemap.js'),
  country_map: require('./country_map.js'),
  word_cloud: require('./word_cloud.js'),
  world_map: require('./world_map.js'),
  dual_line: require('./nvd3_vis.js'),
  event_flow: require('./EventFlow.jsx'),
  paired_ttest: require('./paired_ttest.jsx'),
  partition: require('./partition.js'),
  deck_scatter: require('./deckgl/scatter.jsx'),
  deck_screengrid: require('./deckgl/screengrid.jsx'),
  deck_grid: require('./deckgl/grid.jsx'),
  deck_hex: require('./deckgl/hex.jsx'),
};
export default vizMap;
