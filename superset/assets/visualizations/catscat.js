import d3 from 'd3';
import d3tip from 'd3-tip';
import { getColorFromScheme } from '../javascripts/modules/colors';

import './catscat.css';
import '../stylesheets/d3tip.css';

/**
 * For a given array, return the value associated with attr from
 * the first element in the array. If the array is empty, return
 * the defaultValue.
 *
 * @param {Array} array Array of values to pick from
 * @param {String} attr Attribute to select
 * @param {Any} defaultValue Value to use if array is empty
 */
function pickFirst(array, attr, defaultValue = null) {
  return array.length > 0 ? array[0][attr] : defaultValue;
}


function sortData(data, sortBy) {
  data.sort((a, b) => +pickFirst(a.values, sortBy) - +pickFirst(b.values, sortBy));
  return data;
}

/**
 * computedProps
 * returns derived properties and functions based on input.
 * Used to conceptually distinguish the 'setting up' of
 * a chart from the actual 'dom manipulation' to create the chart.
 * @param {Object} props : Input properties to use to compute
 * @returns {Object} : Object of computed props.
 */
function computedProps(props) {
  const { fd, data, width, height } = props;
  const padding = {
    top: 20,
    left: 50,
    right: 20,
    bottom: 50,
  };

  const plotWidth = width - (padding.right + padding.left);
  const plotHeight = height - (padding.top + padding.bottom);

  const sortedData = sortData(data, 'color');

  // api: https://github.com/d3/d3-3.x-api-reference/blob/master/Quantitative-Scales.md#linear
  const yMin = d3.min(sortedData, d => d3.min(d.values, v => v.y));
  const yMax = d3.max(sortedData, d => d3.max(d.values, v => v.y));
  const yScale = d3.scale.linear()
    .domain([yMin, yMax])
    .range([plotHeight, 0]);

  // as this is a categorical scatterplot, our x scale will be ordinal. 
  // api: https://github.com/d3/d3-3.x-api-reference/blob/master/Ordinal-Scales.md#ordinal_rangePoints
  const xScale = d3.scale.ordinal()
    .domain(d3.range(sortedData.length))
    .rangePoints([0, plotWidth]);

  // color scale
  const colorValuesAll = data.map(d => d.values.map(v => v.color));
  const colorValues = d3.set([].concat(...colorValuesAll)).values();
  const colorScale = d3.scale.ordinal()
    .domain(colorValues)
    .range(getColorFromScheme);

  const shapeValuesAll = data.map(d => d.values.map(v => v.shape));
  const shapeValues = d3.set([].concat(...shapeValuesAll)).values();
  const shapeScale = d3.scale.ordinal()
    .domain(shapeValues)
    .range(d3.svg.symbolTypes);

  // Currently unused, but we should use it in the yAxis creation below
  const yFormat = d3.format(fd.y_axis_format);

  const displayXAxis = false;

  return {
    padding,
    sortedData,
    plotWidth,
    plotHeight,
    yScale,
    xScale,
    colorScale,
    shapeScale,
    yFormat,
    displayXAxis,
  };
}


/**
 * Main Visualization method.
 * Takes the slice and json objects and
 * modifies DOM to create chart.
 *
 * @param {Object} slice
 * @param {Object} json
 */
function scatCatViz(slice, json) {
  // this removes everything that might already
  // be in the vis's container.
  // There is probably a more elegant way to do this.
  slice.container.html('');
  // D3 selector of our outer container
  // api: https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#d3_select
  const div = d3.select(slice.selector);
  const fd = slice.formData;

  const width = slice.width();
  const height = slice.height();

  // Currently the data is nested so we can
  // easily access both the actual data as well
  // as the yLines array. This could be simplified,
  // or renamed.
  const data = json.data.data;

  // data is an array of objects, with each object having a 'key' and 'values' attribute:
  // [{key: 'group 1', values: [{y: 20, ...}, {}...]}]

  const yLines = json.data.yLines;

  // call to computedProps to setup our padding and scales
  const { padding, sortedData, plotHeight, plotWidth, yScale, xScale, displayXAxis, colorScale, shapeScale } = computedProps({ fd, data, width, height });
  // append a new SVG element to our div container
  // api: https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#append
  const svg = div.append('svg')
    .attr('width', width)
    .attr('height', height);

  // This g is where our chart will be drawn. We move it over to make room for
  // the padding
  // api: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
  const g = svg.append('g')
    .attr('transform', `translate(${padding.left}, ${padding.top})`);

  // axes group elements
  const yAxis = g.append('g')
    .attr('class', 'y axis');

  const xAxis = g.append('g')
      .attr('transform', `translate(${0},${plotHeight + (padding.top / 2)})`)
      .attr('class', 'x axis');

  const legend = g.append('g')
    .attr('class', 'legend');

  // how you add an axis to a chart in d3.
  // api: https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Axes.md#axis
  yAxis
    .call(d3.svg.axis().scale(yScale).orient('left'));

  if (displayXAxis) {
    xAxis
      .call(d3.svg.axis().scale(xScale).orient('bottom'));
  }

  // Super quick tooltip using existing tooltip library
  // api: https://github.com/Caged/d3-tip
  const renderTooltip = (d) => {
    return `
      <div>
        <span>${d.entity}: </span>
        <span>${d.color}: </span>
        <span>${d.shape}: </span>
        <strong>${d.y}</strong>
      </div>
    `;
  };

  const tip = d3tip()
    .attr('class', 'd3-tip')
    .direction('n')
    .offset([-5, 0])
    .html(renderTooltip);
  svg.call(tip);


  // data binding and enter selection
  // for outer data array
  const band = g.selectAll('.band')
    .data(sortedData)
    .enter()
    .append('g')
    .classed('band', true)
    .attr('transform', (d, i) => `translate(${xScale(i)}, ${0})`);

  // data binding and enter selection
  // for each .values array of our data

  band.selectAll('.point')
    .data(d => d.values)
    .enter()
    .append('path')
    .classed('point', true)
    .attr('d', d3.svg.symbol().type(d => shapeScale(d.shape)))
    .attr('transform', d => `translate(${0}, ${yScale(d.y)})`)
    .style('fill', d => getColorFromScheme(d.color, fd.scheme))
    .on('mouseover', function (d) {
      tip.show(d);
    })
    .on('mouseout', function (d) {
      tip.hide(d);
    });
  // d3 symbols: https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Shapes.md#symbol

  // add lines if present
  if (yLines) {
    g.selectAll('.line')
      .data(yLines)
      .enter()
      .append('line')
      .classed('line', true)
      .attr('stroke', 'red')
      .attr('stroke-width', 1.5)
      .attr('x1', 0)
      .attr('x2', plotWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d));
  }
}

module.exports = scatCatViz;
