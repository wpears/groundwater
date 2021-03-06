
// Include modules That you want to use in your application. The first argument is an array of
// strings identifying the modules to be included and the second argument is a function that gets
// its arguments populated by the return value of the module. Order matters.
require([
  "esri/map",
  "esri/geometry/Extent",
  "esri/geometry/ScreenPoint",
  "esri/geometry/Point",
  "esri/SpatialReference",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/dijit/Scalebar",
  "esri/dijit/BasemapToggle",
  "esri/dijit/InfoWindow",
  "esri/layers/ImageParameters",
  "esri/graphic",
  "esri/geometry/webMercatorUtils",

  "dojo/ready",
  "dojo/_base/Color",
  "dojo/parser",
  "dojo/on",
  "dojo/dom",
  "dojo/dom-class",
  "dojo/query",
  "dojo/store/Memory",
  "dijit/form/ComboBox",
  "esri/dijit/HomeButton",
  
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/layout/TabContainer",
  "dijit/registry",

  "esri/tasks/identify",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",

  "modules/geocode.js",


  "require"
  ], 

function(
   Map,
   Extent,
   ScreenPoint,
   Point,
   SpatialReference,
   ArcGISDynamicMapServiceLayer,
   Scalebar,
   BasemapToggle,
   InfoWindow,
   ImageParameters,
   Graphic,
   wmUtils,

   ready,
   Color,
   parser,
   on,
   dom,
   domClass,
   query,
   Memory,
   ComboBox,
   HomeButton,
  
   MarkerSymbol,
   LineSymbol,
   BorderContainer,
   ContentPane,
   TabContainer,
   registry,

   identify,
   IdentifyTask,
   IdentifyParameters,

   geocode,

   require
   ){

//Disable CORS detection, since services.arcgisonline.com is not CORS enabled
esri.config.defaults.io.corsDetection = false;


  // Fires when the DOM is ready and all dependencies are resolved. Usually needed when using dijits.
  ready(function() {
    var W = window;
    var DOC = document;
    var server = DOC.location.host;
    var serverFolder = server.slice(0,3) === "gis" ? "Public" : "GGI";
    var layers = [];
    var mapPane = dom.byId("centerPane");
    var svgLayer;
    var movers = query(".mov");
    var rp = dom.byId('rp');
    var tabNode = dom.byId('tabNode');
    var layerNode = dom.byId('layerNode');
    var closeButton = dom.byId('closeRP');

    var closeToggle;

    var oldIE =(DOC.all&&!W.atob)?true:false;
    var addDijit;

    var noLayers = [-1];
    var prefix = "https://"+server+"/arcgis/rest/services/" + serverFolder + "/GIC_";
    var suffix = "/MapServer";
    var serviceTypes = ["Change","Elevation","Depth"];
    var serviceNames = ["_Ramp","_Contours","_Points"];

    var depthRadio = dom.byId("radio1");
    var elevRadio = dom.byId("radio2");
    var changeRadio = dom.byId("radio3");

    var measurementCheck = dom.byId("levelMeasurement");
    var contoursCheck = dom.byId("levelContours");
    var rampCheck = dom.byId("levelRamp");
    var checks = query("#activeLayers input");

    var legends = query(".dynamicLegend");
    var pointsLegend = legends[0];
    var contoursLegend = legends[1];
    var rampLegend = legends[2];

    var tabContainer;
    var currentAccPane;

    var totalServices = serviceTypes.length*serviceNames.length;
    var loadedServices = 0;

    var staticServices = {};
    var visibleServiceUrls = {};
    var identifyTasks = {};
    var servicesById = {};

    var changeSpans;
    var changeYears=[];
    var depthYears=[];
    var imageParameters = new ImageParameters({layerIds:[-1],layerOption:ImageParameters.LAYER_OPTION_SHOW});
    

    if(oldIE) fx = require("dojo/_base/fx", function(fx){return fx});
  // Parse widgets included in the HTML. In this case, the BorderContainer and ContentPane.
  // data-dojo -types and -props get analyzed to initialize the application properly.
    parser.parse().then(hookRightPane);

  // Choose your initial extent. The easiest way to find this is to pan around the map, checking the
  // current extent with 'esri.map.extent' in the Javascript console (F12 to open it)
    var initialExtent = new Extent({
	    "xmin" : -13300000,
      "ymin" : 3500000,
      "xmax" : -12800000,
      "ymax" : 5500000, 
	    "spatialReference":{
        "wkid" : 102100
      }
    });


  // Create infoWindow to assign the the map.
  var infoWindow = new InfoWindow('infoWindow');
  infoWindow.startup();
  infoWindow.setTitle('<a id="zoomLink" action="javascript:void(0)">Information at this Point</a>')

  // Create the map. The first argument is either an HTML element (usually a div) or, as in this case,
  // the id of an HTML element as a string. See https://developers.arcgis.com/en/javascript/jsapi/map-amd.html#map1
  // for the full list of options that can be passed in the second argument.
    

	var map = new Map(mapPane, {
      basemap : "topo",
	    extent:initialExtent,
      minZoom:6,
	    maxZoom:12
    });


	var home= new HomeButton({
	  map: map
	}, "homeButton");
	home.startup();
    
	map.setInfoWindow(infoWindow)
  //Once the map is loaded, set the infoWindow's size. And turn it off and on to prevent a flash of
  //unstyled content on the first point click.

    map.on("load", function(){
      map.disableDoubleClickZoom();
      svgLayer = dom.byId("centerPane_gc")
      infoWindow.resize(425,325);
      infoWindow.show(0,0);
      setTimeout(function(){infoWindow.hide()},0);

      var basemapToggle = toggle();
      on(dom.byId("basemapNode"),"mousedown",basemapToggle);
    });

    esri.map = map;


    //initialize and hook up geocoder
    (function(){

      var symbol = new MarkerSymbol(
        MarkerSymbol.STYLE_CIRCLE
        , 10
        , new LineSymbol(LineSymbol.STYLE_SOLID, new Color("#44474d"), 1)
        , new Color("#041222")
        );
      var lastGraphic = null;


      var wrapper = DOC.createElement('div');
      var geocoder = DOC.createElement('input');


      wrapper.className = 'geocoderWrapper';
      geocoder.className = 'geocoder';
      geocoder.autofocus = 'autofocus';

      wrapper.appendChild(geocoder);
      mapPane.appendChild(wrapper);

      geocoder.tabIndex = "1";

      on(geocoder,"keyup",function(e){
        if(e.keyCode === 13){
          clearLastGeocode();
          geocode(geocoder.value,parseGeocoder)
        }else if(e.keyCode === 8 && geocoder.value === ''){
          clearLastGeocode();
        }
      });


      function parseGeocoder(data){
        var dataObj = JSON.parse(data);
        var topResult = dataObj.results[0];
        if(topResult){
          var location = topResult.geometry.location;
          var address = topResult.formatted_address;

          reflectLocationChoice(address)
          showLocation(location)
        }
      }


      function reflectLocationChoice(address){
        return geocoder.value = address;
      }


      function showLocation(location){
        var loc = wmUtils.lngLatToXY(location.lng,location.lat);
        var pnt = new Point(loc, new SpatialReference(102100));

        lastGraphic = new Graphic(pnt,symbol)

        map.graphics.add(lastGraphic);
        map.centerAndZoom(pnt,12);
      }


      function clearLastGeocode(){
        if(lastGraphic){
          map.graphics.remove(lastGraphic);
          lastGraphic = null;
        }
      }


    })();


    var identifyParameters = new IdentifyParameters();
    identifyParameters.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
    identifyParameters.tolerance = 3;
    identifyParameters.returnGeometry = false;

    var serviceDescriptions = {
    };

    var radioNames = {
      Depth : "Depth Below Ground",
      Elevation : "Groundwater Elevation",
      Change : "Change in Groundwater Level"
    }


    function addLoading(check){
      var img = DOC.createElement('img')
      img.className = "loadingImg";
      img.src = "images/loading.gif";
      check.parentNode.insertBefore(img,check)
    }

    function removeLoading(check){
      var p = check.parentNode;
      var prev = check.previousSibling
      if(prev&&prev.tagName === 'IMG')
        p.removeChild(prev)
    }      




function buildChangeYears(layerInfos){
  var yearObj= {};
  forEach(layerInfos,function(info,i){
    var years = extractYears(info.name);
    addYearsFromSpan(yearObj,years);
  })

  for(var year in yearObj){
    changeYears.push({"year":year})
    yearObj[year].sort(sortSpans);
  }
  changeYears.sort(sortYears)
  return yearObj;
}

function buildDepthYears(layerInfos){
  var yearReg = /\d{4}/;
  forEach(layerInfos,function(info,i){
    depthYears.push({"year":info.name.match(yearReg)})
  });
  return depthYears.sort(sortYears);
}


function extractYears(name){
  var arr = name.split("_");
  return [arr[0].slice(1),arr[1].slice(1)]
}


function addYearsFromSpan(yearObj,years){
  var end = years[0];
  var start = years[1];
  var phrase = makeSpanPhrase(start,end);

  ensureKeyExists(yearObj,start);
  ensureKeyExists(yearObj,end);

  yearObj[start].push({span:phrase});
  yearObj[end].push({span:phrase});
}


function ensureKeyExists(obj,year){
  if(obj[year] === undefined) obj[year] = [];
}


function makeSpanPhrase(start, end){
  return start+" to "+end;
}

function sortObj(a,b,key){
  return a[key]-b[key];
}

function sortSpans(a,b){
  return sortObj(a,b,"span")
}
function sortYears(a,b){
  return sortObj(a,b,"year")
}


function setSpanData(year){
  var years = changeSpans[year];
  levelStoreSpan.setData(years)
  levelComboSpan.setValue(years[0].span);
}


function setYearData(radio){
  if(radio === changeRadio){
    levelStoreYr.setData(changeYears);
    if(!checkYear(selectYear.value,changeYears))
      levelComboYr.setValue(changeYears[changeYears.length-1].year);
  }else{
    levelStoreYr.setData(depthYears);
    if(!checkYear(selectYear.value,depthYears))
      levelComboYr.setValue(depthYears[depthYears.length-1].year);
  }
}

function checkYear(year,years){
  for(var i=0;i<years.length;i++){
    if(years[i].year == year) return 1;
  }
  return 0;
}



//essentially copy/pasted from the service, then massaged in non-Bill format (everyone hates the trailing p)
// this could/should be done as a request to the API for the layer list


var levelStoreYr = new Memory({
  data: []
});

var levelStoreSeason = new Memory({
  data: [
    {name:"Spring"}
  ]
});

var levelStoreSpan= new Memory({
  data:[]
});


var levelComboYr = new ComboBox({
        id: "selectYear",
        name: "Year",
        style:{width: "100px"},
        value: "",
        store: levelStoreYr,
        searchAttr: "year"
    },"selectYear");

var levelComboSeason = new ComboBox({
        id: "selectSeason",      
        name: "Season",
        style:{width: "100px"},
        value: "Spring",
        store: levelStoreSeason,
        searchAttr: "name"
    }, "selectSeason");
  
var levelComboSpan= new ComboBox({
        id: "selectSpan",
        name: "Comparison Period",
        style:{width: "125px", align:"center"},
        value: "",
        store: levelStoreSpan,
        searchAttr: "span"
    }, "selectSpan");

var selectSeason=dom.byId("selectSeason");
var selectYear = dom.byId("selectYear");
var selectSpan = dom.byId("selectSpan");
var spanDijit = registry.byId("selectSpan");
 var obj={};
 var arr = [];


  makeService("https://"+server+"/arcgis/rest/services/" + serverFolder + "/GIC_Boundaries/MapServer", "tab2");
  makeService("https://"+server+"/arcgis/rest/services/" + serverFolder + "/Summary_Potential_Subsidence/MapServer","pane3")
  makeService("https://"+server+"/arcgis/rest/services/" + serverFolder + "/Sacramento_Valley_BFW_Map/MapServer", "pane4");
  
  //makeService("https://"+server+"/arcgis/rest/services/" + serverFolder + "/Estimated_Available_Storage/MapServer","pane4")

  makeRadioServices(
    [
      { name:"Domestic"
      , url:"https://"+server+"/arcgis/rest/services/" + serverFolder + "/DomesticWellDepthSummary/MapServer"
      , checked:1
      },
      {
        name:"Production"
      , url:"https://"+server+"/arcgis/rest/services/" + serverFolder + "/ProductionWellDepthSummary1/MapServer"
      }
    ]
    ,"pane2"
    ,"Well Type"
  );

  forEach(serviceTypes,function(type){
    forEach(serviceNames,function(name){
      var url = prefix+type+name+suffix;
      var layer = new ArcGISDynamicMapServiceLayer(url,
            {"imageParameters": imageParameters})

      layer.on('update-end',layerUpdateEnd);

      layer.suspend();
      layers.push(layer)

      staticServices[type+name] = layer;
      identifyTasks[url] = new IdentifyTask(url);

      layer.on('load',function(evt){
        initializeLayers(evt.layer,type,name);
      });

    });
  });

  // Add active layers to map
  map.addLayers(layers);


  function initializeLayers(layer,type,name){
    var key = type+name;
    if(name==="_Points")serviceDescriptions[type] = layer.description;
    if(key==="Change_Points"){
      changeSpans = buildChangeYears(layer.layerInfos);
      
    }else if(key==="Depth_Points"){
      depthYears = buildDepthYears(layer.layerInfos);
    }
    loadedServices++;
    if(loadedServices===totalServices){
      setYearData(changeRadio);
      inputQuery();
      attachInputHandlers();
    }
  }

 //Checkbox controls for pane 1,4



  function makeService(url, id){
    var service = new ArcGISDynamicMapServiceLayer(url, {"imageParameters": imageParameters});
    service.suspend();
    layers.push(service);
    identifyTasks[url] = new IdentifyTask(url);
    servicesById[id] = service;
    on(query("#"+id+" input"), "click", function(){updateLayerVisibility(service,this.parentNode.parentNode)});
    service.on("load",function(e){serviceDescriptions[id] = e.layer.description})
  }


  function makeRadioServices(services, id, dataType){
    var header = DOC.createElement('h3');
    var radioForm = DOC.createElement('form');
    var radios = [];

    header.className = "paneHeadings"
    header.textContent = (dataType || "Data Type")+":";

    function addDesc(e){serviceDescriptions[id] = e.layer.description}

    function switchRadio(e){
      var radio = e.target;
      for(var i=0;i<radios.length;i++){
        if(radios[i] !== radio){
          wipeLayer(servicesById[radios[i].id])
        }
      }
      updateLayerVisibility(servicesById[radio.id],this.parentNode.parentNode);
    }

    for(var i=0; i<services.length;i++){
      var url = services[i].url;
      var name = services[i].name;
      var checked = services[i].checked;
      var currId = id + name;
      var service = new ArcGISDynamicMapServiceLayer(url, {"imageParameters": imageParameters});

      var radio = DOC.createElement('input');
      var label = DOC.createElement('label')
      radio.type="radio";
      radio.id = currId;
      radio.name = id +"radio";
      radio.className = "serviceRadio";
      if(checked) radio.checked = "checked";
      label.textContent = name;
      label.className = "radioLabel";
      label.setAttribute('for',currId);
      radioForm.appendChild(radio);
      radioForm.appendChild(label);
      radioForm.appendChild(DOC.createElement('br'));

      on(radio, "click", switchRadio)

      radios.push(radio)
      services[i].service = service;
      service.suspend();
      layers.push(service);
      identifyTasks[url] = new IdentifyTask(url);
      servicesById[currId] = service;
      service.on("load",addDesc);
    }

    var pane = dom.byId(id);
    pane.insertBefore(radioForm,pane.firstChild);
    pane.insertBefore(header,pane.firstChild);

    on(query("#"+id+" input[type=checkbox]"), "click", function(){
      for(var i=0; i<radios.length;i++){
        if(radios[i].checked){
          updateLayerVisibility(servicesById[radios[i].id],this.parentNode.parentNode);
          break;
        }
      }
    });

  }




  function updateLayerVisibility (service,pane) {
    var inputs = query("input[type='checkbox']",pane);
    var inputCount = inputs.length;
    var visibleLayerIds = [-1]
    //in this application no layer is always on
    for (var i = 0; i < inputCount; i++) {
      if (inputs[i].checked) {
        visibleLayerIds.push(inputs[i].value);
      }
    }
    if(visibleLayerIds.length === 1){
      service.suspend();
      removeVisibleUrl(service.url);
    }else{
      service.resume();
      addVisibleUrl(service.url,service)
    }
    service.setVisibleLayers(visibleLayerIds);
  }

  function wipeLayer(service){
    service.suspend();
    removeVisibleUrl(service.url);
    service.setVisibleLayers([-1]);
  }


  function addVisibleUrl(url,service){
    visibleServiceUrls[url] = service;
  }

  function removeVisibleUrl(url){
    visibleServiceUrls[url] = null;
  }



//Getting layer ID from combobox dropdown selections

function getLayerId(type,key){
  var layerInfos = staticServices[key].layerInfos
  var season = selectSeason.value;
  var year = selectYear.value;
  var span = type === "Change"
           ? selectSpan.value
           : ''
           ;
  return matchLayer(layerInfos,season,year,span);
}

function getLayerName(type,key){
  var layerInfos = staticServices[key].layerInfos;
  var id = getLayerId(type,key);
  if(layerInfos[id])
    return layerInfos[id].name
}

function matchLayer(layerInfos,season,year,span){
  var reg;
  if(span !== ''){
    var spl = span.split(' ');
    var start = spl[0];
    var end = spl[2];
    reg = new RegExp(end + ".*" + start);
  }else{
    reg = new RegExp("("+season+"|"+season[0]+").*"+year)
  }
  for(var i=0; i < layerInfos.length;i++){
    if(reg.test(layerInfos[i].name))
      return i;
  }
}

function getRadio(){
    var type = depthRadio.checked === true
             ? "Depth"
             : elevRadio.checked
               ? "Elevation"
               : "Change"
             ;
    return type;
}

//Query builder for Groundwater Level Change

function inputQuery(){
  var type = getRadio();
  if(type === "Change") spanDijit.attr("disabled",false);
  else spanDijit.attr("disabled",true);

  var checkedServices = getCheckedServices();

  toggleLayers(type,checkedServices);
}

function clearAndQuery(){
  populateFromAcc(accDijit.selectedChildWidget);
  showLegend(this.id)
  clearAllLayers();
  setYearData(this);
  inputQuery();
}

function toggleLayers(type,checkedServices){
  var services = getServicesFromChecks(checkedServices);
  forEach(services,function(name,i){
    var key = type+name;
    var layerId = getLayerId(type,key);
    if(layerId===undefined){
      disableLayer(checks[i])
    }else{
      enableLayer(checks[i])
      if(checkedServices[i])
        showLayer(key,layerId)
      else
        hideLayer(key,layerId)
    }
  })
}

function disableLayer(input){
  input.disabled = true;
  input.checked = false;
  input.parentNode.style.opacity="0.7"
}

function enableLayer(input){
  input.disabled = false;
  input.parentNode.style.opacity="1"
}



function showLayer(serviceName,layerId){
  var service = staticServices[serviceName];
    service.resume();
    service.setVisibleLayers([layerId])
    addVisibleUrl(service.url,service)
}

function hideLayer(serviceName,layerId){
  var service = staticServices[serviceName];
  if(!service.suspended){
    service.setVisibleLayers(noLayers)
    service.suspend();
    removeVisibleUrl(service.url);
  }
}

function clearAllLayers(){
  var checked = getCheckedServices();
  forEach(serviceTypes,function(type){
    var services = getServicesFromChecks(checked);
    forEach(services,function(name, i){
      var key = type+name;
      var layerId = getLayerId(type,key);
      hideLayer(key,layerId)
    })
  })
}

function uncheckLayers(pane){
  var paneChecks = query("input",pane.domNode)
  forEach(paneChecks,function(v){
    if(v.checked&&v.type=="checkbox"){
      v.checked=false;
      on.emit(v, "click",{bubbles:true,cancelable:true})
    }
  })
}


function getCheckedServices(){
  return checks.map(function(node,i){
    return node.checked
  });
}

function getFilteredServices(checkedArray){
  var arr=[];
  forEach(checkedArray,function(checked,i){
    if(checked){
      arr.push(serviceNames[serviceNames.length-i-1])
    }
  })
  return arr;
}

function getServicesFromChecks(checkedArray){
  return checkedArray.map(function(checked,i){
        return serviceNames[serviceNames.length-i-1]
    })
}


function showLegend(id){
  if(id === "radio1"){
    pointsLegend.src = "images/Dynamic_DepthPoints.png";
  contoursLegend.src= "images/Dynamic_DepthContour.png";
  rampLegend.src= "images/Dynamic_DepthRamp.png";
  }else if (id === "radio2"){
    pointsLegend.src = "images/Dynamic_ElevationPoints.png"
  contoursLegend.src= "images/Dynamic_ElevationContour.png";
  rampLegend.src= "images/Dynamic_ElevationRamp.png";

  }else{
    pointsLegend.src = "images/Dynamic_ChangePoints.png";
  contoursLegend.src= "images/Dynamic_ChangeContours.png";
  rampLegend.src= "images/Dynamic_ChangeRamp.png";

  }
}


function yearChange(year){
  setSpanData(year);
  inputQuery();
}

function spanChange(){
  inputQuery();
}

function checkHandler(e){
  var check = e.target;
  if(check.checked) addLoading(check);
  else removeLoading(check);

  inputQuery();
}

function layerUpdateEnd(e){
  var layer = e.target;
  if(layer){
    toggleLoading(getCheckFromLayer(layer))
  }
}

function getCheckFromLayer(layer){
  var arr = layer.url.split('_');
  var type = arr[arr.length-1].split('/')[0];
  switch(type){
    case "Points":
      return measurementCheck;
    case "Contours":
      return contoursCheck;
    case "Ramp":
      return rampCheck;
  }
}

function toggleLoading(check){
  if(check.checked) removeLoading(check);
}

//attach datapane handlers. Called when dijit is loaded.
function attachInputHandlers(){
  on(levelComboYr,"change",yearChange)
  on(levelComboSeason,"change",inputQuery)
  on(levelComboSpan,"change",inputQuery)

  on(depthRadio,"click",clearAndQuery)
  on(elevRadio,"click",clearAndQuery)
  on(changeRadio,"click",clearAndQuery)

  on(measurementCheck,"click", checkHandler)
  on(contoursCheck,"click", checkHandler)
  on(rampCheck,"click", checkHandler)
}


//ie shim
function forEach(arr,fn){
  for(var i=0;i<arr.length;i++){
    fn(arr[i],i,arr)
  }
}






// Add dijits to the application

  //custom basemap toggle
    function toggle(){
      var t = "topo";
      var s = "satellite";
      var g = "gray";
      var src = "http://js.arcgis.com/3.10/js/esri/dijit/images/basemaps/"
      var basemapNode = DOC.createElement('div');
      var basemapPic = DOC.createElement('img');
      var labelWrapper = DOC.createElement('div');
      var basemapLabel = DOC.createElement('span');

      basemapNode.id = "basemapNode";

      labelWrapper.appendChild(basemapLabel)
      basemapNode.appendChild(basemapPic);
      basemapNode.appendChild(labelWrapper);

      centerPane.appendChild(basemapNode);
      setBasemap(t,s);

      function setBasemap(bmap,next){
        basemapPic.src = src + next + ".jpg";
        basemapLabel.textContent = next[0].toUpperCase() + next.slice(1);
        if(map.getBasemap()===bmap) return;
        map.setBasemap(bmap);
      }

      return function(){
        var current = map.getBasemap();
        current === t
        ? setBasemap(s,g)
        : current === s
          ? setBasemap(g,t)
          : setBasemap(t,s)
        ;
      }
    }

 //Tabbed InfoWindow with Identify tool 
 
  var mdX = 0;
  var mdY = 0;
  var lastClick = 0;
  var wasDouble = 0;
  var notMap = 0;

  var tabs = new TabContainer({style:"height:100%;"},'infoTabContainer');
  infoWindow.setContent(tabs.domNode)

infoWindow.on('hide',function(){
  infoWindow.resize(425,325);
})


  on(mapPane,"mousedown",function(e){
    mdX = e.clientX;
    mdY = e.clientY;
    var now = new Date().getTime();

    if(now - lastClick < 300)
      wasDouble = 1;
    else
      wasDouble = 0;

    lastClick = now;

    //if the first click wasn't on the map either, don't first double
    if(wasDouble&&notMap){
      return;
    }

    if(e.target === svgLayer||e.target.id.slice(0,10) ==="centerPane")
      notMap = 0;
    else
      notMap = 1;

    if(wasDouble)
      fireZoom(e);

  });

  on(mapPane,"mouseup",function(e){
    if (notMap) return;
    if(wasDouble){
      return wasDouble = 0;
    }
    if(Math.abs(e.clientX-mdX)<10&&Math.abs(e.clientY-mdY)<10){

      addEventCoordinates(e);
      runIdentify(e);
      setInfoPoint(e);
    }
  })


  function addEventCoordinates(e){
    var  x = e.clientX - centerPane.offsetLeft -1;
    var  y = e.clientY - centerPane.offsetTop -1;

    e.screenPoint = new ScreenPoint(x,y);
    e.mapPoint = map.toMap(e.screenPoint)
  }

  function fireZoom(e){
    addEventCoordinates(e)
    lastClick = 0;
    infoWindow.hide();
    map.centerAndZoom(e.mapPoint,map.getLevel()+1)
  }

  function setInfoPoint(event){
    if(infoWindow.zoomHandler)
      infoWindow.zoomHandler.remove();
    infoWindow.zoomHandler = on(DOC.getElementById('zoomLink'),'click',function(){
      map.centerAndZoom(event.mapPoint,12)
    });
  }
  function runIdentify(event){
    var noneShowing = 1;
    infoWindow.show(event.screenPoint);
    identifyParameters.geometry = event.mapPoint;
    identifyParameters.mapExtent = map.extent;
    identifyParameters.width = map.width;
    identifyParameters.height = map.height;
    forEach(tabs.getChildren(),function(v){tabs.removeChild(v)});

    for(var taskUrl in identifyTasks){
      if(!visibleServiceUrls[taskUrl]) continue;
        noneShowing = 0;
        identifyParameters.layerIds = visibleServiceUrls[taskUrl].visibleLayers;
        identifyTasks[taskUrl].execute(identifyParameters,doProcess(taskUrl))
    }

    if(noneShowing){
      setNoData();
    }
  }

  function doProcess(url){
    return function(results){
      processIdentify(results,url);
    }
  }

  function processIdentify (results,url){
    if(!results.length) return
    forEach(results,function(result){
      var tab = new ContentPane(makePane(result,url))
      tabs.addChild(tab);
    })
    tabs.resize();
  }

  function makePane(result,url){
    var isChange = !!url.match("GIC_Change");
    var activeData = !!url.match(/_Change_|_Depth_|_Elevation_/);
    var title;
    var blurb;
    if(activeData){
      title = getTitle(result,isChange);
      blurb = getBlurb(title,isChange,url);
    }else{
      title = makeSpaced(result.layerName)
      blurb = '';
    }
    var content = makeContent(result.feature.attributes,blurb)

    return{title:title,content:content}
  }



  function getTitle(result,isChange){
    var name = result.layerName;
    var season = name.match(/S|F/);
    if(season[0] === "S") season = "Spring "
    else season = "Fall "

    if(isChange){
      var arr=name.match(/(\d{4}).*(\d{4})/);
      return arr[2] +" to "+arr[1];
    }
    return season+name.match(/\d{4}/)[0]
  }



  function makeContent(attributes,blurb){
    var list = blurb+"<ul>";
    for (var key in attributes){
      if(attributes.hasOwnProperty(key)
        &&key!=="OBJECTID"
        &&key!=="Shape"
        &&key!=="Shape_Area"
        &&key!=="Shape_Length"
        &&key!=="Pixel Value"
        ){
        var spaced = makeSpaced(key)
        list+= "<li><strong>"+spaced+"</strong>: "+getAttributeHTML(attributes[key])+"</li>"
      }
    }
    list +="</ul>"
    return list;
  }



  function makeSpaced(name){
    return name.replace(/_/g," ")
  }



  function getAttributeHTML(value){
    var pboLink = /http:\/\/pboshared\.unavco\.org.*/i;
    var regLink = /(?:^https?|^ftp):\/\//i;
    var hydstraImg = /^<img.*hydstra/i;

    if(pboLink.test(value))
      return makeImage(value);
    else if(regLink.test(value))
      return '<a target="_blank" href="'+value+'">'+value+'</a>'
    else if(hydstraImg.test(value))
      return makeEmbedded(value,0);
    else
      return value;
  }



  function makeImage(link){
    setTimeout(function(){
      infoWindow.resize(560,420);
      tabs.resize();
    },0)
    var image = '<div class="identifyLinkImage" style="background-image:url('+link+')"></div>';
    return '<a target="_blank" href="'+link+'">'+image+'</a>'
  }



  function makeEmbedded(value){
    var urlReg = /src=['"](.*?)['"]/;
    var url = urlReg.exec(value)[1];

    value = value.slice(0,5)+'style="width:512px;height:384px;" '+value.slice(5);

    setTimeout(function(){
      infoWindow.resize(612,500);
      tabs.resize();
    },0)

    return '<a target="_blank" href="'+url+'">'+value+'</a>'
  }



  function getBlurb(title,isChange,url){
    var type;
    if(isChange){
        return "<span>Groundwater change from "+ title+".</span>";
    }else{
      if(url.match("GIC_Elevation"))
        type = "Groundwater elevation measured in "
      else type = "Water depth below ground measured in "
      return "<span>"+ type + name +".</span>"
    }
  }



  function setNoData(){
    var tab = new ContentPane({
        content:"<p>No Data</p>",
        title:"No Data"
      })
      tabs.addChild(tab);
  }




  var closeToggle = function(){
    var showing = 0;
    var arro = dom.byId("arro");

    function showPane(){
      var i = 0, j = movers.length;
      showing = 1;
      arro.style.backgroundPosition = "-32px -16px";
      if(oldIE){
        for(;i<j;i++){
          if(movers[i] === rp)
            fx.animateProperty({node:movers[i], duration:300, properties:{marginRight:0}}).play();
          else fx.animateProperty({node:movers[i], duration:300, properties:{marginRight:285}}).play();
        }
      }else{
        for(;i<j;i++)
          domClass.add(movers[i],"movd");
      }
    }



    function hidePane(){
      var i = 0, j = movers.length;
      showing = 0;
      arro.style.backgroundPosition = "-96px -16px";
      if(oldIE){
        for(;i<j;i++){
        if(movers[i] === rp)
          fx.animateProperty({node:movers[i], duration:250, properties:{marginRight:-285}}).play();
        else fx.animateProperty({node:movers[i], duration:250, properties:{marginRight:0}}).play();
        }
      }else{
        for(;i<j;i++)
          domClass.remove(movers[i],"movd");
      }
    }

    return function(){
      if(showing) hidePane();
      else showPane();
    }
  }();

  on(closeButton,"mousedown", closeToggle);



  function hookRightPane(){
    accDijit = registry.byId("leftAccordion");
    tabContainer = registry.byId("tabContainer");
    currentAccPane = accDijit.selectedChildWidget;

    on(accDijit.domNode,".dijitAccordionTitle:click",accTabClick);
    on(tabContainer.domNode,".dijitTab:click",tabClick)

    populateFromTab();
    dom.byId("borderContainer").style.visibility="visible";

    W.setTimeout(function(){
      on.emit(dom.byId("pane1_button"),"click",{bubbles:true,cancelable:true});
      on.emit(closeButton, "mousedown",{bubbles:true,cancelable:true})
    },300);
  }



  function populateFromTab(){
    var tab = tabContainer.selectedChildWidget;
    if(tab.id === "tab1"){
      populateFromAcc(accDijit.selectedChildWidget);
    }else if(tab.id === "tab2"){
      tabNode.innerHTML = tab.title;
      layerNode.innerHTML = serviceDescriptions.tab2
    }else if(tab.id === "tab3"){
      tabNode.innerHTML = '';
      layerNode.innerHTML = '';
    }
  }



  function populateFromAcc(pane){
    if(pane.id === "pane1"){
      var type = getRadio();
      tabNode.innerHTML = radioNames[type]
      layerNode.innerHTML = serviceDescriptions[type]
    }else{
      tabNode.innerHTML = pane.title;
      layerNode.innerHTML = serviceDescriptions[pane.id]
    }
  }



  function tabClick(e){
    populateFromTab();
    checkDownload();
  }

  function accTabClick(){
    var pane = accDijit.selectedChildWidget;
    clearAllLayers();
    uncheckLayers(currentAccPane);
    populateFromAcc(pane);
    currentAccPane = pane;
    checkDownload();
  }

  function checkDownload(){
    var tab = tabContainer.selectedChildWidget.id;
    var pane = accDijit.selectedChildWidget.id;

    if(tab === "tab3" || tab === "tab1" && pane !== "pane1"){
      downloadNode.style.display = "none";
      layerNode.style.height = DOC.documentElement.offsetHeight - 53 + "px"
    }else{
      downloadNode.style.display="block";
      resetDataHeight();
    }
  }

  function resetDataHeight (){
    layerNode.style.height = DOC.documentElement.offsetHeight - 134 + "px"
  }

  function makeDataZip(key,layer){
    return "downloads/GIC_"+key+"_"+layer+".zip";
  }

  function getDataZips(){
    var type = getRadio();
    var services = getFilteredServices(getCheckedServices());
    var zips = ["downloads/_readme.txt"];
    forEach(services,function(name,i){
      var key = type+name;
      var layerName = getLayerName(type,key);
      if(layerName)
        zips.push(makeDataZip(key,layerName));
    })
    return zips;
  }


  function getServiceZips(id,radio){
    if(radio){
      radio.forEach(function(v){
        if(v.checked) id = v.id;
      })
    }
    var service = servicesById[id];
    var zips = ["downloads/_readme.txt"];
    for(var i =1, len = service.visibleLayers.length;i<len;i++){
      zips.push(makeServiceZip(service.layerInfos[service.visibleLayers[i]].name))
    }
    return zips
  }

  function makeServiceZip(name){
    return "downloads/" + name.split(" ").join("_") + ".zip"
  }


  resetDataHeight();
  on(W,"resize",checkDownload)
  on(dom.byId("downloadLink"),"click",downloadZips)

  function downloadZips(){
    var tabId = tabContainer.selectedChildWidget.id;
    var paneId = accDijit.selectedChildWidget.id;
    if(tabId==="tab1"){
      if(paneId==="pane1"){
        makeDownloads(getDataZips())
      }else{
        if(paneId==="pane2"){
          makeDownloads(getServiceZips(paneId,query("input[type='radio']")))
        }else{
          makeDownloads(getServiceZips(paneId))
        }
      }
    }else{
      makeDownloads(getServiceZips(tabId))
    }
  }


  function makeDownloads(arr){
    if(arr.length>1)
      forEach(arr,makeDownload)
  }

  function makeDownload(url){
    var ifr = DOC.createElement('iframe');
    ifr.style.display="none";

    ifr.onload=function(){
      var ifrDoc = ifr.contentWindow||ifr.contentDocument;
      if(ifrDoc.document) ifrDoc = ifrDoc.document;

      var form = ifrDoc.createElement('form');
      form.action = url;
      form.method = "GET";
      ifrDoc.body.appendChild(form);
      form.submit();
      setTimeout(function(){
        DOC.body.removeChild(ifr);
      },2000);
    }
    
    DOC.body.appendChild(ifr);
  }

  });
});

	
	  
