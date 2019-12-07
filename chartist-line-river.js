const linkContainer = document.querySelector('#tablist');
const tabContainer = document.querySelector('#tabContainer')
const md = window.markdownit('commonmark', {
  html: true,
  linkify: true});
/* use footnote, attribute and emoji plugins */
md.use(window.markdownItAttrs);

/**
 * Show the relevanttab.  gotta figure out what the proper classes are
 * @param {} evt
 * @param {} tabName
 */
function openTab(evt, tabName, tabSelectors={content:'tabcontent', links: 'tablinks', context: document}) {
  // Declare all variables
  let tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = tabSelectors.context.querySelectorAll('.' + tabSelectors.content);
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = tabSelectors.context.querySelectorAll('.' + tabSelectors.links);
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.querySelector('#' + tabName).style.display = null ;
  evt.currentTarget.className += " active";
} 

async function buildTab (river) {
  linkContainer.innerHTML += `<a class="tablinks"onclick="openTab(event, '${river.slug}')">${river.slug}</a>`;
  const tabcontents = document.createElement('section');
  tabcontents.id = river.slug;
  tabcontents.classList += 'tabcontent';
  tabcontents.innerHTML = `<figure class="ct-chart ct-perfect-fourth" id="${river.slug}-chart"><figcaption><h2>Waiting</h2></figcaption></figure>`
  tabContainer.appendChild(tabcontents);
  // tabcontents.style.visibility='hidden'
  const description = document.createElement('section');
  tabcontents.appendChild(description);
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
  let allPromises = [];
  for (const r of rivers) {
    allPromises += buildTab(r);
  }
  return Promise.all(allPromises).then(() => allPromises);
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
