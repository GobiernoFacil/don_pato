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
      districts_csv = "/js/data/distritos.csv",
      district_key_regex  = /df-(\d+)-(\d)/,
      location_regex      = /(\d+)-([a-z\d]+)/i,
      district_map_center = [19.2676, -98.4239], // san merlín!

  // [ CACHE THE UI ELEMENTS ]
      state_selector = document.querySelector("#district-selector-container select[name='state']"),
      city_selector  = document.querySelector("#district-selector-container select[name='city']"),
      district_map   = document.querySelector("#district-map-container .map"),
      candidate_container = document.querySelector("#district-candidates-container ul");
  
  // [ SET THE DATA CONTAINERS ]
      states_array        = [],
      cities_array        = [],
      districts_array     = [],
      cities_map_array    = [],
      districts_map_array = [],
      google_district_map  = null,
      district_key         = null,
      current_location     = null,
      current_location_key = null,
      current_polygon      = null,
      current_state        = null,
      current_city         = null,
      current_district     = null,
      app;

  //
  // D E F I N E   T H E   A P P
  // --------------------------------------------------------------------------------
  //
  app = {

    //
    // [ G E O L O C A L I Z E   T H E   S T U F F ]
    // ---------------------------------------------
    //
    get_geolocation : function(){
      navigator.geolocation.getCurrentPosition(this.success_geolocation);
    },

    success_geolocation : function(loc){
      app.get("search", [loc.coords.latitude, loc.coords.longitude]);
    },

    error_geolocation : function(){
      console.log("meh murió la geolocalización");
    },

    _get_state_and_district : function(district_key){
    },
    //
    // [ C A L L   T H E   "Don Pato"   A P I ]
    // ----------------------------------------
    //

    // [ MAKE THE CALL]
    get : function(method, params){
      var url, success_function;
      switch(method){
        case "search":
          url = search + params[0] + "/" + params[1];
          success_function = this.search_success;
          break;

        case "candidate":
          url = endpoint + candidates + params[0] + ".json";
          success_function = this.candidate_success;
          break;

        case "location":
          url = endpoint + locations + params[0];
          success_function = this.location_success;
          break;

        default:
          return null;
          break;
      }
      success_function = success_function.bind(this, params);
      d3.json(url, success_function);
    },

    // [ DON-PATO-API-CALL-SUCCESS ]
    search_success : function(params, error, data){
      district_map_center  = params;
      district_key         = data.distrito;
      current_location     = data.seccion.id;
      current_polygon      = data.seccion.coords.coordinates[0];
      current_state        = district_key_regex.exec(district_key)[1];
      current_district     = district_key_regex.exec(district_key)[2];
      current_location_key = location_regex.exec(current_location)[2];
    
      if(! google_district_map){
        this.initialize_district_map();
      }
      else{
        google_district_map.setCenter({lat: district_map_center[0], lng: district_map_center[1]});
      }

      this.get("candidate", [district_key]);
    },

    candidate_success : function(params, error, data){
      console.log(error, data, params);
    },

    location_success : function(params, error, data){
      console.log(error, data, params);
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
    // [ T H E   D I S T R I C T   D A T A ]
    // ---------------------------------------------
    //

    // [ LOAD THE DISTRICT LIST ]
    get_districts : function(){
      var that = this;
      d3.csv(districts_csv, null, function(error, rows){
        districts_array = rows;
        that.map_districts(rows);
      });
    },

    // [ MAP THE CITY ]
    map_districts : function(districts){
      var map          = [],
      state            = [],
      district         = [],
      state_pointer    = 0,
      district_pointer = 0;

      districts.forEach(function(value, index, array){ 
        // [A] STATES
        if(!state_pointer || state_pointer != value.clave_entidad){
          if(state_pointer) map.push(state);
          if(!state_pointer) district.push(value);
          state = [];
          state_pointer    = value.clave_entidad;
          district_pointer = value.distrito;
        }
        // [B]
        else{
          // [B.A] DISTRICTS 
          if(district_pointer != value.distrito){
            state.push(district);
            district = [];
            district_pointer = value.distrito;
            district.push(value);
          }
          // [B.B]
          else{
            district.push(value);
          } // [B.B]

          if(array.length === index+1 || array[index+1].clave_entidad != state_pointer){
            state.push(district);
            district = [];
            district_pointer = value.distrito;
            district.push(value);
          }
        } // [B]
        if(array.length === index+1) map.push(state);
      }); // forEach
      
      districts_map_array = map;

      return map;
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





