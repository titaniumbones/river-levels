// global constants for page-level elements
const linkContainer = document.querySelector('#tablist');
const tabContainer = document.querySelector('#tabContainer')

// another global for the md parser
const md = window.markdownit('commonmark', {
  html: true,
  linkify: true});
/* use footnote, attribute and emoji plugins */
md.use(window.markdownItAttrs);


// This tabs code is adapted from https://www.w3schools.com/howto/howto_js_tabs.asp
// It's not super-sophisticated. 


/**
 * Show the relevant tab. This sorta kinda works.  
 * @param {} evt
 * @param {} tabName
 */
function openTab(evt, tabName, tabSelectors={content:'tabcontent', links: 'tablinks', context: document}) {
  // Declare all variables
  let tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = tabSelectors.context.querySelectorAll('.' + tabSelectors.content);
  tabcontent.forEach( tab => tab.classList.remove('active'));

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = tabSelectors.context.querySelectorAll('.' + tabSelectors.links);
  tablinks.forEach( tab => tab.classList.remove('active'));


  // Show the current tab, and add an "active" class to the button that opened the tab
  tabSelectors.context.querySelector('#' + tabName).classList.add('active'); //do this with classes!
  // trigger chartist update event on tab -- mostly for first click, otherwise it doesn't
  // know its size (b/c display:none on start. )
  document.querySelector(`#${tabName} figure`).__chartist__.update()
  console.log(document.querySelector('#' + tabName) );
  evt.currentTarget.className += " active";
} 


// the main tab-building function for *info tabs*
// if we're going to add a journal, those entries will need their own interfaces
// and this fn may need to be renamed.  
async function buildTab (river) {
  linkContainer.innerHTML += `<a class="tablinks"onclick="openTab(event, '${river.slug}')">${river.slug}</a>`;
  const tabcontents = document.createElement('section');
  // tabcontents.style.display = 'none';
  tabcontents.id = river.slug;
  tabcontents.classList += 'tabcontent';
  tabcontents.innerHTML = `<figure class="ct-chart ct-perfect-fourth" id="${river.slug}-chart"><figcaption><h2>Waiting</h2></figcaption></figure>`
  tabContainer.appendChild(tabcontents);
  // tabcontents.style.visibility='hidden'
  const description = document.createElement('section');
  tabcontents.appendChild(description);
  if (river.points) {
    const ps = river.points;
    let pointsMD = `## Map Links\n`
    if (ps.putin) {
      const p = ps.putin;
      const maplink= `https://www.google.com/maps/dir/?api=1&destination=${p[0]},${p[1]}`
      pointsMD += `- [Directions to Put-in](${maplink})\n`
    }
    if (ps.takeout) {
      const p = ps.takeout;
      const maplink= `https://www.google.com/maps/dir/?api=1&destination=${p[0]},${p[1]}`
      pointsMD += `- [Directions to Take-out](${maplink})`
    }

    description.innerHTML += md.render(pointsMD);
  }
  fetch (`./wikihtml/${river.slug}.md`)
    .then( (res) => res.text())
    .then( (markdown) => (markdown.length > 0) ? description.innerHTML += md.render(markdown) : description.innerHTML += md.render( '## Unable to fetch river description, sorry\n\nMaybe it hasn\'t been written yet?'))
    .catch (() => (err) => description.innerHTML +=
            `<h2>Unable to fetch river description, sorry</h2>
<p> Maybe it hasn't been written yet? ${err}</p>`)
  // charts.push(buildChart(m[0], m[1]))
  return buildChart(river, '#' + river.slug + '-chart')
    // .then( ()=> tabcontents.style.display='none' )
}

async function buildTabs (rivers) {
  let allCharts = [];
  for (const r of rivers) {
    allCharts += buildTab(r).then( (c) => {r.chart = c; return c} )
  }
  
  return Promise.all(allCharts).then(resolvedAll => {
    document.querySelector('.tabcontent').classList.add('active');
    return resolvedAll
  });
  // return allPromises
  // Promise.all(allPromises).then( () => openTab({target: document.querySelector('#gorge')}, 'gorge') );
}

function generateTooltip (meta, value) {
  // console.log(meta);
  // console.log('THIS IS THIS', value);
  const p = Chartist.deserialize(meta),
      units = p.units;
  console.log(p, units, value);
  //console.log (p.quality, p.direction,(p.wvd ? "wave" : "wind"), (p.wvd || p.wdir));
  const date = moment(p.data[0]),
      magnitude =  p.data[1].toFixed(2);
  let dateSpan = `<span class="chartist-tooltip-value">${date.format('MM-D HH:mm')}</span>`,
      magSpan = `<span>${magnitude} ${units}; </span>`,
      text = `<span class="chartist-tooltip-value>${date.format('MM-DD - HH:mm')}<br>${magnitude}</span>`,
      output = `<div class="${p.quality} container">${magSpan}<br>${dateSpan}</div>`
  return output
}

async function buildChart (spot, selector='#waves-chart') {
  console.log(spot,selector)
  const processed = await processGauge(spot), // consider using 
        header = document.querySelector(`${selector} figcaption h2`);
  // console.log(spot.units + " THESE ARE UNITS");
  header.innerHTML = `${spot.name} Water Levels (Latest)`

  let chart = new Chartist.SegmentedLine(selector, {
    series: [
      {name: 'Gauge data in CMS',
       data: processed
      }
    ]
  },  {
    scaleMinSpace: 200,
    showArea: true,
    axisX: {
      type: Chartist.FixedScaleAxis,
      divisor: 25,
      labelInterpolationFnc: function(value) {
        return moment(value).format('MM-DD [\n] HH:mm');
      }
    },
    axisY: {scaleMinSpace: 100},
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
  return await chart;
}

function buildCharts () {
  const chartMap = [ [elora, '#elora'], [streetsville, '#lower-credit'], [irvine, '#irvine'], [upperCredit, '#upper-credit'] ]
  charts = []
  for (let m of chartMap) {
    if (! document.querySelector(m[1])) {
      const el = document.createElement('figure');
      el.id = m[1].substr(1);
      
      el.setAttribute('class', 'ct-chart ct-perfect-fourth')
      el.innerHTML='<figcaption><h2></h2></figcaption>'
      document.querySelector('#main').appendChild(el);
    }
    charts.push(buildChart(m[0], m[1]))
  }
}

function projectY(chartRect, bounds, value) {
  return chartRect.y1 - (chartRect.height() / bounds.max * value)
}

let charts
buildTabs([elora,streetsville, irvine,upperCredit])
  // .then( (all) => setTimeout(openTab({currentTarget: document.querySelector('#grand')}, 'grand'), 10000))
