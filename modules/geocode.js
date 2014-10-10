define([],function(){

  function request(url,cb){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = respond(cb);
    xhr.send();
  }

  function respond(cb){
    return function(){
      cb(this.responseText)
    }
  }


  var endpoint = "https://maps.googleapis.com/maps/api/geocode/json?address=";
  var whitespace = /\s+/;


  return function(address,cb){
    var url = endpoint + address.split(/\s/).join('+');
    return request(url,cb);
  }
})