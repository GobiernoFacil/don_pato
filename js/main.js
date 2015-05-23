// API de don pato
var APP = function(){
  var endpoint   = "http://candidatos.rob.mx/",
      search     = "http://representantes.pati.to/busqueda/geo/diputados/",
      candidates = "candidatoas/",
      locations  = "casilla/",
      app;

  app = {
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
    success : function(){
      app.data.push(JSON.parse(this.responseText));
    },
    error : function(conn){
      console.log("error", this, conn.responseText);
    },
    postcodes : [],
    cities : [],
    data : [],
    print_codes : function(el, index, array){
      app.get("search", [el.lat, el.lng]);
    }
  };

  return app;
};

// inicia el API
app = new APP();

// obtiene los municipios
d3.csv("/js/data/puebla_municipios.csv", null,function(error, rows){
  app.cities = rows;
});
// obtiene los códigos postales
d3.csv("/js/data/texmelucan_codigos.csv", null,function(error, rows){
  app.postcodes = rows;
  app.postcodes.forEach(app.print_codes);
});

// print data for each city