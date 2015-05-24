// API DE DON PATO - ELECCIONES 2015
// @package  : don_pato
// @location : /js
// @file     : main.js
// @author  : Gobierno fácil <howdy@gobiernofacil.com>
// @url     : http://gobiernofacil.com

var APP = function(){
  //
  // S E T   T H E   C O N F I G   V A R I A B L E S
  // --------------------------------------------------------------------------------
  //

  // [ SET DEFAULT VALUES ]
  var endpoint   = "http://elecciones.rob.mx/",
      search     = "http://representantes.pati.to/busqueda/geo/diputados/",
      candidates = "candidatoas/",
      locations  = "casillas/",
      states_csv = "/js/data/estados_min.csv",
      cities_csv = "/js/data/municipios.csv",
      district_map_center = [19.2676, -98.4239],

  // [ CACHE THE UI ELEMENTS ]
      state_selector = document.querySelector("#district-selector-container select[name='state']"),
      city_selector  = document.querySelector("#district-selector-container select[name='city']"),
      district_map   = document.querySelector("#district-map-container .map"),
  
  // [ SET THE DATA CONTAINERS ]
      states_array = [],
      cities_array = [],
      cities_map_array = [],
      google_district_map = null,
      app;

  //
  // D E F I N E   T H E   A P P
  // --------------------------------------------------------------------------------
  //
  app = {

    //
    // [ C A L L   T H E   "Don Pato"   A P I ]
    // ----------------------------------------
    //

    // [ MAKE THE CALL]
    get : function(method, params){
      var url, connection = new XMLHttpRequest();
      switch(method){
        case "search":
          url = search + params[0] + "/" + params[1];
          break;

        case "candidate":
          url = endpoint + candidates + params[0] + ".json";
          break;

        case "location":
          url = endpoint + locations + params[0];
          break;

        default:
          return null;
          break;
      }
      connection.open("GET", url, true);
      connection.onload  = app.success;
      connection.onerror = app.error;
      connection.send();
    },

    // [ DON-PATO-API-CALL-SUCCESS ]
    success : function(){
      var data = JSON.parse(this.responseText);
      if(Array.isArray(data) && data[0].mentiras){
        console.log("es candidate");
      }
      else if(Array.isArray(data) && data[0].nombre){
        console.log("es location");
      }
      else if(data.distrito){
        console.log("es search");
      }
      else{
        console.log("sepa qué pasó");
      }
      // app.data.push(JSON.parse(this.responseText));
    },

    // [ FUCK! ]
    error : function(conn){
      console.log("error", this, conn.responseText);
    },

    //
    // [ T H E   L O C A T I O N   S E L E C T O R ]
    // ---------------------------------------------
    //

    // [ FILL THE STATE SELECTOR ]
    set_states : function(states){
      states.unshift({clave_entidad : 0, nombre:"selecciona un estado", url : ""});
      states.forEach(function(value, index, array){
        var option = document.createElement('option');
        var text   = document.createTextNode(value.nombre);
        option.appendChild(text);
        option.setAttribute("value", value.clave_entidad);
        state_selector.appendChild(option);
      });
    },

    // [ LOAD THE STATE LIST ]
    get_states : function(){
      var that = this;
      d3.csv(states_csv, null, function(error, rows){
        states_array = rows;
        that.set_states(rows);
      });
    },

    // [ FILL THE CITY SELECTOR ]
    set_cities : function(e){
      var state_id = typeof e === "object" ? e.currentTarget.value : e;
      var cities = app.get_cities_by_state(state_id);
      cities.unshift({clave_entidad : 0, clave_municipio:0, nombre : "selecciona un municipio"});
      city_selector.innerHTML = "";
      cities.forEach(function(value, index, array){
        var option = document.createElement('option');
        var text   = document.createTextNode(value.nombre);
        option.appendChild(text);
        option.setAttribute("value", value.clave_municipio);
        city_selector.appendChild(option);
      });
    },

    // [ LOAD THE CITY LIST ]
    get_cities : function(){
      var that = this;
      d3.csv(cities_csv, null, function(error, rows){
        cities_array = rows;
        that.map_cities(rows);
      });
    },

    // [ MAP THE CITY ]
    map_cities : function(cities){
      var map  = [], 
      counter  = 0, 
      pointer  = 1,
      displace = 0;
      cities.forEach(function(value, index, array){
        if(pointer == value.clave_entidad){
          counter++;
        }
        else{
          map.push([displace, counter]);
          counter  = 1;
          displace = index;
          pointer  = value.clave_entidad;
        }

        if(array.length == index + 1){
          map.push([displace, counter]);
        }
      });

      cities_array     = cities;
      cities_map_array = map;
      app.set_cities("0");
    },

    // [ GET CITIES BY STATE ]
    get_cities_by_state : function(state_id){
      if(! +state_id) return [];

      var x  = cities_map_array[+state_id - 1],
      cities = cities_array.slice(x[0], x[0] + x[1]);
      return cities;
    },

    //
    // [ T H E   G O O G L E   D I S T R I C T   M A P ]
    // -------------------------------------------------
    //

    // [ INITIALIZE THE DISTRICT MAP ]
    initialize_district_map : function(e){
      var mapOptions = {
        center : {
          lat : district_map_center[0],
          lng : district_map_center[1]
        },
        zoom : 10
      };
      google_district_map = new google.maps.Map(district_map, mapOptions);
    },

    // [ SET THE MAP CENTER ]
    set_district_map_center : function(e){
      var city_id  = typeof e === "object" ? e.currentTarget.value : e,
          state_id = state_selector.value,
          cities   = app.get_cities_by_state(state_id),
          city, i;

      if(! cities.length || ! +city_id) return;

      for(i = 0; i < cities.length; i++){
        if(cities[i].clave_municipio == city_id){
          city = cities[i];
          break;
        }
      }
      district_map_center = [+city.lat, +city.lng];
    },

    // [ GET THE DISTRICT MAP CENTER ]
    get_district_map_center : function(){
      return district_map_center;
    }
  };

  //
  // [ R I G   T H E   U I ]
  // -----------------------
  //
  state_selector.onchange = app.set_cities;
  city_selector.onchange = app.set_district_map_center;

  //
  // [ R E T U R N   T H E   A P P ]
  // -------------------------------
  //
  return app;
};



// inicia el API
app = new APP();

app.get_states();
app.get_cities();





