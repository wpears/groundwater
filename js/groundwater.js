
// Include modules That you want to use in your application. The first argument is an array of
// strings identifying the modules to be included and the second argument is a function that gets
// its arguments populated by the return value of the module. Order matters.
require([
  "esri/map",
  "esri/geometry/Extent",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/FeatureLayer",
  "esri/dijit/Scalebar",
  "esri/dijit/BasemapToggle",
  "esri/dijit/InfoWindow",
  "esri/dijit/Legend",
  "esri/TimeExtent", 
  "esri/dijit/TimeSlider",
  "esri/layers/ImageParameters",
  "dijit/registry",
  
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
  
  "modules/measuretool.js",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/layout/TabContainer",
  "dijit/form/CheckBox",

  "esri/tasks/identify",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",

  "require"
  ], 

function(
   Map,
   Extent,
   ArcGISDynamicMapServiceLayer,
   FeatureLayer,
   Scalebar,
   BasemapToggle,
   InfoWindow,
   Legend,
   TimeExtent, 
   TimeSlider,
   ImageParameters,
   registry,

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

   MeasureTool,
   SimpleLineSymbol,
   SimpleMarkerSymbol,   
   BorderContainer,
   ContentPane,
   TabContainer,
   CheckBox,

   identify,
   IdentifyTask,
   IdentifyParameters,
   require
   ){

//Disable CORS detection, since services.arcgisonline.com is not CORS enabled
esri.config.defaults.io.corsDetection = false;


  // Fires when the DOM is ready and all dependencies are resolved. Usually needed when using dijits.
  ready(function() {
    var W = window;
    var DOC = document;
    var layers = [];
    var movers = query(".mov");
    var rp = dom.byId('rp');
    var tabNode = dom.byId('tabNode');
    var layerNode = dom.byId('layerNode');
    var closeButton = dom.byId('closeRP');
    var arro = dom.byId("arro");
    var showing = 0;
    var oldIE =(DOC.all&&!W.atob)?true:false;
    

    if(oldIE) fx = require("dojo/_base/fx", function(fx){return fx});
  // Parse widgets included in the HTML. In this case, the BorderContainer and ContentPane.
  // data-dojo -types and -props get analyzed to initialize the application properly.
    parser.parse().then(hookRightPane);

  // Choose your initial extent. The easiest way to find this is to pan around the map, checking the
  // current extent with 'esri.map.extent' in the Javascript console (F12 to open it)
    var initialExtent = new Extent({
	  xmin : -13300000,
      ymin : 3500000,
      xmax : -12800000,
      ymax : 5500000, 
	  spatialReference:{
        wkid : 102100
      }
    });

	
	

  // Create infoWindow to assign the the map.
  var infoWindow = new InfoWindow('infoWindow');
  infoWindow.startup();
  infoWindow.setTitle('<a id="zoomLink" action="javascript:void(0)">Information at this Point</a>')
window.iw=infoWindow;
  // Create the map. The first argument is either an HTML element (usually a div) or, as in this case,
  // the id of an HTML element as a string. See https://developers.arcgis.com/en/javascript/jsapi/map-amd.html#map1
  // for the full list of options that can be passed in the second argument.
    

	var map = new Map("centerPane", {
      basemap : "topo",
	    extent:initialExtent,
      infoWindow:infoWindow,
      minZoom:6,
	    maxZoom:12,
	
    });
            
	var home= new HomeButton({
	  map: map,
	}, "homeButton");
	home.startup();
    
	
	
  //Once the map is loaded, set the infoWindow's size. And turn in off and on to prevent a flash of
  //unstyled content on the first point click. This is a bug in the API.
  
      map.on("load", function(){
      infoWindow.resize(425,325);
      infoWindow.show(0,0);
      setTimeout(function(){infoWindow.hide()},0);
    });


  // Expose the map as part of the esri global object. Useful for debugging and trying out modifications to
  // the map object directly in the console. This could also be done by creating a variable outside of the
  // require statement, but it can be dangerous creating too many global variables (especially with common
  // names), as they can 'collide', leaving you with a variable pointing to the wrong object.
    esri.map = map;


    var identifyParameters = new IdentifyParameters();
    identifyParameters.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
    identifyParameters.tolerance = 3;
    identifyParameters.returnGeometry = false;

    var accordionTabs = {
      "pane1" : "Measurements of Depth Below Ground and Groundwater Elevation, and Groundwater Change",
      "pane2" : "Base of Fresh Groundwater",
      "pane3" : "Subsidence",
	  "pane4" : "Estimated Available Storage"
    };
    function hookRightPane(){
      var acc = registry.byId("leftAccordion");
      function populate(e){
        tabNode.innerHTML = accordionTabs[acc.selectedChildWidget.id]
      }
      on(acc.domNode,".dijitAccordionTitle:click",populate);
      populate();
      DOC.body.style.visibility="visible";
      W.setTimeout(function(){
        on.emit(dom.byId("pane1_button"),"click",{bubbles:true,cancelable:true});
      },300);

    }
       




function buildChangeYears(layerObj){
  var yearObj= {};
  for (var name in layerObj){
    var years = extractYears(name);
    addYearsFromSpan(yearObj,years);
  }

  for(var year in yearObj){
    yearObj[year].sort(sortSpans);
  }
  return yearObj;
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

function sortSpans(a,b){
  return a.span-b.span;
}

function setSpanData(year){
  var years = changeYears[year];
  levelStoreSpan.setData(years)
  levelComboSpan.setValue(years[0].span);
}


//essentially copy/pasted from the service, then massaged in non-Bill format (everyone hates the trailing p)
// this could/should be done as a request to the API for the layer list
var rawServiceObj ={
  S2012_S2002_p : 0,
  S2012_S2007_p : 1,
  S2012_S2009_p : 2,
  S2012_S2011_p : 3,
  S2013_S2003_p : 4,
  S2013_S2008_p : 5,
  S2013_S2010_p : 6,
  S2013_S2012_p : 7,
  S2014_S2004_p : 8,
  S2014_S2009_p : 9,
  S2014_S2011_p : 10,
  S2014_S2013_p : 11
};

//Object that is searched to match layer ID in Groundwater Level Change Service
var changeObj = {
  "2002 to 2012" : 0,
  "2007 to 2012" : 1,
  "2009 to 2012" : 2,
  "2011 to 2012" : 3,
  "2003 to 2013" : 4,
  "2008 to 2013" : 5,
  "2010 to 2013" : 6,
  "2012 to 2013" : 7,
  "2004 to 2014" : 8,
  "2009 to 2014" : 9,
  "2011 to 2014" : 10,
  "2013 to 2014" : 11
};

var changeYears = buildChangeYears(rawServiceObj);

//Object that is searched to match layer ID in Groundwater Level Measurements Service
var measurementObj = {
  "Spring 2013":0,
  "Spring 2014":1 
};



  
var levelStoreYr = new Memory({
  data: [
    {name:"2013", id:"0"},
    {name:"2014", id:"1"}
  ]
});

var levelStoreSeason = new Memory({
  data: [
    {name:"Spring", id:"0"}
  ]
});

var levelStoreSpan= new Memory({
  data:[]
});


var levelComboYr = new ComboBox({
        id: "selectYear",
        name: "Year",
        style:{width: "100px"},
        value: "2013",
        store: levelStoreYr,
        searchAttr: "name"
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

setSpanData("2013");

//Set variables for queries in accordian panes


  var staticServices = {};
  var visibleServiceUrls = {};
  var identifyTasks = {};
  //Use the ImageParameters to set the visibleLayerIds layers in the map service during ArcGISDynamicMapServiceLayer construction.
  var imageParameters = new ImageParameters({layerIds:[-1],layerOption:ImageParameters.LAYER_OPTION_SHOW});
  //layerOption can also be: LAYER_OPTION_EXCLUDE, LAYER_OPTION_HIDE, LAYER_OPTION_INCLUDE


  makeService("http://mrsbmweb21157/arcgis/rest/services/GGI/GIC_Boundaries/MapServer", "#tab2");
  makeService("http://mrsbmweb21157/arcgis/rest/services/GGI/Sacramento_Valley_BFW_Map/MapServer", "#pane2");
  makeService("http://mrsbmweb21157/arcgis/rest/services/GGI/Summary_Potential_Subsidence/MapServer","#pane3")
  makeService("http://mrsbmweb21157/arcgis/rest/services/GGI/Estimated_Available_Storage/MapServer","#pane4")

  var noLayers = [-1];
  var prefix = "http://mrsbmweb21157/arcgis/rest/services/GGI/GIC_";
  var suffix = "/MapServer";
  var serviceTypes = ["Change","Elevation","Depth"];
  var serviceNames = ["_Ramp","_Contours","_Points"];

  var depthRadio = dom.byId("radio1");
  var elevRadio = dom.byId("radio2");
  var changeRadio = dom.byId("radio3");


  var selectSeason=dom.byId("selectSeason");
  var selectYear = dom.byId("selectYear");
  var selectSpan = dom.byId("selectSpan");
  var spanDijit = registry.byId("selectSpan");

  var checks = query("#activeLayers input");
  var pointsLegend = dom.byId("dynamicPtsLeg");



  forEach(serviceTypes,function(type){
    forEach(serviceNames,function(name){
      var url = prefix+type+name+suffix;
      var layer = new ArcGISDynamicMapServiceLayer(url,
            {"imageParameters": imageParameters});
      layer.suspend();
      layers.push(layer)
      staticServices[type+name] = layer;
      identifyTasks[url] = new IdentifyTask(url);
    })
  })

 
 //Checkbox controls for pane 1,4



  function makeService(url, id){
    var service = new ArcGISDynamicMapServiceLayer(url, {"imageParameters": imageParameters});
    service.suspend();
    layers.push(service);
    identifyTasks[url] = new IdentifyTask(url);
    on(query(id+" input"), "change", function(){updateLayerVisibility(service,this.parentNode.parentNode)});
  }




  function updateLayerVisibility (service,pane) {
    var inputs = query("input",pane);
    var inputCount = inputs.length;
    var visibleLayerIds = [-1]
    //in this application no layer is always on
    for (var i = 0; i < inputCount; i++) {
      if (inputs[i].checked) {
        visibleLayerIds.push(inputs[i].value);
        addLayerInfo(service,i)
      }else{
        removeLayerInfo(service,i)
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


  function addVisibleUrl(url,service){
    visibleServiceUrls[url] = service;
  }

  function removeVisibleUrl(url){
    visibleServiceUrls[url] = null;
  }
         




function addLayerInfo(service,layerId){
  var info = service.layerInfos[layerId]
  if(!info||info.rpNode) return;

  var node = DOC.createElement('div');
  info.rpNode = node;
  node.innerHTML = info.name;
  layerNode.appendChild(node);
}

function removeLayerInfo(service, layerId){
  var info = service.layerInfos[layerId];
  if(!info)return
  var node = info.rpNode;
  if(!node) return;

  layerNode.removeChild(node);
  info.rpNode = null;
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


//Query builder for Groundwater Level Change

function inputQuery(){
  var type = dom.byId("radio1").checked === true
             ? "Depth"
             : dom.byId("radio2").checked
               ? "Elevation"
               : "Change"
             ;
  if(type === "Change") spanDijit.attr("disabled",false);
  else spanDijit.attr("disabled",true);

  var checkedServices = getCheckedServices();

  toggleLayers(type,checkedServices);
}

function clearAndQuery(){
  showLegend(this.id)
  clearAllLayers();
  inputQuery();
}

function toggleLayers(type,checkedServices){
  var services = getServicesFromChecks(checkedServices);
  services.forEach(function(name,i){
    var key = type+name;
    var layerId = getLayerId(type,key)
    if(checkedServices[i])
      showLayer(key,layerId)
    else
      hideLayer(key,layerId)
  })
}



function showLegend(id){
	if(id === "radio1"){
    pointsLegend.src = "images/Dynamic_ChangePoints.png";
	}else if (id === "radio2"){
	}else{
    pointsLegend.src = "images/Dynamic_ChangePoints.png";
	}
}


function showLayer(serviceName,layerId){
  var service = staticServices[serviceName];
    service.resume();
    service.setVisibleLayers([layerId])
    addLayerInfo(service,layerId)
    addVisibleUrl(service.url,service)
}

function hideLayer(serviceName,layerId){
  var service = staticServices[serviceName];
  if(!service.suspended){
    service.setVisibleLayers(noLayers)
    service.suspend();
    removeLayerInfo(service,layerId)
    removeVisibleUrl(service.url);
  }
}

function clearAllLayers(){
  var checked = getCheckedServices();
  serviceTypes.forEach(function(type){
    var services = getServicesFromChecks(checked);
    services.forEach(function(name, i){
      var key = type+name;
      var layerId = getLayerId(type,key);
      hideLayer(key,layerId)
    })
  })
}


function getCheckedServices(){
  return checks.map(function(node,i){
    return node.checked
  });
}

function getServicesFromChecks(checkedArray){
  return checkedArray.map(function(checked,i){
        return serviceNames[serviceNames.length-i-1]
    })
}


function yearChange(year){
  setSpanData(year);
  inputQuery();
}

function spanChange(){
  inputQuery();
}


on(levelComboYr,"change",yearChange)
on(levelComboSeason,"change",inputQuery)
on(levelComboSpan,"change",spanChange)

on(depthRadio,"change",clearAndQuery)
on(elevRadio,"change",clearAndQuery)
on(changeRadio,"change",clearAndQuery)

on(dom.byId("levelMeasurement"),"change", inputQuery)
on(dom.byId("levelContours"),"change", inputQuery)
on(dom.byId("levelRamp"),"change", inputQuery)



function forEach(arr,fn){
  for(var i=0;i<arr.length;i++){
    fn(arr[i],i,arr)
  }
}


// Add layers to map
map.addLayers(layers);




/* note: you'll need another button or something to clear layers added to the map.
 * this design falls down a bit in that the layers will need to be manipulated manually by the user.. ie
 * clearing layers and changing which layers are showing requires both clicking check boxes and buttons..
 * when it might be smoother to just turn something on when you click the checkbox, removing the "Get value"
 * button entirely. That's what I'd do in this case. You could then make layers automatically clear
 * when the select input changes values, limiting total viewable points on the map (important for performance)
 */


/*builder hooked up
 *
 *
 *
 *
 */


  // Add dijits to the application


  // Initialize basemap toggle dijit. The basemap argument is the one to which you will toggle, the string
  // is, like with the Map constructor, an id of an HTML element.
    var toggle = new BasemapToggle({
      map : map,
      basemap : "satellite"
      }, "basemapToggle");
    toggle.basemaps.osm.label="Street"
    toggle.startup();


  // Scalebar dijit. Somewhat limited in design, though alternate designs are available.
    var dijitScalebar = new Scalebar({
      map : map,
      scalebarUnit : "dual",
      attachTo : "bottom-left"
    });


 
  // Measurement widget. This is a wrapper around the API's measurement dijit. Features of the wrapper involve
  // a tool manager that allows multiple tools to work together and the ability for the measure tool to
  // prevent map events from firing when measurement is enabled. The anchor is an HTML element when
  // the button will go, the next argument is the line that the dijit creates, the third is the symbol for points
  // and line vertices, and the last optional argument is an array that takes a reference to the map
  // and an array of features that events should be paused on 
/*    var measureTool = MeasureTool( measureAnchor
                                 , new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 2)
                                 , new SimpleMarkerSymbol({"size":6,"color":new Color([0, 0, 0])})
                                 , { map:map}
                                 );   						 

*/
 
 
 //Tabbed InfoWindow with Identify tool 
 
  var mdX = 0;
  var mdY = 0;

  var tabs = new TabContainer({style:"height:100%;"},'infoTabContainer');
  infoWindow.setContent(tabs.domNode)

infoWindow.on('hide',function(){
  infoWindow.resize(425,325);
})


  map.on("mouse-down",function(e){
    mdX = e.x;
    mdY = e.y;
  });

  map.on("mouse-up",function(e){
    if(Math.abs(e.x-mdX)<10&&Math.abs(e.y-mdY)<10)
      runIdentify(e);
      setInfoPoint(e);
  })

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
    tabs.getChildren().forEach(function(v){tabs.removeChild(v)});

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
    if(season === "S") season = "Spring "
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
      if(attributes.hasOwnProperty(key)&&key!=="OBJECTID"&&key!=="Shape"&&key!=="Shape_Area"&&key!=="Shape_Length"){
        var spaced = makeSpaced(key)
        list+= "<li><strong>"+spaced+"</strong>: "+getAttributeHTML(attributes[key])+"</li>"
      }
    }
    list +="</ul>"
    return list;
  }

  function getAttributeHTML(value){
    var linkReg = /(?:^https?|^ftp):\/\//i;
    var embeddedImg = /blank\.png/i;
    var hydstraImg = /^<img.*hydstra/i;
    if(linkReg.test(value))
      return '<a target="_blank" href="'+value+'">'+value+'</a>'
    else if(embeddedImg.test(value))
      return makeEmbedded(value,1);
    else if(hydstraImg.test(value))
      return makeEmbedded(value,0);
    else
      return value;
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

  function makeSpaced(name){
    return name.replace(/_/g," ")
  }

  function makeEmbedded(value,backgroundImg){
    var urlReg;
    var width;
    var height;
    if(backgroundImg){
      urlReg = /url\((.*?)\)/;
      width = 600;
      height = 400;
    }else{
      urlReg = /src=['"](.*?)['"]/;
      width = 612;
      height = 500;
    }

    var url = urlReg.exec(value)[1];
    if(!backgroundImg){
      value = value.slice(0,5)+'style="width:512px;height:384px;" '+value.slice(5);
    }
    setTimeout(function(){
    infoWindow.resize(width,height);
    tabs.resize();
  },0)

    return '<a target="_blank" href="'+url+'">'+value+'</a>'
  }



  function showPane(){
    var i = 0, j = movers.length;
    showing = 1;
    arro.style.backgroundPosition = "-32px -16px";
    if(oldIE){
      for(;i<j;i++){
        if(movers[i] === dataPane)
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
      if(movers[i] === dataPane)
        fx.animateProperty({node:movers[i], duration:250, properties:{marginRight:-285}}).play();
      else fx.animateProperty({node:movers[i], duration:250, properties:{marginRight:0}}).play();
      }
    }else{
      for(;i<j;i++)
        domClass.remove(movers[i],"movd");
    }
  }


  function closeToggle(){
    if(showing) hidePane();
    else showPane();
  }

  on(closeButton,"mousedown", closeToggle);






  // Register map handlers.

//Timeslider

/*
        (function initSlider() {
          var timeSlider = new TimeSlider({
            style: "width: 100%;"
          }, "timeSliderDiv");
          map.setTimeSlider(timeSlider);
          
          var timeExtent = new TimeExtent();
          timeExtent.startTime = new Date("1/1/1920 UTC");
          timeExtent.endTime = new Date("12/31/Spring 2012 UTC");
          timeSlider.setThumbCount(2);
          timeSlider.createTimeStopsByTimeInterval(timeExtent, 2, "esriTimeUnitsYears");
          timeSlider.setThumbIndexes([0,1]);
          timeSlider.setThumbMoSpring vingRate(2000);

          
          //add labels for every other time stop
          var labels = arrayUtiSpring ls.map(timeSlider.timeStops, function(timeStop, i) { 
            if ( i % 2 === 0 ) {
              return timeStop.getUTCFullYear(); 
            } else {
              return "";
            }
          }); 
          
          timeSlider.setLabels(labels);

          timeSlider.on("time-extent-change", function(evt) {
            var startValString = evt.startTime.getUTCFullYear();
            var endValString = evt.endTime.getUTCFullYear();
            document.getElementById("daterange").innerHTML = "<i>"+ startValString + "and "+ endValString  + "<\/i>";
          });

          timeSlider.startup();
		})()
*/



  // Initialize measurement dijit on first click. This allows you to save code execution time until it is
  // actually needed. on.once will disconnect the handler after this runs once. The dijit internally
  // applies its own handlers afterward.
 //on.once(measureAnchor,"mousedown", function(e){measureTool.init(e)});




  });
   
});

	
	  
