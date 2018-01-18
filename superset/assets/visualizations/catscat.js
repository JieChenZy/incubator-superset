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


/**
 * Sorts array of data.
 * Data is expected to have following format:
 * [{values:[{}]}, {values:[{}]}]
 *
 * The sortBy value will be selected from the
 * first element in each of the data's "values" array
 *
 * @param {Array} data The data to sort
 * @param {String} sortBy Attribute to sort by
 */
function sortData(data, sortBy) {
  data.sort((a, b) => +pickFirst(a.values, sortBy) - +pickFirst(b.values, sortBy));
  return data;
}

/**
 *
 *  */
function computeTickInterval(data) {
  const maxValue = d3.max(data);
  const nDigits = maxValue.toString().length;
  let interval = 1;
  for (let i = 0; i < nDigits - 1; i++) {
    interval = 10 * interval;
  }
  return interval/2;
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
    left: 60,
    right: 20,
    bottom: 60,
  };

  const plotWidth = width - (padding.right + padding.left);
  const legendWidth = plotWidth;
  const legendHeight = height * 0.07;
  const xlabelHeight = height * 0.03;
  const plotHeight = height - (padding.top + padding.bottom + legendHeight + xlabelHeight);

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

  // color values are used in creating the legend.
  // we don't need to create the color scale here,
  // as the code is currently written.
  const colorValuesAll = data.map(d => d.values.map(v => v.color));
  const colorValues = d3.set([].concat(...colorValuesAll)).values();
  // const colorScale = d3.scale.ordinal()
  //   .domain(colorValues)
  //   .range(getColorFromScheme);

  const shapeValuesAll = data.map(d => d.values.map(v => v.shape));
  const shapeValues = d3.set([].concat(...shapeValuesAll)).values();
  const shapeScale = d3.scale.ordinal()
    .domain(shapeValues)
    .range(d3.svg.symbolTypes);

  // Currently unused, but we should use it in the yAxis creation below
  const yFormat = d3.format(fd.y_axis_format);

  // In the future, this could be toggled via a control option.
  const displayXAxis = true;

  // Calculate x-axis ticks
  //const xMax = d3.max(xScale.domain());
  //const xTicks = xScale.domain().filter(d => { if (xMax > 100) {return !(d % 100);} else { return !(d % 10); } });
  const interval = computeTickInterval(xScale.domain());
  const xTicks = xScale.domain().filter(d => {return !(d % interval);});

  return {
    padding,
    sortedData,
    plotWidth,
    plotHeight,
    yScale,
    xScale,
    xTicks,
    shapeScale,
    shapeValues,
    colorValues,
    yFormat,
    displayXAxis,
    xlabelHeight,
    legendWidth,
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

  // call to computedProps to setup
  // various values used in creating the vis
  // TODO: would be interesting to have a
  // helper method combine these 'props'
  // with the original values of this function
  // to make a single 'props' object.
  // then the rest of the code would be a bit
  // more react-y.
  const {
    padding,
    sortedData,
    plotHeight,
    plotWidth,
    yScale,
    xScale,
    xTicks,
    displayXAxis,
    shapeScale,
    shapeValues,
    colorValues,
    xlabelHeight,
    legendWidth,
  } = computedProps({ fd, data, width, height });

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
      .attr('transform', `translate(${0},${plotHeight})`)
      .attr('class', 'x axis');

  const legend = g.append('g')
    .attr('class', 'legend');

  // how you add an axis to a chart in d3.
  // api: https://github.com/d3/d3-3.x-api-reference/blob/master/SVG-Axes.md#axis
  yAxis
    .call(d3.svg.axis().scale(yScale).orient('left').tickFormat(d3.format(fd.y_axis_format)));

  if (displayXAxis) {
    xAxis
      .call(d3.svg.axis().scale(xScale).orient('bottom').tickValues(xTicks));
  }
  // add labels to axis  based on form data
  const yLabel = svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', 0 - (plotHeight / 2))
    .attr('y', padding.left / 5)
    .style('text-anchor', 'middle')
    .text(fd.y_axis_label);

  const xLabel = svg.append('text')
    .attr('x', plotWidth / 2)
    .attr('y', padding.top + plotHeight + (xlabelHeight * 1.1))
    .style('text-anchor', 'middle')
    .text(fd.x_axis_label);

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

  // split the legend rendering in a separate function.
  renderLegend(legend, { fd, shapeScale, shapeValues, colorValues, plotHeight, xlabelHeight, legendWidth });
}

/**
 * Render legend into provided D3 selection.
 *
 * @param {Selection} legend D3 selection to render legend into
 * @param {Object} props Properties used to render legend.
 */
function renderLegend(legend, props) {
  const { fd, shapeScale, shapeValues, colorValues } = props;
  const colors = legend.selectAll('.color')
  .data(colorValues);

  const colorsEnter = colors.enter()
    .append('g')
    .classed('key', true)
    .classed('color', true);

  colorsEnter.append('circle')
    .classed('point key-symbol', true)
    .attr('r', 5)
    .attr('fill', d => getColorFromScheme(d, fd.scheme));

  colorsEnter.append('text')
    .classed('key-text', true)
    .attr('x', 10)
    .attr('y', 5)
    .text(d => d);

  const shapes = legend.selectAll('.shape')
    .data(shapeValues);

  const shapesEnter = shapes.enter()
    .append('g')
    .classed('key', true)
    .classed('shape', true);

  shapesEnter.append('path')
    .classed('point key-symbol', true)
    .attr('d', d3.svg.symbol().type(d => shapeScale(d)));

  shapesEnter.append('text')
    .classed('key-text', true)
    .attr('x', 10)
    .attr('y', 5)
    .text(d => d);

  fixUpLegend(legend, props);
}

/**
 * Since we don't know the size of the labels beforehand
 * this function will adjust the position of the legend .keys
 * to not overlap and fit within the space provided.
 *
 * @param {Selection} legend Legend selection
 * @param {Object} props Properties used.
 */
function fixUpLegend(legend, props) {
  const { plotHeight, legendWidth, xlabelHeight } = props;

  const bboxes = [];

  legend
    .attr('transform', `translate(${0}, ${plotHeight + xlabelHeight})`);

  // getBBox is one way to get the width/height of an
  // element in an SVG.
  // https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement
  legend.selectAll('.key')
    .each(function () {
      bboxes.push(d3.select(this).node().getBBox());
    });

  const paddingY = 20;
  const paddingX = 16;
  let currentX = 0;
  let currentY = paddingY;

  const adjustments = [];

  // there are fancier ways to do this,
  // but here we check the next position
  // and move down a row if it will be off
  // screen.
  bboxes.forEach((bbox) => {
    if (currentX + bbox.width >= legendWidth) {
      currentX = 0;
      currentY += paddingY;
    }
    const nextPos = { x: currentX, y: currentY };
    adjustments.push(nextPos);
    currentX += (bbox.width + paddingX);
  });

  // adjust the actual SVG g elements.
  legend.selectAll('.key')
    .attr('transform', (d, i) => `translate(${adjustments[i].x},${adjustments[i].y})`);
}


module.exports = scatCatViz;
