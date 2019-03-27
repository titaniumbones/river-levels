var request = require('request');
var util = require('util');
request = request.defaults({jar: true});
var rp = require('request-promise');
var cookieJar = request.jar();
var cj = rp.jar();
const rivers =  [{name: "credit", gauge: "02HB029", wiki: "", active: " active", selected: "true"},
                 {name: "moira", gauge: "02HL001",wiki: "", selected: "false"},
                 {name: "grand", gauge: "02GA016", wiki: "", selected: "false"}];


var Cookie = require('request-cookies').Cookie;
var tabHTML = "",
    tabContentHTML ="";
const Handlebars = require('handlebars');
const cheerio = require('cheerio');
const fs = require ('fs');
var disclaimerCookie;
const readFile = util.promisify(fs.readFile);


var initOptions = {
  method: 'POST',
  uri: 'https://wateroffice.ec.gc.ca/disclaimer_e.html',
  form: {
    // Like <input type="text" name="name">
    disclaimer_action: "I Agree"
  },
  // transform: function (body) {
  //   return cheerio.load(body);
  jar: cj,
  simple: false
};

function captureGraphs () {
  rp(initOptions)
    .then(function (body) {
      getImages();
      console.log("rp has run without error");
      console.log(JSON.stringify(body));

    })
    .catch(function (err) {
      console.log("ERROR");
    });
}

 async function getImages () {
   console.log("Cookie Jar: " + JSON.stringify(cj));
   for (r of rivers) {
     let options = {
       jar: cj,
       uri: `https://wateroffice.ec.gc.ca/report/real_time_e.html?stn=${r.gauge}&mean2=1`,
       transform: function (body) {
         fs.writeFile("getimages.html", body);
         return cheerio.load(body);
       }
     };
     let query = await rp(options)
       .then(function(result) {
         //console.log(result.html());
         var image = "https://wateroffice.ec.gc.ca" + result("img")[0].attribs.src;
         console.log("https://wateroffice.ec.gc.ca"+ result("img")[0].attribs.src);
         let fname = `./assets/${r.name}.png`;
         console.log(fname);
         rp(image).pipe(fs.createWriteStream(`./assets/${r.name}.png`));
       })
         .catch(function(err) {
           console.log(err);
         });
   }
}

captureGraphs();

// Now let's build the page


// register the handlebars helper
Handlebars.registerHelper('show', function(options) {
  //console.log(this.active);
  if (this.active) {
    return " show active";
  } else {
    return "";
  }
});

// set up wiki html

async function wikiSetup () {
  for (let r of rivers) {
    let data = await readFile(`./wikihtml/${r.name}.html`, 'utf8');
    // (err, data) => {
    //   if (err) throw err;
    //   //console.log(data);
      r.wiki=data;
      console.log(r.wiki);
      console.log(r.name);
  }
}
var tabContentSource = `<div class="tab-pane fade{{#show}}{{/show}}" id="{{name}}" role="tabpanel" aria-labelledby="{{name}}-tab">
        <div class="card">
         <a href="assets/{{name}}.png" data-toggle="lightbox" data-gallery="graphs" data-title="{{name}} river" data-footer="Discharge in yellow, water height in green, historical mean discharge is the dotted red line.">
          <figure class="d-block mx-auto graph-figure">
            <img alt="graph of water level and discharge rates on the {{name}} river" class="rounded mx-auto d-block figure-img img-fluid" style="max-height:60vh;" src="assets/{{name}}.png"/>
            <figcaption class="figure-caption">Curent Levels on the {{name}}</figcaption>
          </figure>
         </a>
         <div class="wiki">
        {{{wiki}}}
        </div>
        </div>
      </div>
`;

var tabSource = `      <li class="nav-item">
        <a class="nav-link{{active}}" id="{{name}}-tab" data-toggle="tab" href="#{{name}}" role="tab" aria-controls="{{name}}" aria-selected="{{selected}}">{{name}}</a>
      </li>
`;

var tabContentTemplate = Handlebars.compile(tabContentSource),
    tabTemplate = Handlebars.compile(tabSource);

var header= `<!doctype html>
<html lang="en">
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
    <link rel="stylesheet" href="vendor/lightbox/ekko-lightbox.css">
    <title>Southern Ontario Rivers</title>
  </head>
  <body onload="riversInit()">

<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <a class="navbar-brand" href="#">S. O. Rivers</a>
  <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
    <span class="navbar-toggler-icon"></span>
  </button>

  <div class="collapse navbar-collapse" id="navbarSupportedContent">
    <ul class="navbar-nav mr-auto">
    </ul>
  </div>
</nav>

<div class="container">
  <div class="row justify-content-center">

`;

var footer= `</div>
    <script src="https://code.jquery.com/jquery-3.2.1.min.js"  crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>
    <script src="vendor/lightbox/ekko-lightbox.min.js"></script>

    <script>
     $(document).on('click', '[data-toggle="lightbox"]', function(event) {
                event.preventDefault();
                $(this).ekkoLightbox();
            });
    </script>


    
  </body>
</html>
`


async function makePage (){
  
  let w = await wikiSetup();

  var output=header;
  tabHTML=`    <ul class="nav nav-tabs" id="riverTabs" role="tablist">
`;
  tabContentHTML=`    <div class="tab-content clearfix" id="riverTabsContent">
`;
  for (r of rivers) {
    console.log(r.wiki);
    tabHTML+=tabTemplate(r);
    tabContentHTML+=tabContentTemplate(r);
  }
  tabHTML += `    </ul>
`;
  tabContentHTML += `    </div>
`;
  output += tabHTML + tabContentHTML + footer;
  fs.writeFile("index.html", output, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
  
};

makePage();


