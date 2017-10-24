google-maps-api-dotlayer a.k.a DotLayer 
=======================================

Provides a layer to print (theoretically) infinite markers to Google Maps API v3

This google maps api extension is build upon the excellent [Ubilab's ThreeJS Layer](https://github.com/ubilabs/google-maps-api-threejs-layer), which in turn was based on the [CanvasLayer utility library](https://google-maps-utility-library-v3.googlecode.com/svn/trunk/canvaslayer/docs/reference.html).

It has dependencies on 

* [Google Maps API v3](https://developers.google.com/maps/)
* [jQuery](http://jquery.com/)
* [Three.js](http://threejs.org/)
* [Dat.GUI](https://code.google.com/p/dat-gui/)
* [Require.js](http://requirejs.org/)


**Whant to try it out? [Here's a demo!](https://instagis.github.io/google-maps-api-dotlayer/demo.html)**

## What does it do? 

DotLayer provides yet another visualization to print the contents of a DataSet to your google map. By DataSet I mean any kind of collection you are using to store your data. I've seen different kind of collection for this:
* DataSet is a *google.maps.MVCArray* object, and each element is a position i.e. google.maps.LatLng object
* DataSet is a *google.maps.MVCArray* object, each element is an plain object, whose position property is a google.maps.LatLng object.
* DataSet is a *google.maps.MVCArray* object, each element is a google.maps.MVCObject whose position property is a google.maps.LatLng object.
* DataSet is a *google.maps.Data* object, each element is a google.maps.Data.Feature whose geometry has a position or centroid.
* Third party Collections such as Backbone's filled with whatever you want.

There are many ways to manage a DataSet, but all in all DotLayer doesn't care about that. Instead, your dataset must implement a *loadPoints* method, whose purpose is to create a plain array made of google.maps.LatLng elements. Depending on the structure of your DataSet, your *loadPoints* method may vary. The *loadPoints* method should take a callback parameter, which should be called with the plain array as argument.

Example: let's imagine your DataSet is an MVCArray and each element is a google.maps.Marker element.

```js
DataSet.loadPoints = function(callback) {
		var origin = [];
		this.forEach(function(element) {
			var position;
			position = element.get('position');
			origin.push(position);
		});
		if (callback) callback(origin);
	};

```
Provided that your DataSet is a collection of objects, and each of these objects has its position and or coordinates, DotLayer will print on the map an overlay with a marker-shaped sprite for each position in your collection.

If your collection doesn't have a  *loadPoints* method, then DotLayer will try to extract the position of each element in the collection. It might fail and it'll be your fault. I guarantee it.


## Installation and Usage

Just grab dotlayer.js from this repo and put it somewhere in you js dir. In my case, as you can see in [the demo](http://instagis.github.io/google-maps-api-dotlayer/demo.html), I keep the third party libraries in /js/lib and dotlayer in the root folder. You can use it how it suites you most.

That, or just clone the gh-pages branch which contain a directory structure already.

To create a DotLayer visualization from your DataSet, do the following:

```js
var sampleData = [
  new google.maps.LatLng(37.782551, -122.445368),
  new google.maps.LatLng(37.782745, -122.444586),
  new google.maps.LatLng(37.782842, -122.443688),
  new google.maps.LatLng(37.782919, -122.442815),
  new google.maps.LatLng(37.782992, -122.442112),
  new google.maps.LatLng(37.765166, -122.43503)
];
  var DataSet = new google.maps.MVCArray(sampleData);
var dotlayer = new google.maps.DotLayer({
				map: map,
				container: '#dotlayer_controls',
				controlbox: true,
				DataSet: DataSet
			});
		}

```

You see there's the simplest Dataset you can imagine: an array of points. DotLayer is prepared to deal with arrays of objects as well, so don't worry about that.


## Why so?

Imagine you have a DataSet that represents people. People in a block can add easily up to 3000 or 5000. Creating a google.maps.Marker for each one will render your browser slow or even unresponsive. In my projects, we set a limit on the maximum Markers you can pull from the DB to protect the user from *accidentally* zooming out and drawing hundreds of thousands of markers.

When the user still need to see a representation of those hundreds of thousands, markers are obviously not the way to go. There are many ways to deal with the problem: clustering on proximity, grouping from the backend, conditional rendering depending on zoom and position, etc etc. DotLayer is yet another solution for this.

It creates a canvas element, but doesn't draw directly in it. Why? I tried, and I concluded the canvas approach had a higher limit than the google.maps.Marker approach, but wouldn't run smoothly with 10.000+ points.

Seeing the excellent demo that Ubilabs made with google-maps-api-threejs-layer, I saw that the powerful solution offered by Three.js. Instead of manually printing my sprites into the canvas, the solution was to create a ThreeJS Material, and decide its texture based on my collection of geometries.

Ubilab's solution was smooth, but didn't resolve the general case. It wasn't able to run in browsers without proper WebGL support, which some times is because of a faulty AMD Ubuntu driver (my case). But ThreeJS has a Canvas renderer, so I completed the funcionality to work no matter what, and added a detection algorithm to decide which way to go.

Using threejs materials allows you to texturize it with millions of points. Of course, you might not have those points in memory, and that's where the *loadPoints* method comes in. You pass only a reference of your DataSet and DotLayer will request the points from your backend using your implemented method.


## Controls 

Also inspired by Ubilabs's use of the fantastic dat.GUI library, I added a method to create a control box in which you can change the color, size and opacity of your markers.


## Caveats 

Unlike google.maps.Marker, this marker-shaped material is just an overlay. You can't add individual click listeners to the dots. We mean to print massive amounts of dots, so there would be no point in carrying individual analysis even if it was possible. This being said, DotLayer is not a replacement for google.maps.Marker, but instead another visualization choice to show sheer volume.



