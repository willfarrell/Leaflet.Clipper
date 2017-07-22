/*global L:true, ClipperLib:true */
L.Clipper = L.Evented.extend({

    options: {
    	//featureGroup: new L.FeatureGroup(),
        selectedPathOptions: {
            color: '#FF3399'
        }
    },

	initialize: function (map, options) {
        L.Handler.prototype.initialize.call(this, map);

        L.Util.setOptions(this, options);

        if (!(this.options.featureGroup instanceof L.FeatureGroup)) {
            throw new Error('options.featureGroup must be a L.FeatureGroup');
        }
    },

	enable: function () {
		if (this._enabled || !this._hasAvailableLayers()) {
			return;
		}
		this.fire('enabled', {handler: this.type});
			// this disable other handlers

		this._map.fire('draw:joinstart', { handler: this.type });
			// allow drawLayer to be updated before beginning edition.

		L.Handler.prototype.enable.call(this);
		this.options.featureGroup
			.on('layeradd', this._enableLayerEdit, this)
			.on('layerremove', this._disableLayerEdit, this);
	},

	disable: function () {
		if (!this._enabled) { return; }
		this.options.featureGroup
			.off('layeradd', this._enableLayerJoin, this)
			.off('layerremove', this._disableLayerJoin, this);
		L.Handler.prototype.disable.call(this);
		this._map.fire('draw:editstop', { handler: this.type });
		this.fire('disabled', {handler: this.type});
	},

	addHooks: function () {
		var map = this._map;

		if (map) {
			map.getContainer().focus();

			this.options.featureGroup.eachLayer(this._enableLayerEdit, this);

			// Leaflet.draw specific
			//this._tooltip = new L.tooltip(this._map);
			//this._tooltip.updateContent(this._getTooltipText());

			// this._map.on('mousemove', this._onMouseMove, this);
		}
	},

	removeHooks: function () {
		if (this._map) {
			// Clean up selected layers.
			this.options.featureGroup.eachLayer(this._disableLayerEdit, this);

			// Clear the backups of the original layers
			this._uneditedLayerProps = {};

			this._tooltip.dispose();
			this._tooltip = null;

			this._map.off('mousemove', this._onMouseMove, this);
		}
	},

	revertLayers: function () {
		this.options.featureGroup.eachLayer(function (layer) {
			this._revertLayer(layer);
		}, this);
	},

	save: function () {
		var editedLayers = new L.LayerGroup();
		this.options.featureGroup.eachLayer(function (layer) {
			if (layer.edited) {
				editedLayers.addLayer(layer);
				layer.edited = false;
			}
		});
		this._map.fire('draw:edited', {layers: editedLayers});
	},

	_revertLayer: function (layer) {
		var id = L.Util.stamp(layer);
		layer.edited = false;
		if (this._uneditedLayerProps.hasOwnProperty(id)) {
			// Polyline, Polygon or Rectangle
			if (layer instanceof L.Polyline || layer instanceof L.Polygon || layer instanceof L.Rectangle) {
				layer.setLatLngs(this._uneditedLayerProps[id].latlngs);
			} else if (layer instanceof L.Circle) {
				layer.setLatLng(this._uneditedLayerProps[id].latlng);
				layer.setRadius(this._uneditedLayerProps[id].radius);
			} else if (layer instanceof L.Marker) { // Marker
				layer.setLatLng(this._uneditedLayerProps[id].latlng);
			}
		}
	},

	_enableLayerEdit: function (e) {
		var layer = e.layer || e.target || e;

		layer.on('click', this._subjectLayer, this);
	},

	_disableLayerEdit: function (e) {
		var layer = e.layer || e.target || e;

		layer.off('click');
	},

    // Only supported in Leaflet.draw
	/*_getTooltipText: function () {
		var labelText;

		if (!this._subject) {
			labelText = {
				text: 'Choose a subject layer.'
			};
		} else {
			labelText = {
				text: 'Choose a clipper layer.'
			};
		}
		return labelText;
	},*/

	_onMouseMove: function (e) {
		this._tooltip.updatePosition(e.latlng);
	},

	_hasAvailableLayers: function () {
		return this.options.featureGroup.getLayers().length !== 0;
	},

	_subjectLayer: function(e) {
		var layer = e.layer || e.target || e;

		if (!this._subject) {
			this._subject = layer;
		} else {
			this._clipperLayer(e);
		}
		layer.setStyle(this.options.selectedPathOptions);
	},

	_clipperLayer: function(e) {
		var layer = e.layer || e.target || e;

		this._clipper = layer;
		layer.setStyle(this.options.selectedPathOptions);
		this._layerClip();
	},
	
	_layerClip: function() {
		
		var subjCoords = this._subject.getLatLngs();
		var clipCoords = this._clipper.getLatLngs();

		var subj = this._coordsToPoints(subjCoords);
		var clip = this._coordsToPoints(clipCoords);

		var solution = ClipperLib.Paths();
		
		var cpr = new ClipperLib.Clipper();

		for(var s = 0, slen = subj.length; s<slen; s++) {
            cpr.AddPaths(subj[s], ClipperLib.PolyType.ptSubject, true);
		}
        for(var c = 0, clen = clip.length; c < clen; c++) {
            cpr.AddPaths(clip[c], ClipperLib.PolyType.ptClip, true);
        }

		cpr.Execute(this._cliptype, solution);
		
		this._solution = L.polygon( this._pointsToCoords([solution], true) );
					
		this.options.featureGroup.addLayer(this._solution);
		this.options.featureGroup.removeLayer(this._subject);
		this.options.featureGroup.removeLayer(this._clipper);
		
		this._subject = null;
		this._clipper = null;
	},
	
	/*
	--- ClipperJS ---
	Add in ability to convert coords or latlngs to x,y points
	to be used by clipperjs
	
	4503599627370495 min/max
	180.1234567890123 min/max
	
	*/
	_pointAmplifier: function() {
		return Math.pow(10,13);
	},
	
	// coord: [lng, lat] / [x, y]
	// latlng: [lat, lng] / { lat:lat, lng:lng }
	// point: { X:x, Y:y }
	// polygons: [
	//   [	// polygon
	//   	coords,
	//		holes
	//   ]
	// ]

	_coordsToPoints: function (polygons, latlng) {
		var points = [], amp = this._pointAmplifier();

        for (var i = 0, ilen = polygons.length; i < ilen; i++) {
        	points.push([]);
            for (var j = 0, jlen = polygons[i].length; j < jlen; j++) {
            	var coords = polygons[i][j];
                points[i].push([]);
                for (var k = 0, klen = coords.length; k < klen; k++) {
                    var coord = coords[k];
                    if (Array.isArray(coord)) {
                        if (latlng) {
                            points[i][j].push({X: Math.round(coord[1] * amp), Y: Math.round(coord[0] * amp)});
                        } else {
                            points[i][j].push({X: Math.round(coord[0] * amp), Y: Math.round(coord[1] * amp)});
                        }
                    } else {
                        points[i][j].push({X: Math.round(coord.lng * amp), Y: Math.round(coord.lat * amp)});
                    }
                }
            }
        }

		return points;
	},

	_pointsToCoords: function (polygons, latlng) {
		var coords = [], amp = this._pointAmplifier();

        for (var i = 0, ilen = polygons.length; i < ilen; i++) {
            coords.push([]);
            for (var j = 0, jlen = polygons[i].length; j < jlen; j++) {
                var points = polygons[i][j];
                coords[i].push([]);
                for (var k = 0, klen = points.length; k < klen; k++) {
                    var point = points[k];
                    if (latlng) {
                        coords[i][j].push([point.Y / amp, point.X / amp]);
                    } else {
                        coords[i][j].push([point.X / amp, point.Y / amp]);
                    }
                }
            }
		}

		return coords;
	}
	// --- End ClipperJS --- //
});

L.Clipper.AND = L.Clipper.extend({
    // Save the type so super can fire, need to do this as cannot do this.TYPE :(
    _cliptype: ClipperLib.ClipType.ctIntersection
});
L.Clipper.Intersection = L.Clipper.AND;

L.Clipper.OR = L.Clipper.extend({
	_cliptype: ClipperLib.ClipType.ctUnion
});
L.Clipper.Union = L.Clipper.OR;

L.Clipper.NOT = L.Clipper.extend({
	_cliptype: ClipperLib.ClipType.ctDifference
});
L.Clipper.Difference = L.Clipper.NOT;

L.Clipper.XOR = L.Clipper.extend({
	_cliptype: ClipperLib.ClipType.ctXor
});
L.Clipper.Xor = L.Clipper.XOR;
