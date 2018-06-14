// Model (Global Variables)
var locations = [
  {title:'1000 E Nolana', location:{lat: 26.236439, lng: -98.203901}},
  {title:'4017 N 23rd St', location:{lat: 26.242047, lng: -98.239617}},
  {title:'2225 US 83 Business', location:{lat: 26.205558, lng: -98.244701}},
  {title:'1412 E Jackson Ave', location:{lat: 26.190454, lng: -98.206753}},
  {title:'100 E Expressway 83', location:{lat: 26.206018, lng: -98.181302}},
  {title:'2510 E Expressway 83', location:{lat: 26.1942, lng: -98.282471}}
];

var map;
var markers = [];

/* Set to true to ensure that certain functions
can wait for computed observables to compute data
before updating other data they're dependent on
*/
ko.options.deferUpdates = true;


var ViewModel = function(){

  var self = this;

/* Initializes map by setting specific styles, 
  startup zoom, and center, map is initialized here
  because most functions below make use of it
*/
  self.initMap = function() {

    styles = [
      {
        featureType: 'water',
        stylers: [
          {color: '#19a0d8'}
        ]
      }

     ];

    map = new google.maps.Map(document.getElementById('map'),{
      center: {lat: 26.211630, lng: -98.223873},
      zoom: 14,
      styles: styles,
      mapTypeControl: false

    });

    var largeInfowindow = new google.maps.InfoWindow();
    var bounds = new google.maps.LatLngBounds();


//Creates markers based on observable array of locations
    locations.forEach(function(item){

      var marker = new google.maps.Marker({
        position: item.location,
        title: item.title,
        animation: google.maps.Animation.DROP,
      });

      markers.push(marker);
      bounds.extend(marker.position); 
      marker.addListener('click', function(){

//Window is created for each marker
        self.populateInfoWindow(this, largeInfowindow);
      });

    });


  }

  this.initMap();

/* Window creation continue, AJAX request is made to Foursquare and data
is filtered out to HTML code containing image and phone number which is then
inserted into the current markers window. Timeout is set on AJAX call in 
case website is blocked, alert is displayed if error is returned.
*/

  this.continueInfoWindow = function(marker, infowindow, data){
    console.log(data);


    $.ajax({
      url:'https://api.foursquare.com/v2/venues/'+ data.id,
      timeout: 8000,
      dataType: 'json',
      data: 'limit=1' +
              '&ll='+ data.location.lat +','+ data.location.lng +
              '&client_id='+ 'BO3T3PL3G5F4KVDL11PN4DTBIP4WZNDM4YPD5DG3LGX4MH4K' +
              '&client_secret='+ 'IIFWHJDAF0FWT1PEAHOJITQ0D4OZHP33PMVJWW3QKFSR4G3A' +
              '&v=20180613' +
              '&m=foursquare',
      async: true,

      success: function (data) {
          console.log(data.response.venue)
          var phoneNum = data.response.venue.contact.formattedPhone;
          var bestPhoto = data.response.venue.bestPhoto;
          var size = "height100"
          var photoURL = bestPhoto.prefix + size + bestPhoto.suffix;
         
          content = '<div>' + '<img src="'+photoURL+'">'+'<br>'+'<br>'+marker.title+ '<br>'+'<br>'+ phoneNum+ '<br>'+'</div>';
          infowindow.setContent(content);
          infowindow.open(map, marker);

           console.log(photoURL);

          infowindow.addListener('closeclick', function(){
            infowindow.setMarker = null;
          });
       },

       error: function(e){
          alert("Foursquare data could not be loaded");

        }
                
    });   

  }

/* Function starts off by ensuring current displayed marker
is not trying to be redisplayed, call is made to Foursquare API
to return the venues ID, which is then passed to another function to
finish window creation. Timeout is set on AJAX call in case website is 
blocked, alert is displayed if error is returned.
*/
  this.populateInfoWindow = function(marker, infowindow){
      if(infowindow.marker != marker){
        marker.setAnimation(google.maps.Animation.DROP);
        var result;
        infowindow.marker = marker;
        $.ajax({
        url:'https://api.foursquare.com/v2/venues/search',
        timeout: 8000,
        dataType: 'json',
        data: 'limit=1' +
                '&ll='+ marker.position.lat() +','+ marker.position.lng() +
                '&client_id='+ 'BO3T3PL3G5F4KVDL11PN4DTBIP4WZNDM4YPD5DG3LGX4MH4K' +
                '&client_secret='+ 'IIFWHJDAF0FWT1PEAHOJITQ0D4OZHP33PMVJWW3QKFSR4G3A' +
                '&v=20180613' +
                '&m=foursquare',
        async: true,

       success: function (data) {
            result = data.response.venues[0];

//If request is successful data is passed to function to finish
//window creation
            self.continueInfoWindow(marker, infowindow, result);
          
        },

        error: function(e){
          alert("Foursquare data could not be loaded");

        }
        
    });


         
      }
    }



//Opens current listings window
  this.window = function(marker){
    google.maps.event.trigger(marker, "click" );
  }


//Hides all listings
  this.hideAllListings = function(){
    for( var i = 0; i < markers.length; i++){
      markers[i].setMap(null);
    }
  }


//Shows listing that is current in visibleLocations list
  this.showListing = function(list){
    var bounds = new google.maps.LatLngBounds();

    for(var i = 0; i < list.length; i++){
        list[i].setMap(map);
        bounds.extend(list[i].position);
    }

  }

//Shows all listings
  this.showAllListings = function(){
    var bounds = new google.maps.LatLngBounds();
    
    for(var i = 0; i < markers.length; i++){
        markers[i].setMap(map);
        bounds.extend(markers[i].position);
    }

    map.fitBounds(bounds);
  }

//Takes in input from textInput
  this.selection = ko.observable();

//When text is inputted all listings are hidden
//and a computed observable of filtered lists is 
//is passed to the showListings function to show
//desired content
  this.selection.subscribe(function(data){
    self.hideAllListings();
    self.showListing(self.visibleLocations());
  }, this);


//Turns current array of markers into observable
  this.locationsObservable = ko.observableArray(markers)

//Gets array of markers and returns a filtered array
//based on the input the user enters, updated in real time
  this.visibleLocations = ko.computed(
    function(){
      return this.locationsObservable().filter(function(location){
      if(!self.selection() || location.title.toLowerCase().indexOf(self.selection().toLowerCase()) != -1)
        return location;
    });
  }, this);


//All listings are shown by default
  this.showAllListings();


}

//Initializes ViewModel and is called by
//the Google Maps API on index.html
function initApp(){
  ko.applyBindings( new ViewModel());

}

//Used to make sidebar responsive
$("#menu-toggle").click(function(e){
    e.preventDefault();
    $("#wrapper").toggleClass("menuDisplayed");
  });
