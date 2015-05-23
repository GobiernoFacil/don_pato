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
  
  // [ SET THE DATA CONTAINERS ]
      states_array = [],
      cities_array = [],
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
    }

    //
    // [ FILL THE CITY SELECTOR ]
    //
    set_cities : function(cities){
      
    }
  };

  //
  // [ WIRE THE APP ] 
  //

  return app;
};



// inicia el API
app = new APP();

// obtiene los municipios
/*
d3.csv("/js/data/puebla_municipios.csv", null,function(error, rows){
  app.cities = rows;
});
*/