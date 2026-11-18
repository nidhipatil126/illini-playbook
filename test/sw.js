/* Keeps Illini Playbook working without Wi-Fi. Every request tries the network first, so a new
   version shows up as soon as you're online, and saves a copy; with no connection, the saved copy
   is used. Your plan itself lives in the browser's storage, not here. */
"use strict";

var CACHE_NAME = "playbook-v1";
var APP_FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
var FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function(event){
  event.waitUntil(caches.open(CACHE_NAME)
    .then(function(cache){ return cache.addAll(APP_FILES); })
    .then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(event){
  event.waitUntil(caches.keys().then(function(names){
    return Promise.all(names.filter(function(name){ return name!==CACHE_NAME; }).map(function(name){ return caches.delete(name); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(event){
  var request = event.request;
  if(request.method !== "GET") return;
  var url = new URL(request.url);
  var sameSite = url.origin === self.location.origin;
  if(!sameSite && FONT_HOSTS.indexOf(url.hostname) < 0) return;
  // Our own files are saved without their ?query, so repeat visits don't pile up copies.
  var cacheKey = sameSite ? url.origin + url.pathname : request.url;
  event.respondWith(fetch(request).then(function(response){
    if(response.ok || response.type === "opaque"){
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){ return cache.put(cacheKey, copy); });
    }
    return response;
  }).catch(function(){
    return caches.match(cacheKey).then(function(saved){
      if(saved) return saved;
      if(request.mode === "navigate") return caches.match(new URL("./", self.location).href);
      return Response.error();
    });
  }));
});
