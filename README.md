# Leaflet.Clipper
Allows Union, Difference, Xor, and Intersection operations on two polygons. This is a Leaflet wrapper around [JSClipper](https://sourceforge.net/projects/jsclipper).

## Install
You'll need:
- `leaflet`: `>=1.0.0`
- `clipper-lib`: `^6.2.1`
- `leaflet-clipper`: `^1.0.0` That's this library.

## Quick Start

```javascript
var map = ...
var layer = ...


var drawState = new L.Clipper.OR( map, {
    featureGroup: layer,
    selectedPathOptions: {
        color: '#FF3399'
    }
} );
drawState.enable();
```

## Examples
- [Simple]()


## TODO
- [ ] npm
- [ ] bower
- [ ] Leaflet.draw integration
- [ ] Leaflet.Editable integration
- [ ] Extend functionality to circles