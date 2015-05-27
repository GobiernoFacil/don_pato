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
  // define los endpoints, la ruta para los CSV de estados, municipios y distritos.
  // También el punto de default para los mapas y las expresiones regulares que 
  // limpian las claves que regresa el api de don pato.
  var endpoint   = "http://elecciones.rob.mx/",
      search     = "http://representantes.pati.to/busqueda/geo/diputados/",
      candidates = "candidatoas/",
      locations  = "casillas/",
      states_csv    = "/js/data/estados_min.csv",
      cities_csv    = "/js/data/municipios.csv",
      districts_csv = "/js/data/distritos2.csv",
      district_key_regex  = /df-(\d+)-(\d+)/,
      location_regex      = /(\d+)-([a-z\d]+)/i,
      district_map_center = [19.2676, -98.4239], // san merlín!

  // [ CACHE THE UI ELEMENTS ]
  // crea una referencia a los elementos de UI.
      state_selector      = document.querySelector("#district-selector-container select[name='state']"),
      city_selector       = document.querySelector("#district-selector-container select[name='city']"),
      district_map        = document.querySelector("#district-map-container .map"),
      locations_map       = document.querySelector("#district-city-container .map"),
      candidate_container = document.querySelector("#district-candidates-container ul"),
      location_container  = document.querySelector("#locations-map-container"),
  
  // [ SET THE DATA CONTAINERS ]
  // crea las variables que contendrán la información de los CSV, y de los objetos 
  // que se crean dinámicamente. También los apuntadores de ubicación actuales.
      states_array        = [],
      cities_array        = [],
      districts_array     = [],
      cities_map_array    = [],
      districts_map_array = [],
      google_district_map  = null,
      google_location_map  = null,
      google_geocoder      = new google.maps.Geocoder(),
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

    // [ GET LOCATION ]
    get_geolocation : function(){
      // obtiene la ubicación mediante el API de geolocalización HTML5
      navigator.geolocation.getCurrentPosition(this.success_geolocation);
    },

    // [ GET LOCATION SUCCESS ]
    success_geolocation : function(loc){
      // en caso de que se consiga la ubicación, llama al api de don pato,
      // y obtiene el distrito, la casilla, y 
      // el polígono del distrito.
      app.get("search", [loc.coords.latitude, loc.coords.longitude]);
    },

    // [ GET LOCATION FAILS ]
    error_geolocation : function(){
      // si el usuario no permite que lo geolocalicen, pues vale gorro.
      console.log("meh murió la geolocalización");
    },
    
    //
    // [ C A L L   T H E   "Don Pato"   A P I ]
    // ----------------------------------------
    //

    // [ MAKE THE CALL]
    get : function(method, params){
      // para conectarse al api de don Pato, utiliza d3. Se reciben dos 
      // variables:
      // * method : decide el endpoint al cual debe conectarse (search, candidate, location)
      // * params : es un array con las variables para el api de don pato. puede contener
      //            latitud y logintud o la clave del distrito o la clave de la casilla.
      var url, success_function;
      // dependiendo del método, es el endopoint que se genera, y la función que se 
      // debe ejecutar al recibir los datos del api. Las posibles funciones son:
      // * search_success
      // * candidate_success
      // * location_success
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
      // se le agrega a la función de success el array de params, y se 
      // corrige el scope de la función.
      success_function = success_function.bind(this, params);
      d3.json(url, success_function);
    },

    // [ DON-PATO-API-CALL-SUCCESS (SEARCH) ]
    search_success : function(params, error, data){
      district_map_center  = params;
      district_key         = data.distrito;
      current_location     = data.seccion.id;
      current_polygon      = data.seccion.coords.coordinates[0];
      current_state        = district_key_regex.exec(district_key)[1];
      current_district     = district_key_regex.exec(district_key)[2];
      current_location_key = location_regex.exec(current_location)[2];

      state_selector.value = current_state;
      this.set_cities(current_state);
    
      if(! google_district_map){
        this.initialize_district_map();
      }
      else{
        google_district_map.setCenter({lat: district_map_center[0], lng: district_map_center[1]});
      }

      this.get("candidate", [district_key]);
      this.get("location", [current_location]);
    },

    // [ DON-PATO-API-CALL-SUCCESS (CANDIDATE) ]
    candidate_success : function(params, error, data){
      this.set_candidate(data);
    },

    // [ DON-PATO-API-CALL-SUCCESS (LOCATION) ]
    location_success : function(params, error, data){
      this.set_location_data(data);
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

    get_cities_by_district : function(state, district){
      var _cities_array = districts_map_array[+state - 1][+district - 1],
          _city_list    = [],
          _loc          = parseInt(current_location_key);

      for(var i = 0; i < _cities_array.length; i++){
        console.log(_loc, _cities_array[i].inicia, _cities_array[i].termina, _cities_array[i].clave_entidad, _cities_array[i].clave_municipio, _cities_array[i].clave_municipio_inegi);
        if(_loc >= +_cities_array[i].inicia && _loc <= +_cities_array[i].termina){
          current_city = _cities_array[i].clave_municipio_inegi;
        }
        if(_city_list.indexOf(_cities_array[i].clave_municipio_inegi) == -1){
          _city_list.push(_cities_array[i].clave_municipio_inegi);
        }
      }
      return [
        current_city, 
        _city_list, 
        _loc, 
        city_selector.querySelector("option[value='" + (current_city) + "']")
      ];
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
    },

    //
    // [ T H E   G O O G L E   L O C A T I O N S   M A P ]
    // ---------------------------------------------------
    //

    initialize_locations_map : function(){
      var mapOptions = {
        center : {
          lat : 0,
          lng : 0
        },
        zoom : 12
      };
      google_location_map = new google.maps.Map(locations_map, mapOptions);
    },

    get_geolocation_from_google : function(location){
      google_geocoder.geocode({address : location}, function(results, status){
        console.log(results, status);
      });
    },

    //
    // [ T H E   G O O D   G U Y S ]
    // ---------------------------------------------------
    //
    set_location_data : function(locations){
      var container = document.createElement("div"),
          address, c, html, loc;

      locations.forEach(function(val, index, array){
        c    = container.cloneNode(),
        html = "";
        loc = val.nombre + ", " + val.direccion.calle + " " + val.direccion.numero;
        html +="<h3>" + loc + "</h3>";
        val.funcionarios.forEach(function(v,i,a){
          html += "<p>" + v.nombre + " " + v.apellidos + " (" + v.cargo + ")</p>";
        });
        c.innerHTML = html;
        location_container.appendChild(c);

        cities_array = app.get_cities_by_district(current_state, current_district);
        address = loc + ", " + cities_array[3].innerHTML + ", " 
                  + states_array[+current_state].nombre + ", México";
        app.get_geolocation_from_google(address);
      });
    },


    //
    // [ T H E   C A N D I D A T E S   F U N C T I O N S ]
    // ---------------------------------------------------
    //
    set_candidate : function(candidates){
      candidate_container.innerHTML = "";
      var create = document.createElement.bind(document),
          txt    = document.createTextNode.bind(document);

      candidates.forEach(function(val, index, array){
        // [0]. crea el contenedor
        var li = create("li");
        	li.setAttribute("class","col-xs-4 col-sm-3");
        	div = create("div");
        	li.appendChild(div);
        // [1]. agrega la imagen
        var img     	= create("img"),
            img_el  	= create("figure");
            img.src 	= val.foto;
            img_el.appendChild(img);
            //link
			link_diputa 	= create("a"),
			link_diputa_txt = "+ información";
			link_diputa.innerHTML = link_diputa_txt;
			img_el.appendChild(link_diputa);
            div.appendChild(img_el);
        // [2]. agrega el nombre
        var name     = create("h2"),
            name_src = txt(val.nombre);
            name.appendChild(name_src); 
            div.appendChild(name);
        // [3]. agrega el partido
        var parties = create("p");
            parties_src = val.partidos.join(" + ");
            parties.innerHTML = parties_src;
            parties.setAttribute("class",'partidin ' + val.partidos.join(" "));
            div.appendChild(parties);
      /*
         // [4]. agrega edad
        var age = create("p"),
            age_src = txt(val.edad ? val.edad + " años" : "¿inmortal?/no sabe/no contestó");
            age.appendChild(age_src);
            div.appendChild(age);
            
        // [5]. agrega la casa de campaña
        var house = create("p"),
            house_src = txt(val.casa_campana ? val.casa_campana : "indigente/no sabe/no contestó");
            house.appendChild(house_src);
            div.appendChild(house);*/
            /*
            age,
            age_text,
            curruculum_work,
            curruculum_work_text,
            curricullum_template,
            curriculum_template_text,
            name,
            name_text,
            parties,
            sex,
            social_a,
            social_b,
            social_c,
            social_d,
            alternate,
            phone;
            */
        candidate_container.appendChild(li);
      });
    },

    get_setup_data : function(){
      return {
      states_array : states_array,
      cities_array : cities_array,
      districts_array : districts_array,
      cities_map_array : cities_map_array,
      districts_map_array : districts_map_array,
      google_district_map : google_district_map,
      google_location_map : google_location_map,
      google_geocoder : google_geocoder,
      district_key : district_key,
      current_location : current_location,
      current_location_key : current_location_key,
      current_polygon : current_polygon,
      current_state : current_state,
      current_city : current_city,
      current_district : current_district,
      };
    }
  };

  //
  // [ R I G   T H E   U I ]
  // -----------------------
  //
  state_selector.onchange = app.set_cities;
  city_selector.onchange  = app.set_district_map_center;

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
app.get_districts();





