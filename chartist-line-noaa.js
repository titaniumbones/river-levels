const thisSpot = abay
function generateTooltip (meta, value) {
  //console.log(meta);
  let info = Chartist.deserialize(meta);
  let p = Chartist.deserialize(meta),
      units = p.wvd ? "m" : "km/h";
  //console.log (p.quality, p.direction,(p.wvd ? "wave" : "wind"), (p.wvd || p.wdir));
  let valArray = value.split(','),
      date = moment(p["Date String"]),
      magnitude = ( p.wvh ? Number(p.wvh) : p.wsp*3.6).toFixed(2);
  let arrow =`<span class="arrow" style="--direction:${Math.trunc(p.direction)};">&darr;</span> `,
      dateSpan = `<span class="chartist-tooltip-value">${date.format('MM-D HH:mm')}</span>`,
      magSpan = `<span>${magnitude} ${units}; coming from: ${Math.trunc( p.direction)}&deg;</span>`,
      text = `<span class="chartist-tooltip-value>${date.format('MM-DD - HH:mm')}<br>${magnitude}</span>`,
      output = `<div class="${p.quality} container">${arrow}<br>${magSpan}<br>${dateSpan}</div>`
  return output
}

async function buildCharts (spot) {
  const rawData = await getJSON('data/pqt-out.csv', 2),
        rawWinds = await getJSON('data/pqt-in.csv', 2),
        processed = processNOAAData(rawData, spot, "wvh"),
        processedWind = processNOAAData(rawWinds, spot, "wsp");
  //console.log("ubilding chart");
  //console.log(processed);
  chart = new Chartist.Line('#waves-chart', {
    series: [
      {name: 'actual-data',
       data: processed
      }
    ]
  }, {
    showArea: true,
    axisX: {
      type: Chartist.FixedScaleAxis,
      divisor: 30,
      labelInterpolationFnc: function(value) {
        return moment(value).format('MM-DD [\n] HH') + ':00';
      }
    },
    targetLine: {
      value: spot.minHeight,
      class: 'ct-target-line'
    },
    plugins: [
      Chartist.plugins.tooltip({
        tooltipFnc: generateTooltip, 
        anchorToPoint: true,
        //metaIsHTML: true
      }),
      Chartist.plugins.ctThreshold({threshold:spot.minHeight})
    ]
    
  });

  // chart.on('draw', function (context) {
  //   console.log(context);
  //   let targetLineY = projectY(context.chartRect, context.bounds, context.options.targetLine.value);
    
    
  //   context.svg.elem('rect', {
  //     x: context.chartRect.x1,
  //     width: context.chartRect.x2 - context.chartRect.x1,
  //     y: targetLineY,
  //     height:  context.chartRect.y1 - targetLineY
  //   }, "no-surf" );

  //   context.svg.elem('line', {
  //     x1: context.chartRect.x1,
  //     x2: context.chartRect.x2,
  //     y1: targetLineY,
  //     y2: targetLineY
  //   }, context.options.targetLine.class);
  // });

   // chart.on('draw', function(data) {
   //   if(data.type === 'line' || data.type === 'area' || data.type == 'path' || data.type == 'rect' || data.type === 'point') {
   //     data.element.animate({
   //       d: {
   //          begin: 1000 * data.index,
   //          dur: 1000,
   //          from: data.path.clone().scale(1, 0).translate(0, data.chartRect.height()).stringify(),
   //           to: data.path.clone().stringify(),
   //            easing: Chartist.Svg.Easing.easeOutQuint
          
   //      }
   //     });
   //   }
   // });
  
  // // This is the bit we are actually interested in. By registering a callback for `draw` events, we can actually intercept the drawing process of each element on the chart.
  // chart.on('draw', function(context) {
  //   console.log(context.type)
  //   // First we want to make sure that only do something when the draw event is for bars. Draw events do get fired for labels and grids too.
  //   if(context.type === 'line' || context.type === 'path' || context.type === 'point') {
  //     console.log(context);
  //     // With the Chartist.Svg API we can easily set an attribute on our bar that just got drawn
  //     context.element.attr({
  //       // Now we set the style attribute on our bar to override the default color of the bar. By using a HSL colour we can easily set the hue of the colour dynamically while keeping the same saturation and lightness. From the context we can also get the current value of the bar. We use that value to calculate a hue between 0 and 100 degree. This will make our bars appear green when close to the maximum and red when close to zero.
  //       style: 'stroke: hsl(' + Math.floor(Chartist.getMultiValue(context.value) / 1.375 * 100) + ', 50%, 50%);'
  //     });
  //   }
  //});

  windsChart = new Chartist.Line('#winds-chart', {
    series: [
      {name: 'wind-data',
       data: processedWind
      }
    ]
  }, {
    showArea: true,
    axisX: {
      type: Chartist.FixedScaleAxis,
      divisor: 30,
      labelInterpolationFnc: function(value) {
        return moment(value).format('MM-DD [\n] HH') + ':00';
      }
    },
    targetLine: {
      value: spot.minHeight,
      class: 'ct-target-line'
    },
    plugins: [
      Chartist.plugins.tooltip({
        tooltipFnc: generateTooltip, 
        anchorToPoint: true,
        //metaIsHTML: true
      }),
      Chartist.plugins.ctThreshold({threshold:spot.minHeight})
    ]
    
  });

windsSegment = new Chartist.SegmentedLine('#winds-segmented', {
    series: [
      {name: 'wind-data',
       data: processedWind
      }
    ]
  }, {
    showArea: true,
    axisX: {
      type: Chartist.FixedScaleAxis,
      divisor: 30,
      labelInterpolationFnc: function(value) {
        return moment(value).format('MM-DD [\n] HH') + ':00';
      }
    },
    plugins: [
      Chartist.plugins.tooltip({
        tooltipFnc: generateTooltip, 
        anchorToPoint: true,
        //metaIsHTML: true
      })]
    
  });

}

function projectY(chartRect, bounds, value) {
  return chartRect.y1 - (chartRect.height() / bounds.max * value)
}

let chart, windChart;
buildCharts(abay);
