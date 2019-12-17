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
  fetch (`./descriptions/${river.slug}.md`)
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
  const processed = await processGauge(spot), // CRUCIAL ISSUE HERE! need to intercept this call.
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

async function updateChart (selector, series) {
  document.querySelector(selector).__chartist__.update(series);
}

navigator.serviceWorker.addEventListener('message', event => {
  console.log('message received', event.data);
});

function projectY(chartRect, bounds, value) {
  return chartRect.y1 - (chartRect.height() / bounds.max * value)
}


////////////////////////////////////////////////////////////////////
// service-worker caching magic:                                  //
// try to get from network, but meanwhile display data from cache //
////////////////////////////////////////////////////////////////////

let networkDataReceived = false;

// startSpinner();

// fetch fresh data

async function cacheThenFetch (url, river) {
  let networkDataReceived = false;
  const networkUpdate = fetch(url)
        .then( response => response.json())
        .then( data => {
          networkDataReceived = true;
          // TODO: what's the thing we do after this?  Return the data? 
        })
  caches.match(url).then( (response) => {
    if (!response) throw Error (`No data in cache for ${url}, the network is the only hope.`)
    return response.json();
  }).then( (data) => {
    if (!networkDataReceived) {
      // TODO: what's the thing we do after this? just return the data?
    }
  }).catch( () => networkUpdate)
  .catch(showErrorMessage)

}

// const networkUpdate = fetch('/data.json').then(function(response) {
//   return response.json();
// }).then(function(data) {
//   networkDataReceived = true;
//   updatePage(data);
// });

// // fetch cached data
// caches.match('/data.json').then(function(response) {
//   if (!response) throw Error("No data");
//   return response.json();
// }).then(function(data) {
//   // don't overwrite newer network data
//   if (!networkDataReceived) {
//     updatePage(data);
//   }
// }).catch(function() {
//   // we didn't get cached data, the network is our last hope:
//   return networkUpdate;
// }).catch(showErrorMessage).then(stopSpinner);

function addWarning () {
  const alertSec = document.querySelector(`main .alert`);
  const disclaimer = md.render(`Under heavy development! Lots of features may not work as expected and any data entered here is 
- (a) insecure and 
- (b) likely to be erased soon. 

For more information [Please, Please, Please consult the source code repository](https://github.com/titaniumbones/river-levels).

Please **do not rely on the accuracy of this data!** Sorry/not sorry!!`);
  const attribution = md.render(`Data for the charts on this site comes from a variety of sources, including:
- [Water Office of the Canadian Ministry of the Environment](https://wateroffice.ec.gc.ca/mainmenu/real_time_data_index_e.html)
- [Grand River Conservation Area](https://www.grandriver.ca/en/our-watershed/River-and-stream-flows.aspx)
- [Credit Valley conservation](https://cvc.ca/watershed-science/watershed-monitoring/real-time-monitoring/west-credit-river-belfountain-conservation-area/)\n`)
  const removeButton = `<a class="button error" onclick="removeWarning()">Hide this Warning (it'll return on reload, sorry)</a>`
  alertSec.querySelector(`.disclaimer`).innerHTML += disclaimer;
  alertSec.querySelector(`.attribution`).innerHTML += attribution;
  alertSec.innerHTML += removeButton;
  alertSec.classList.add('active');
}

function removeWarning() {
  document.querySelector(`main .alert`).classList.remove('active');
}
addWarning();
let charts = buildTabs([elora,streetsville, irvine,upperCredit])
    .then( values => values)
  // .then( (all) => setTimeout(openTab({currentTarget: document.querySelector('#grand')}, 'grand'), 10000))
