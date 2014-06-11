
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
  
  "dojo/ready",
  "dojo/_base/Color",
  "dojo/parser",
  "dojo/on",
  "dojo/dom",
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
  "esri/tasks/IdentifyParameters"
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

   ready,
   Color,
   parser,
   on,
   dom,
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
   IdentifyParameters
   ){

//Disable CORS detection, since services.arcgisonline.com is not CORS enabled
esri.config.defaults.io.corsDetection = false;


  // Fires when the DOM is ready and all dependencies are resolved. Usually needed when using dijits.
  ready(function() {
    var layers = []
      , measureAnchor = document.getElementById('measureAnchor')
      ;


  // Parse widgets included in the HTML. In this case, the BorderContainer and ContentPane.
  // data-dojo -types and -props get analyzed to initialize the application properly.
    parser.parse();


  // Choose your initial extent. The easiest way to find this is to pan around the map, checking the
  // current extent with 'esri.map.extent' in the Javascript console (F12 to open it)
    var initialExtent = new Extent({
	  xmin : -13500000,
      ymin : 3500000,
      xmax : -13500000,
      ymax : 5500000, 
	  spatialReference:{
        wkid : 102100
      }
    });


	
	

  // Create infoWindow to assign the the map.
  var infoWindow = new InfoWindow('infoWindow');
  infoWindow.startup();
  infoWindow.setTitle('<a id="zoomLink" action="javascript:void(0)">Information at this Point</a>')

  // Create the map. The first argument is either an HTML element (usually a div) or, as in this case,
  // the id of an HTML element as a string. See https://developers.arcgis.com/en/javascript/jsapi/map-amd.html#map1
  // for the full list of options that can be passed in the second argument.
    

	var map = new Map("centerPane", {
      basemap : "topo",
	    extent:initialExtent,
      infoWindow:infoWindow,
      minZoom:6,
	    maxZoom:14,
	
    });
            
	var home= new HomeButton({
	  map: map,
	}, "homeButton");
	home.startup();
    
	
	
  //Once the map is loaded, set the infoWindow's size. And turn in off and on to prevent a flash of
  //unstyled content on the first point click. This is a bug in the API.
  
      map.on("load", function(){
      infoWindow.resize(350,275);
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
    identifyParameters.tolerance = 2;
    identifyParameters.returnGeometry = false;




  // Dynamic map services allow you to bring in all the layers of a map service at once. These are rendered
  // by the server on the fly into map tiles and served out to the user. This is somewhat slower than serving
  // a cached map, but is needed for maps/data that are often updated or that needs to be queried/updated
  // dynamically (e.g., with a definition query). It is also much easier to use a dynamic map service when
  // creating and testing an application, then converting it to a cached service in production, then recaching
  // every time you need to alter the service.

  //Uncomment this code to include the layer.
 /*   var dynamicUrl = "http://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer";
  * var lyrUSA = new ArcGISDynamicMapServiceLayer(dynamicUrl, {
  *       opacity : 0.5
  *     });
  * layers.push(lyrUSA);
  */

/*   var dynamicUrl = "http://mrsbmapp00727/arcgis/rest/services/cadre/everything/MapServer/0";
 *  var lyrUSA = new ArcGISDynamicMapServiceLayer(dynamicUrl, {
  *      opacity : 0.5
  *    });
  * layers.push(lyrUSA);
  */


  // Feature layers are likely the best way to interact with individual datasets of any size.
  // A feature layer points to a layer in a map service and pulls data into the browser where it can be
  // queried on/selected/edited without incurring a roundtrip to the server (hundreds of times slower).
  // Supports three feature request modes:
  // Snapshot: when you have AT MOST a few hundred features. Pulls all the data into your map, requiring
  //           no server requests for pans and zooms. Fast, but will slow you down if you have too many features
  // On Demand: the default mode. Only gets data when needed, i.e. if it is in the current extent and 
  //           current time extent. Allows your service to contain thousands of features when zoomed in,
  //           which are loaded when they are panned/zoomed to.
  // Selection: Allows retrieval of data only when items are selected.
  //
  // Also, allows maxAllowableOffset to be set, allowing your line and polygon features to be generalized
  // on the fly. This is often a huge performance benefit, especially if you have many detailed lines or polygons.
   /* var featureUrl ="http://mrsbmapp00727/arcgis/rest/services/cadre/everything/MapServer/0";
    var lyrEverything = new FeatureLayer(featureUrl,
      {
        mode:FeatureLayer.MODE_SNAPSHOT,
        outFields:['*']
      });

    layers.push(lyrEverything);
*/

       



	
	var measurementStoreYr = new Memory({
        data: [
            
            {name:"2013", id:"0"}
 
        ]
    });

    var measurementComboSeason = new ComboBox({
        id: "measurementSelectSeason",      
	      name: "Season",
        style:{width: "140px"},
		    value: "Spring",
        store: measurementStoreSeason,
        searchAttr: "name"
    }, "measurementSelectSeason");
	
	var measurementStoreSeason = new Memory({
        data: [
            {name:"Spring", id:"0"}
        ]
    });
    var measurementComboYr = new ComboBox({
        id: "measurementSelectYr",
		    name: "Year",
        style:{width: "140px"},
		    value: "2013",
        store: measurementStoreYr,
        searchAttr: "name"
    }, "measurementSelectYr");
	
	
	
	
	
	
	
	
	var changeStoreYr = new Memory({
        data:[
            {name:"2014", id:"0"},
            {name:"2013", id:"1"},
            {name:"2012", id:"2"}
        ]
    });

    var changeComboYr= new ComboBox({
        id: "changeSelectYr",
        name: "Year",
        style:{width: "140px"},
		
		value: "2014",
        store: changeStoreYr,
        searchAttr: "name"
    }, "changeSelectYr");
  
	
	
	var changeStoreCP = new Memory({
        data:[
            {name:"1 Year", id:"0"},
            {name:"3 Year", id:"1"},
            {name:"5 Year", id:"2"},
            {name:"10 Year", id:"3"}
        ]
    });

    var changeComboCP= new ComboBox({
        id: "changeSelectCP",
        name: "Comparison Period",
        style:{width: "140px"},
		
		value: "1 Year",
        store: changeStoreCP,
        searchAttr: "name"
    }, "changeSelectCP");
  
  



/*hook up query builder in left pane
 *
 *
 *
 *
 */

var changeObj ={
"2012 10 Year" :0,
"2012 5 Year" : 1,
"2012 3 Year" : 2,
"2012 1 Year" : 3,
"2013 10 Year" :4,
"2013 5 Year" : 5,
"2013 3 Year" : 6,
"2013 1 Year" : 7,
"2014 10 Year" :8,
"2014 5 Year" : 9,
"2014 3 Year" :10,
"2014 1 Year" :11
};

var measurementObj = {
  "Spring 2013":"0" 
  };

  var staticServices = {};
  var activeServices = [];
  var visibleServiceUrls = {};
  var identifyTasks = {};

  var noLayers = [-1];
  var prefix = "http://mrsbmweb21157/arcgis/rest/services/GGI/GIC_";
  var suffix = "/MapServer";
  var serviceTypes = ["Change","Elevation","Depth"];
  var serviceNames = ["_Ramp","_Contours","_Points"];
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

         
  //Use the ImageParameters to set the visibleLayerIds layers in the map service during ArcGISDynamicMapServiceLayer construction.
  var imageParameters = new ImageParameters({layerIds:[-1],layerOption:ImageParameters.LAYER_OPTION_SHOW});
  //layerOption can also be: LAYER_OPTION_EXCLUDE, LAYER_OPTION_HIDE, LAYER_OPTION_INCLUDE

  var boundaryUrl = "http://mrsbmweb21157/arcgis/rest/services/GGI/GIC_Boundaries/MapServer";
  var boundaryLayer = new ArcGISDynamicMapServiceLayer(boundaryUrl, {"imageParameters": imageParameters});
  boundaryLayer.suspend();
  layers.push(boundaryLayer);
  identifyTasks[boundaryUrl] = new IdentifyTask(boundaryUrl);

  var bfwUrl = "http://mrsbmweb21157/arcgis/rest/services/GGI/Sacramento_Valley_BFW_Map/MapServer";
  var bfwLayer = new ArcGISDynamicMapServiceLayer(bfwUrl, {"imageParameters": imageParameters});
  bfwLayer.suspend();
  layers.push(bfwLayer);
  identifyTasks[bfwUrl] = new IdentifyTask(bfwUrl);


  function updateLayerVisibility (layer,pane) {
    var inputs = query("input",pane);
    var inputCount = inputs.length;
    var visibleLayerIds = [-1]
    //in this application no layer is always on
    for (var i = 0; i < inputCount; i++) {
      if (inputs[i].checked) {
        visibleLayerIds.push(inputs[i].value);
      }
    }
    if(visibleLayerIds.length === 1){
      layer.suspend();
      removeVisibleUrl(layer.url);
    }else{
      layer.resume();
      addVisibleUrl(layer.url,layer)
    }
    layer.setVisibleLayers(visibleLayerIds);
  }


  function addVisibleUrl(url,service){
    visibleServiceUrls[url] = service;
  }

  function removeVisibleUrl(url){
    visibleServiceUrls[url] = null;
  }



  on(query("#pane1 input"), "change", function(){updateLayerVisibility(boundaryLayer,this.parentNode.parentNode)});
  on(query("#pane4 input"), "change", function(){updateLayerVisibility(bfwLayer,this.parentNode.parentNode)});  
         
 

function getLayerId(layer,type){
  console.log(layer)
  if(type === "Change")
    return changeObj[layer];
  return measurementObj[layer];
}





function changeQuery(){
  clearActiveServices();

  var type = "Change";
  var services = getCheckedServices("#changeLayers input");
  var changelayerId = getLayerId(dom.byId("changeSelectYr").value +" "+ dom.byId("changeSelectCP").value,type);

  showLayers(type,services,changelayerId) 
}


function showLayers(type,services,layerId){
  services.forEach(function(name){
    showLayer(type+name,layerId)
  })
}


function showLayer(serviceName,layerId){
  var service = staticServices[serviceName];
  service.resume();
  service.setVisibleLayers([layerId])
  activeServices.push(service);
  addVisibleUrl(service.url,service)

}

function clearActiveServices(){
  while (activeServices.length){
    var service = activeServices.pop();
    service.setVisibleLayers(noLayers);
    service.suspend();
    removeVisibleUrl(service.url)
  }
}

function getCheckedServices(queryString){
  return query(queryString).map(function(node,i){
    if (node.checked){
        return serviceNames[serviceNames.length-i-1]
    }
    return null;
  }).filter(function(val){
    return val !== null;
  });
}


function measurementQuery(){
  clearActiveServices();

  var type = dom.byId("radio1").checked === true
           ? "Depth"
           : "Elevation"
           ;
  var services = getCheckedServices("#measurementLayers input");
  
  var measurementlayerId =  dom.byId("measurementSelectSeason").value+" "+dom.byId("measurementSelectYr").value ;
 
  showLayers(type,services,measurementlayerId) 
}



on(dom.byId("changeRamp"),"change", changeQuery)
on(dom.byId("changeMeasurement"),"change", changeQuery)
on(dom.byId("changeContours"),"change", changeQuery)

on(changeComboYr,"change",changeQuery)
on(changeComboCP,"change",changeQuery)



on(dom.byId("measurementRamp"),"change", measurementQuery)
on(dom.byId("measurementMeasurement"),"change", measurementQuery)
on(dom.byId("measurementContours"),"change", measurementQuery)

on(measurementComboYr ,"change",measurementQuery)
on(measurementComboSeason,"change",measurementQuery)
on(dom.byId("radio1"),"change",measurementQuery)
on(dom.byId("radio2"),"change",measurementQuery)



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
  /*  var measureTool = MeasureTool( measureAnchor
                                 , new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 0]), 2)
                                 , new SimpleMarkerSymbol({"size":6,"color":new Color([0, 0, 0])})
                                 , { map:map
                                   , eventFeatures:[lyrEverything]
                                   }
                                 );   						 
*/

  var mdX = 0;
  var mdY = 0;

  map.on("mouse-down",function(e){
    mdX = e.x;
    mdY = e.y;
  });

  map.on("mouse-up",function(e){
    if(Math.abs(e.x-mdX)<10&&Math.abs(e.y-mdY)<10)
      runIdentify(e);
      setInfoPoint(e);
  })

  function runIdentify(event){
    identifyParameters.geometry = event.mapPoint;
    identifyParameters.mapExtent = map.extent;
    identifyParameters.width = map.width;
    identifyParameters.height = map.height;

    infoWindow.setContent('<div id="infoTabContainer"></div>')
    var tabs = new TabContainer({style:"height:100%;"},'infoTabContainer');
    var executingTasks = 0;

    function currentIdentify(results){
      processIdentify(results,tabs,event)
      executingTasks--;
      if(executingTasks === 0){
        infoWindow.setContent(tabs.domNode)
        infoWindow.show(event.screenPoint)
      }
    }

    for(var taskUrl in identifyTasks){
      if(!visibleServiceUrls[taskUrl]) continue;
      executingTasks++;
      identifyParameters.layerIds = visibleServiceUrls[taskUrl].visibleLayers;
      identifyTasks[taskUrl].execute(identifyParameters,currentIdentify)
    }

    
  }

  function processIdentify (results,tabs){
    forEach(results,function(result){
      var tab = new ContentPane({
        content:makeContent(result.feature.attributes),
        title:result.layerName
      })
      tabs.addChild(tab);
    })   
  }

  function makeContent(attributes){
    var list = "<ul>";
    for (var key in attributes){
      if(attributes.hasOwnProperty(key))
        list+= "<li><strong>"+key+"</strong>: "+getAttributeHTML(attributes[key])+"</li>"
    }
    list +="</ul>"
    return list;
  }

  function getAttributeHTML(value){
    var reg = /https?|ftp:\/\//;
    if(reg.test(value))
      return '<a target="_blank" href="'+value+'">'+value+'</a>'
    else
      return value;
  }

  function setInfoPoint(event){
    if(infoWindow.zoomHandler)
      infoWindow.zoomHandler.remove();
    infoWindow.zoomHandler = on(document.getElementById('zoomLink'),'click',function(){
      map.centerAndZoom(event.mapPoint,12)
    });
  }



   /* on( bfwLayer,"click", function(e){
      
        title = '<a id="zoomLink" action="javascript:void(0)">Earthquake ' + attr.eqid+'</a>'
        , content ='<ul class="poplist">'+
                    '<li><span class="poptitle">Date:&nbsp;</span>'+Hello+'</li>'+
                   '</ul>';          
      infoWindow.setTitle(title);
      infoWindow.setContent(content);
      infoWindow.show(e.screenPoint);

      if(infoWindow.zoomHandler)
        infoWindow.zoomHandler.remove();
      infoWindow.zoomHandler = on(document.getElementById('zoomLink'),'click',function(){
        map.centerAndZoom(e.mapPoint,12)
      });     
    });

*/










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
          timeExtent.endTime = new Date("12/31/2012 UTC");
          timeSlider.setThumbCount(2);
          timeSlider.createTimeStopsByTimeInterval(timeExtent, 2, "esriTimeUnitsYears");
          timeSlider.setThumbIndexes([0,1]);
          timeSlider.setThumbMovingRate(2000);

          
          //add labels for every other time stop
          var labels = arrayUtils.map(timeSlider.timeStops, function(timeStop, i) { 
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

	
	  
