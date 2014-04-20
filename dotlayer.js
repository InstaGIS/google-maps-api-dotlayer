/**
	Copyright 2012 Ubiabs
	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

	unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
	**/

/**
 * Based on Ubilab's ThreeJS Layer
 * https://github.com/ubilabs/google-maps-api-threejs-layer
 * Which, in turn, is based on the CanvasLayer utility library:
 * https://google-maps-utility-library-v3.googlecode.com/svn/trunk/canvaslayer/docs/reference.html
 */

// Let's create a dummy THREE object. It will be replaced when we load three.js asyncronically.
var THREE = THREE || {};

/**
 * Creates a new DotLayer.js layer.
 * @param {Object}   options  Options passed to initialize method.
 * @param {Function} callback Callback to execute when map was updated.
 */
google.maps.DotLayer = function(options, callback) {
	this.bindAll();
	this.callback = callback;
	var self = this;
	// Async loading of three.js, which is a little too heavy to load on page render.

	/**
	 * Get browser specifiv CSS transform property.
	 *
	 * @return {String} The property.
	 */
	this.CSS_TRANSFORM = (function() {
		var div = document.createElement('div');
		var props = [
			'transform',
			'WebkitTransform',
			'MozTransform',
			'OTransform',
			'msTransform'
		];

		for (var i = 0; i < props.length; i++) {
			var prop = props[i];
			if (div.style[prop] !== undefined) {
				return prop;
			}
		}

		return props[0];
	})();
	require(['three'], function(REALTHREE) {
		THREE = REALTHREE;
		self.initialize(options || {});

		self.firstRun = true;

		if (options.map) {
			self.setMap(options.map);
		}
	});
};

/**
 * Extend OverlayView.
 * @see https://developers.google.com/maps/documentation/javascript/reference#OverlayView
 * @type {google.maps.OverlayView}
 */
google.maps.DotLayer.prototype = new google.maps.OverlayView();



/**
 * Bind all methods to the instance.
 */
google.maps.DotLayer.prototype.bindAll = function() {
	var instance = this;

	function bind(name) {
		var method = instance[name];
		if (typeof method != "function") {
			return;
		}
		instance[name] = function() {
			return method.apply(instance, arguments);
		};
	}

	for (var all in instance) {
		bind(all);
	}
};




/**
 * Initialize the layer with the given options.
 * @param  {Object} options - Options
 */
google.maps.DotLayer.prototype.initialize = function(options) {

	this.options = options;
	this.map = options.map;
	this.setDataSet(options.DataSet);
	google.maps.event.trigger(this.map, "loadingcircle", {
		message: 'Getting data...',
		show: 1,
		container: this.options.container
	});

	this.webgl = (function() {
		try {
			var canvas = document.createElement('canvas');
			return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
		} catch (e) {
			return false;
		}
	})();

	this.scene = new THREE.Scene();
	this.camera = new THREE.OrthographicCamera(0, 255, 0, 255, -3000, 3000);
	this.camera.position.z = 1000;
	if (this.webgl) {
		this.renderer = new THREE.WebGLRenderer({
			clearColor: 0x900000,
			clearAlpha: 0
		});
		this.renderertype = 'WebGL';
	} else {

		this.renderer = new THREE.CanvasRenderer({
			clearColor: 0x000000,
			clearAlpha: 0
		});
		this.renderertype = 'Canvas';
	}

	this.canvas = this.renderer.domElement;
	this.canvas.className = 'DotLayer';
	var injected = document.createElement('style');
	injected.type = 'text/css';
	injected.innerHTML = ".DotLayer {position:fixed;}";
	document.getElementsByTagName('head')[0].appendChild(injected);

};


/**
 * This method is called once after setMap() is called with a valid map.
 * @see https://developers.google.com/maps/documentation/javascript/reference#OverlayView
 */
google.maps.DotLayer.prototype.onAdd = function() {

	this.map = this.getMap();
	if (!this.map) {
		this.map = this.options.map;

	}
	this.getPanes().overlayLayer.appendChild(this.canvas);

	this.changeHandler = google.maps.event.addListener(
		this.map,
		'bounds_changed',
		this.draw
	);

	this.draw();
};

/**
 * This method is called once following a call to setMap(null).
 * @see https://developers.google.com/maps/documentation/javascript/reference#OverlayView
 */
google.maps.DotLayer.prototype.onRemove = function() {

	if (!this.map) {
		return;
	}

	this.map = null;

	this.canvas.parentElement.removeChild(this.canvas);

	if (this.changeHandler) {
		google.maps.event.removeListener(this.changeHandler);
		this.changeHandler = null;
	}
};

google.maps.DotLayer.prototype.remove = function() {
	this.canvas.parentNode.removeChild(this.canvas);
	//this.canvas_ = null;
};


/**
 * This method is called when the layer postion needs an update.
 */
google.maps.DotLayer.prototype.draw = function() {
	//console.log('draw', this.map);
	if (!this.map) {
		return;
	}

	var bounds = this.map.getBounds();

	var topLeft = new google.maps.LatLng(
		bounds.getNorthEast().lat(),
		bounds.getSouthWest().lng()
	);

	var projection = this.getProjection();
	var point = projection.fromLatLngToDivPixel(topLeft);

	this.canvas.style[this.CSS_TRANSFORM] = 'translate(' +
		(point.x) + 'px,' +
		point.y + 'px)';

	if (this.firstRun) {
		this.firstRun = false;

		if (this.callback) {
			this.callback(this);

		} else {
			var self = this;
			this.createMaterial();
		}
	}

	this.update();

};

/**
 * Call this method when the layer's size changed.
 */
google.maps.DotLayer.prototype.resize = function() {

	if (!this.map) {
		return;
	}

	var div = this.map.getDiv(),
		width = div.clientWidth,
		height = div.clientHeight;

	if (width == this.width && height == this.height) {
		return;
	}

	this.width = width;
	this.height = height;

	this.renderer.setSize(width, height);
	this.update();
};

/**
 * This method is called when the Three.js camera needs an update.
 */
google.maps.DotLayer.prototype.update = function() {

	var projection = this.map.getProjection(),
		zoom, scale, offset, bounds, topLeft;

	if (!projection) {
		return;
	}
	bounds = this.map.getBounds();
	topLeft = new google.maps.LatLng(
		bounds.getNorthEast().lat(),
		bounds.getSouthWest().lng()
	);
	zoom = this.map.getZoom();
	scale = Math.pow(2, zoom);
	offset = projection.fromLatLngToPoint(topLeft);
	this.resize();
	this.camera.position.x = offset.x;
	this.camera.position.y = offset.y;
	this.camera.scale.x = this.width / 256 / scale;
	this.camera.scale.y = this.height / 256 / scale;


	if (this.renderertype == 'Canvas') {
		//console.log(this.scene,this.camera);
		this.renderer.render(this.scene, this.camera);
	} else {
		this.render();
	}
};

/**
 * Renders the layer deferred.
 */
google.maps.DotLayer.prototype.render = function() {
	cancelAnimationFrame(this.animationFrame);
	this.animationFrame = requestAnimationFrame(this.deferredRender);
};


/**
 * The final rendering. If you have passed a function to `options.render`
 * it will be executed here.
 */
google.maps.DotLayer.prototype.deferredRender = function() {
	if (typeof this.options.render === false) {
		return;
	} else if (typeof this.options.render == "function") {
		this.options.render();
	} else {
		this.renderer.render(this.scene, this.camera);
	}
};

/**
 * Shortcut method to add new geometry to the scene.
 * @param  {Geometry} geometry The Three.js geometry to add.
 */
google.maps.DotLayer.prototype.add = function(geometry) {
	this.scene.add(geometry);
};

/**
 * This method will clear the DotLayer
 */
google.maps.DotLayer.prototype.clear = function() {
	for (i = this.scene.children.length - 1; i >= 0; i--) {
		obj = this.scene.children[i];
		if (obj.is_ob) {
			this.scene.originalparticles = obj;
			this.scene.remove(obj);
		}
	}
	this.update();
};

/**
 * This method will redraw the DotLayer if you previously cleared it
 */
google.maps.DotLayer.prototype.redraw = function() {
	this.scene.add(this.scene.originalparticles);
	this.update();
};

/**
 * Helper method to convert for LatLng to vertex.
 * @param  {google.maps.LatLng} latLng - The LatLng to convert.
 * @return {THREE.Vector3} The resulting vertex.
 */
google.maps.DotLayer.prototype.fromLatLngToVertex = function(latLng) {
	var projection = this.map.getProjection(),
		point = projection.fromLatLngToPoint(latLng),
		vertex = new THREE.Vector3();
	vertex.x = point.x;
	vertex.y = point.y;
	vertex.location = latLng;
	vertex.z = 0;
	return vertex;
};

google.maps.DotLayer.prototype.generateSprite = function(dotcolor, size, renderer) {
	var canvas = document.createElement('canvas'),
		context = canvas.getContext('2d'),
		transform = {},
		x, y, grad;
	size = size || 20;
	//console.log('dotcolor is', dotcolor);
	color2 = dotcolor;
	color1 = dotcolor.replace(',0.99', ',0');

	if (renderer == 'WebGL') {

		canvas.width = 20;
		canvas.height = 20;
		x = 10;
		y = 10;
		grad = context.createRadialGradient(x, y, 0, x, y, 10);
		grad.addColorStop(0, color2);
		grad.addColorStop(0.4, color1);
		context.fillStyle = grad;
		context.fillRect(x - 6, y - 6, x + 6, y + 6);
		context.fillStyle = color2;
		context.beginPath();
		context.moveTo(x, y);
		context.arc(x, y - 6, 4, 0.3, Math.PI - 0.3, true);

	} else if (renderer == 'Canvas') {

		canvas.width = 180;
		canvas.height = 180;
		transform.xscale = size / 20;
		transform.yscale = size / 20;
		transform.dx = canvas.height / 2 - (transform.xscale * size / 2);
		transform.dy = canvas.height / 2 - (transform.yscale * size / 2);
		context.translate(3, -4);
		context.translate(transform.dx, transform.dy);
		context.scale(transform.xscale, transform.yscale);
		x = size / 2;
		y = size / 2;
		grad = context.createRadialGradient(x, y, 0, x, y, 12);
		grad.addColorStop(0, color2);
		grad.addColorStop(0.5, color1);
		context.fillStyle = grad;
		context.fillRect(x - 6, y - 6, x + 6, y + 6);
		context.fillStyle = color2;
		context.beginPath();
		context.moveTo(x, y);
		context.arc(x, y + 8, 5, -0.3, Math.PI + 0.3, false);
	}
	context.closePath();
	context.fill();
	context.strokeStyle = '#333333';
	context.stroke();
	return canvas;
};

google.maps.DotLayer.prototype.hextodecColor = function(hex) {
	if (!hex) return 'rgba(100,250,50,0.99)';
	var deccolor = [];
	deccolor.r = parseInt(hex.substring(0, 2), 16);
	deccolor.g = parseInt(hex.substring(2, 4), 16);
	deccolor.b = parseInt(hex.substring(4, 6), 16);
	return 'rgba(' + deccolor.r + ',' + deccolor.g + ',' + deccolor.b + ',0.99)';
};




google.maps.DotLayer.prototype.getDataSet = function() {
	return this.DataSet;
};

google.maps.DotLayer.prototype.setDataSet = function(DataSet) {
	this.DataSet = DataSet;
	// we define default value for needed properties
	DataSet.id_dataset = DataSet.id_dataset || 'dataset1337';
	DataSet.category = DataSet.category || 'dataset';
	DataSet.currentpoints = DataSet.currentpoints || 0;
	DataSet.visualizations = DataSet.visualizations || {};
	DataSet.visualizations.dotOptions = DataSet.visualizations.dotOptions || {};
	DataSet.color = DataSet.color || '#F00';
	DataSet.loadPoints = DataSet.loadPoints || function(callback) {
		var origin = [];
		this.forEach(function(element) {
			var position;
			// Let's check if the element is a position or at least has a position attribute.
			if (element.constructor == google.maps.LatLng) {
				position = element;
			} else {
				position = element.position || element.get('position');
			}
			origin.push(position);
		});
		if (callback) callback(origin);
	};
	DataSet.visualizations.dotOptions.color = DataSet.visualizations.dotOptions.color || 'rgba(240,50,90,0.99)';
	this.dotcolor = DataSet.visualizations.dotOptions.color || this.hextodecColor(DataSet.color);
	DataSet.dot = this;
	return true;
};




google.maps.DotLayer.prototype.createMaterial = function(origin) {

	//console.log('Origin is', origin);
	var self = this,
		DataSet = self.getDataSet(),
		particles,
		particleoptions;


	DataSet.loadPoints(function(origin) {
		self.origin = origin;

		if (self.renderertype == 'WebGL') {
			var geometry = new THREE.Geometry();
			self.texture = new THREE.Texture(self.generateSprite(self.dotcolor, 20, self.renderertype));
			self.texture.needsUpdate = true;

			// default particle options

			particleoptions = {
				size: DataSet.visualizations.dotOptions.size || 60,
				map: self.texture,
				opacity: DataSet.visualizations.dotOptions.opacity || 1,
				blending: THREE.AdditiveBlending,
				depthTest: true,
				transparent: true
			};

			self.material = new THREE.ParticleBasicMaterial(particleoptions);

			self.origin.forEach(function(element, index) {
				var vertex = self.fromLatLngToVertex(element);
				vertex.y = vertex.y; //- 0.0001;
				vertex.x = vertex.x; //- 0.00012;
				geometry.vertices.push(vertex);
			});
			particles = new THREE.ParticleSystem(geometry, self.material);

		} else {
			self.texture = new THREE.Texture(self.generateSprite(self.dotcolor, 20, self.renderertype));
			self.texture.needsUpdate = true;
			particleoptions = {
				size: DataSet.visualizations.dotOptions.size || 20,
				map: self.texture,
				opacity: DataSet.visualizations.dotOptions.opacity || 1,
				blending: THREE.NormalBlending,
				depthTest: false,
				transparent: true
			};

			particles = new THREE.Object3D();
			self.material = new THREE.SpriteMaterial(particleoptions);
			var projection = this.getProjection();

			self.origin.forEach(function(element, index) {
				geometry = new THREE.Sprite(self.material);
				geometry.position = self.fromLatLngToVertex(element);
				geometry.position.y = geometry.position.y - 0.0001;
				geometry.position.z = 0;
				particles.add(geometry);
			});

			self.material.size = 20;
		}

		self.material.dotcolor = self.dotcolor;
		self.material.map.needsUpdate = true;
		particles.is_ob = true;
		self.add(particles);
		self.setMap(self.options.map);
		if (self.options.controlbox) {
			self.addDotControls();
		}


		//console.log('ALL DONE');
		google.maps.event.trigger(self.options.map, "loadingcircle", {
			message: 'Getting data...',
			show: 0,
			container: self.options.container
		});

	});
};



google.maps.DotLayer.prototype.addDotControls = function() {
	var self = this,
		material = self.material,
		container = self.options.container || 'body',
		DataSet = self.getDataSet(),
		theguiid = '#dot' + DataSet.id_dataset;


	function updateOpacity(newValue) {
		DataSet.visualizations.dotOptions.opacity = newValue || 0;
		self.render();
	}

	function updateSize(newValue) {
		DataSet.visualizations.dotOptions.size = newValue || 0;
		self.render();
	}

	function updateColor(newValue) {
		DataSet.visualizations.dotOptions.color = newValue || 0;
		self.render();
	}

	require(['jquery', 'dat.gui'], function(jQuery, GUI) {

		jQuery('.dot', container).remove();

		if (jQuery('.dot', container).length === 0) {
			jQuery(container).prepend('<div class="dot"/>');
			var gui = new dat.GUI({
				autoPlace: false
			});
			var thegui = jQuery(gui.domElement);
			thegui.attr('id', 'dot' + DataSet.id_dataset);

			jQuery('.dot', container).append(thegui);
			if (jQuery('#dataset_' + DataSet.id_dataset).collapse) jQuery('#dataset_' + DataSet.id_dataset).collapse('show');

			var dotcontrols = gui.addFolder('Dot Controls');

			jQuery('.folder .dg li.title', thegui).append('<span class="pull-right"></span>');

			dotcontrols.addColor(material, 'dotcolor').onChange(function(value) {
				DataSet.dot.texture = new THREE.Texture(self.generateSprite(material.dotcolor, material.size, self.renderertype));
				DataSet.dot.texture.needsUpdate = true;
				material.map = self.texture;
				updateColor(value);
			}).onFinishChange(function(value) {
				google.maps.event.trigger(self.getMap(), "dataset_changed", {
					dataset: self.getDataSet(),
					from: 'Dot Controls'
				});

			});




			if (self.renderertype == 'WebGL') {
				dotcontrols.add(material, 'size', 2, 200).onChange(updateSize).onFinishChange(function(value) {
					google.maps.event.trigger(self.getMap(), "dataset_changed", {
						dataset: self.getDataSet(),
						from: 'Dot Controls'
					});
				});
			} else {
				dotcontrols.add(material, 'size', 2, 200).onChange(function(newValue) {
					DataSet.dot.texture = new THREE.Texture(self.generateSprite(material.dotcolor, material.size, self.renderertype));
					material.map = DataSet.dot.texture;
					updateSize(newValue);
				}).onFinishChange(function(value) {
					google.maps.event.trigger(self.getMap(), "dataset_changed", {
						dataset: self.getDataSet(),
						from: 'Dot Controls'
					});
				});
			}

			dotcontrols.add(material, 'opacity', 0.1, 1).listen().onChange(updateOpacity).onFinishChange(function(value) {
				google.maps.event.trigger(self.getMap(), "dataset_changed", {
					dataset: self.getDataSet(),
					from: 'Dot Controls'
				});
			});

			jQuery('.dot', container).data('controls', dotcontrols);
			dotcontrols.open();
		}


		jQuery('li.title .pull-right', theguiid).html('[' + Math.max(DataSet.currentpoints, self.origin.length) + ' data pts]');


	});
};