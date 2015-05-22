// API de don pato

var APP = function(){
  var endpoint   = "http://representantes.pati.to/",
      search     = "busqueda/geo/diputados/",
      candidates = "candidatoas/",
      locations  = "casilla/",
      connection = new XMLHttpRequest(),
      app;

  app = {
    get : function(method, params){
      var url = endpoint;
      switch(method){
        case "search":
          url += search + params[0] + "/" + params[1];
          break;

        case "candidate":
          url += candidates + params[0];
          break;

        case "location":
          url += locations + params[0];
          break;

        default:
          return null;
          break;
      }

      connection.open("GET", url, true);
      connection.send();
    },
    success : function(){
      console.log("success", this, connection.responseText);
    },
    error : function(){
      console.log("error", this, connection.responseText);
    }
  };

  connection.onload  = app.success;
  connection.onerror = app.error;

  return app;
}