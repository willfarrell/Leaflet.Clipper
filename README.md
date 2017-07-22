# Leaflet.Clipper
Allows Union, Difference, Xor, and Intersection operations on two polygons. This is a Leaflet wrapper around [JSClipper](https://sourceforge.net/projects/jsclipper).

## Install
You'll need:
- `leaflet`: `>=1.1.0`
- `clipper-lib`: `^6.2.1`
- `leaflet-clipper`: `^1.1.0` That's this library.

Need to run with an older version? Let me know, there was a breaking change regarding [Mixin.Events](https://github.com/Leaflet/Leaflet/issues/2280). Easy to modify.

## [Demo](https://willfarrell.github.io/Leaflet.Clipper)
## Usage

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
drawState.disable();
```

## TODO
- [ ] bower
- [ ] Add back in tooltip support
- [ ] Leaflet.draw integration
- [ ] Leaflet.Editable integration
- [ ] Extend functionality to circles

## Credits
- Original version written for [MyMobileCoverage](http://www.mymobilecoverage.com/)
