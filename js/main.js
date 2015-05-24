// API de don pato
var APP = function(){
  //
  // [ SET THE CONFIG VARIABLES ]
  //
  var endpoint   = "http://candidatos.rob.mx/",
      search     = "http://representantes.pati.to/busqueda/geo/diputados/",
      candidates = "candidatoas/",
      locations  = "casilla/",
      states_csv = "/js/data/estados_min.csv",
      cities_csv = "/js/data/municipios.csv",

  // [ CACHE THE UI ELEMENTS ]
      state_selector = document.querySelector("#district-selector-container select[name='state']"),
      city_selector  = document.querySelector("#district-selector-container select[name='city']"),
  
  // [ SET THE DATA CONTAINERS ]
      states_array = [],
      cities_array = [],
      cities_map_array = [],
      app;

  //
  // [ DEFINE THE APP ] 
  //
  app = {
    //
    // [ CALL THE "Don Pato" API ]
    //
    get : function(method, params){
      var url, connection = new XMLHttpRequest();
      switch(method){
        case "search":
          url = search + params[0] + "/" + params[1];
          break;

        case "candidate":
          url = endpoint + candidates + params[0];
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
      // app.data.push(JSON.parse(this.responseText));
    },

    // [ FUCK! ]
    error : function(conn){
      console.log("error", this, conn.responseText);
    },

    //
    // [ FILL THE STATE SELECTOR ]
    //
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

    //
    // [ LOAD THE STATE LIST ]
    //
    get_states : function(){
      var that = this;
      d3.csv(states_csv, null, function(error, rows){
        states_array = rows;
        that.set_states(rows);
      });
    },

    //
    // [ FILL THE CITY SELECTOR ]
    //
    set_cities : function(e){
      var state_id = typeof e === "object" ? e.currentTarget.value : e;
      var cities = app.get_cities_by_state(state_id);
      cities.unshift({clave_entidad : 0, clave_municipio:0, nombre : "selecciona un municipio"});
      city_selector.innerHTML = "";
      cities.forEach(function(value, index, array){
        var option = document.createElement('option');
        var text   = document.createTextNode(value.nombre);
        option.appendChild(text);
        option.setAttribute("value", value.clave_entidad);
        city_selector.appendChild(option);
      });
    },

    //
    // [ LOAD THE CITY LIST ]
    //
    get_cities : function(){
      var that = this;
      d3.csv(cities_csv, null, function(error, rows){
        cities_array = rows;
        that.map_cities(rows);
      });
    },

    //
    // [ MAP THE CITY ]
    //
    map_cities : function(cities){
      var map  = [], 
      counter  = 0, 
      pointer  = 1,
      displace = 0;
// 2 [0, 2], 3[2], 4, 1, 2
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

    //
    // [ GET CITIES BY STATE ]
    //
    get_cities_by_state : function(state_id){
      console.log(state_id);
      if(! +state_id) return [];

      var x  = cities_map_array[+state_id - 1];
      console.log(x);
      var cities = cities_array.slice(x[0], x[0] + x[1]);
      return cities;
    },

    get_cities_array : function(){
      return cities_array;
    },

    get_cities_map : function(){
      return cities_map_array;
    }
  };

  // [ RIG THE UI ]
  state_selector.onchange = app.set_cities;

  return app;
};



// inicia el API
app = new APP();

app.get_states();
app.get_cities();





