import React from "react"
import "./Map.css"
import fireEvent from "../../utils/fireEvent"
import timeFormat from "../../TimeFormatter/TimeFormatter";

// Probably the rowdiest method of them all because everything here directly interfaces with the GMap. Sorry.

class MapBase extends React.Component {
    constructor(props) {
        super(props)
        this.map = null;
        this.mapov = null;
        this.dataMgr = props.dataMgr;
        this.settingsMgr = props.settingsMgr;
        this.bunny_position = null;
        this.scaffolded = 0
        this.scaffold_in_progress = false;
        this.map_mode = "street"
        this.gMapsLoaded = props.gMapsLoaded
        this.lastStopStateChange = -1
        this.lastMapUpdate = -1

        this.markers = {}

        this.old_iw = window.innerWidth
        this.old_ih = window.innerHeight
        this.old_window_orienation = window.orientation

        this.gmap_styles_satellite = [{"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},{"featureType":"administrative.neighborhood","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"poi.business","stylers":[{"visibility":"off"}]},{"featureType":"road","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"road.arterial","stylers":[{"visibility":"off"}]},{"featureType":"road.highway","stylers":[{"visibility":"off"}]},{"featureType":"road.highway","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road.local","stylers":[{"visibility":"off"}]},{"featureType":"transit","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"labels","stylers":[{"visibility":"off"}]}]
        this.gmap_styles_light = [{"featureType":"administrative.land_parcel","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"road.local","elementType":"labels","stylers":[{"visibility":"on"}]},{"featureType":"transit","stylers":[{"visibility":"on"}]},{"featureType":"transit","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit.station.airport","stylers":[{"visibility":"on"}]},{"featureType":"transit.station.airport","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit.station.airport","elementType":"labels.text","stylers":[{"visibility":"simplified"}]}]
        this.gmap_styles_dark = [{"elementType":"geometry","stylers":[{"color":"#212121"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#212121"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#2b2b2b"}]},{"featureType":"administrative.country","elementType":"geometry","stylers":[{"color":"#8f8f8f"}]},{"featureType":"administrative.country","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]},{"featureType":"administrative.land_parcel","stylers":[{"visibility":"off"}]},{"featureType":"administrative.land_parcel","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#bdbdbd"}]},{"featureType":"administrative.province","elementType":"geometry","stylers":[{"color":"#585858"}]},{"featureType":"landscape.man_made","elementType":"geometry.stroke","stylers":[{"color":"#8b8e8f"}]},{"featureType":"landscape.natural.terrain","stylers":[{"visibility":"on"}]},{"featureType":"poi","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"poi.business","stylers":[{"visibility":"off"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#181818"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"poi.park","elementType":"labels.text.stroke","stylers":[{"color":"#1b1b1b"}]},{"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#2c2c2c"}]},{"featureType":"road","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#8a8a8a"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#373737"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#3c3c3c"}]},{"featureType":"road.highway.controlled_access","elementType":"geometry","stylers":[{"color":"#4e4e4e"}]},{"featureType":"road.local","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"transit","stylers":[{"visibility":"on"}]},{"featureType":"transit","elementType":"labels.icon","stylers":[{"color":"#cdcdcd"},{"visibility":"off"}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"color":"#393939"}]},{"featureType":"transit.station.airport","stylers":[{"visibility":"on"}]},{"featureType":"transit.station.airport","elementType":"geometry","stylers":[{"visibility":"on"}]},{"featureType":"transit.station.airport","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#2b2b2b"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#3d3d3d"}]}]
    }

    lowheight_shift(bypass_oldih) {
        // Please note. This method is truly one of a kind. I hate it. It sucks.

        // tBM = third Box Metric? I don't know why it's named this. But it's by how much we have to "offset" the availabile window height depending
        // on the number of metrics visible, but only for mobile devices.
        let tBM = 0
        if (window.innerWidth <= 576) {
            if (this.dataMgr.routeState === 1) {
                // During pre-tracking, there's a good reason to have a pre-set TBM - the text messages can get pretty lengthy.
                if (this.settingsMgr.settings.mobileMetricsVisible) {
                    tBM = 50
                } else {
                    tBM = 25
                }
            } else if (this.dataMgr.routeState >= 2) {
                // If mobile metrics are visible (yes, you can turn them off), apply the TBM offset. 
                if (this.settingsMgr.settings.mobileMetricsVisible) {
                    tBM = (this.settingsMgr.settings.thirdBox.length) * 25
                }
            }
        }

        if ((window.innerHeight - tBM) === this.old_ih && !bypass_oldih) {
            return
        }

        // Because one third box metric is defined at 25px, this entire system begins to run at 576px
        // This code seems to work pretty well - the cutoff for which offset factor is determined by taking inner height and subtracting by number of metrics
        // visible. But then the amount to offset is inner height plus the metrics height offset.
        // In short: try NOT to modify this code.
        if ((window.innerHeight - tBM) > 551 && this.old_ih <= 551) {
            this.map.panBy(0, this.pxoffset)
            this.oldpxoffset = this.pxoffset
            this.pxoffset = 0
        } else if ((window.innerHeight - tBM) <= 551) {
            this.oldpxoffset = this.pxoffset
            if ((window.innerHeight - tBM) >= 500) {
                // 500px - 549px
                this.pxoffset = (window.innerHeight + tBM) * 0.15
            } else if ((window.innerHeight - tBM) >= 400) {
                // 400px - 499px
                this.pxoffset = (window.innerHeight + tBM) * 0.20
            } else if ((window.innerHeight - tBM) >= 350) {
                // 350px - 400px
                this.pxoffset = (window.innerHeight + tBM) * 0.25
            } else if ((window.innerHeight - tBM) >= 300) {
                // 300px - 350px
                this.pxoffset = (window.innerHeight + tBM) * 0.30
            } else {
                // 299px or less
                this.pxoffset = (window.innerHeight + tBM) * 0.35
            }

            if (this.old_ih <= 551) {
                this.map.panBy(0, -(this.pxoffset - this.oldpxoffset))
            } else {
                this.map.panBy(0, -this.pxoffset)
            }
        } else {
            // Don't do anything
        }

        // We have to scrollTo on safari when the orientation changes.
        if ((this.old_window_orienation === 0 && (window.orientation === -90 || window.orientation === 90) && window.innerHeight < 520) || ((this.old_window_orienation === -90 || this.old_window_orienation === 90) && window.orientation === 0)) {
            if (this.settingsMgr.browser.browser.name === "Safari" || this.settingsMgr.browser.os.name === "iOS") {
                setTimeout(function () {
                    window.scrollTo(0, 1)
                }, 50)
            }
        }

        this.old_ih = (window.innerHeight - tBM)
        this.old_iw = window.innerWidth
        this.old_window_orienation = window.orientation
    }

    renderBasketTitle(index) {
        if (this.settingsMgr.get("arrivalTimesHoverOver")) {
            let prevstop_data = this.dataMgr.getStopInfo(index - 1)
            let stopdata = this.dataMgr.getStopInfo(index)
            let nextstop_data = this.dataMgr.getStopInfo(index + 1)
            let timestr = timeFormat(prevstop_data.unixarrival, stopdata.unixarrival, nextstop_data.unixarrival, "marker", undefined, undefined, this.settingsMgr)
            return `${stopdata['city']}${stopdata['region'] !== '' ? ', ' + stopdata['region'] : ''}\nArrived: ${timestr}\nFor more info, click on this basket!`
        } else {
            let stopdata = this.dataMgr.getStopInfo(index)
            return `${stopdata['city']}${stopdata['region'] !== '' ? ', ' + stopdata['region'] : ''}\nFor more info, click on this basket!`
        }
    }

    // This is async so that we can render markers to the map MUCH faster.
    renderBasketIcon(index) {
        // If we already have a marker at the destination, return undefined
        try {
            if (this.markers[index] !== undefined) {
                return
            }
        } catch (e) {
            // Do nothing if we catch an error.
        }

        // If this is a PT stop (or end of route), set the marker to null and call it a day
        if (index === this.dataMgr.route.length - 1 || index <= this.dataMgr.ptEnds + 1) {
            this.markers[index] = null
            return
        }
        let stopdata = this.dataMgr.getStopInfo(index)
        let marker = new window.google.maps.Marker({
            position: {lat: stopdata['lat'], lng: stopdata['lng']},
            map: this.map,
            title: this.renderBasketTitle(index),
            icon: this.dataMgr.getStopInfo(index).city === "International Space Station" ? this.iss_icon : this.basket_icon,
            zIndex: index,
        })

        window.google.maps.event.addListener(marker, 'click', (function (marker, datarow) {
            return function() {
                fireEvent("esdLaunch_tap", {index: datarow})
            }
        })(marker, index))

        this.markers[index] = marker
    }

    rerenderBasketTitles() {
        for (let i = 0; i < this.dataMgr.routeLength; i++) {
            if (this.markers[i] !== null && this.markers[i] !== undefined) {
                this.markers[i].setTitle(this.renderBasketTitle(i))
            }
        }
    }

    onRouteStateChange(e) {
        if (e.detail.state === 2) {
            this.map.setZoom(this.settingsMgr.get("defaultZL_actual"))
        } else if (e.detail.state === 3) {
            this.onMapUpdate(e, "stopDep")
            setTimeout(() => {
                this.onMapUpdate(e, "stopDep")
            }, 750)
            this.bunnyMarker.setAnimation()
        }
        // Call LHS on route state change since number of metrics visible changes when the route state changes.
        this.lowheight_shift(true)
    }

    onStopArrival(e) {
        this.lastStopStateChange = e.detail.ts
        this.bunnyMarker.setIcon(this.bunny_icon_bounce)
        this.bunnyMarker.setAnimation()
        this.onMapUpdate(e)
        if (this.settingsMgr.map_centered && this.settingsMgr.settings.zoomOnStopArrival) {
            this.map.setZoom(this.settingsMgr.get("defaultZL_actual") + 3)
        }
    }

    onStopDeparture(e) {
        this.lastStopStateChange = e.detail.ts
        this.renderBasketIcon(e.detail.id)
        this.onMapUpdate(e, "stopDep")
        // Because we can now receive on stop departure async, just completely tune out the rest of this if we're actually on Next Stop 1
        // Leaving this line in. I don't know why this is here. But it is.
        if (this.dataMgr.nextStopState === 1) {
            return
        }

        this.bunnyMarker.setIcon(this.bunny_icon)
        // There's a new condition here for this to only fire when routeState is 2
        // That else MAY cause some issues but we'll see...?
        if (this.settingsMgr.get("bunnyBounce") && this.dataMgr.routeState === 2) {
            this.bunnyMarker.setAnimation(window.google.maps.Animation.BOUNCE)
        } else {
            this.bunnyMarker.setAnimation()
        }

        if (this.settingsMgr.map_centered && this.dataMgr.routeState === 2 && this.settingsMgr.settings.zoomOnStopArrival) {
            this.map.setZoom(this.settingsMgr.get("defaultZL_actual"))
        }
    }

    onMapUpdate(e, context) {
        if (e.detail.ts - this.lastStopStateChange < 1) {
            if (e.detail.ts - this.lastMapUpdate < 0.2 && this.settingsMgr.settings.zoomOnStopArrival && this.settingsMgr.map_centered) {
                return
            } else {
                this.lastMapUpdate = e.detail.ts
            }
        }

        this.bunny_position = this.dataMgr.getEasterBunnyPosition(e.detail.ts)
        let bunnyLatLng = new window.google.maps.LatLng(this.bunny_position.lat, this.bunny_position.lng)
        let offpoint;
        try {
            offpoint = this.mapov.getProjection().fromLatLngToContainerPixel(bunnyLatLng)
        } catch (e) {
            return
        }
        offpoint.y = offpoint.y - this.pxoffset;
        this.bunnyMarker.setPosition(bunnyLatLng)
        if (this.dataMgr.routeState === 1 || ((this.dataMgr.routeState === 2 || context === "stopDep") && this.settingsMgr.map_centered) || this.dataMgr.routeState === 3) {
            if (this.dataMgr.routeState === 1 || this.dataMgr.routeState === 3) {
                this.map.setZoom(3)
            }
            this.map.setCenter(this.mapov.getProjection().fromContainerPixelToLatLng(offpoint))
        }
    }

    changeMapStyle() {
        let appearance = this.settingsMgr.get("appearance_actual")
        let map_mode = this.settingsMgr.get("mapMode")
        if (map_mode === "street") {
            if (appearance === "dark") {
                this.map.setOptions({
                    mapTypeId: window.google.maps.MapTypeId.ROADMAP,
                    styles: this.gmap_styles_dark
                })
            } else if (appearance === "light") {
                this.map.setOptions({
                    mapTypeId: window.google.maps.MapTypeId.ROADMAP,
                    styles: this.gmap_styles_light
                })
            }
        } else if (map_mode === "hybrid") {
            this.map.setOptions({
                mapTypeId: window.google.maps.MapTypeId.HYBRID,
                styles: this.gmap_styles_satellite
            })
        } else if (map_mode === "satellite") {
            this.map.setOptions({
                mapTypeId: window.google.maps.MapTypeId.SATELLITE,
                styles: this.gmap_styles_satellite
            })
        }
    }

    changeDefaultZL() {
        if (this.settingsMgr.map_centered && this.dataMgr.routeState === 2 && this.dataMgr.nextStopState === 0) {
            this.map.setZoom(this.settingsMgr.get("defaultZL_actual"))
        } else if (this.settingsMgr.map_centered && this.dataMgr.routeState === 2 && this.dataMgr.nextStopState === 1) {
            if (this.settingsMgr.settings.zoomOnStopArrival) {
                this.map.setZoom(this.settingsMgr.get("defaultZL_actual") + 3)
            } else {
                this.map.setZoom(this.settingsMgr.get("defaultZL_actual"))
            }
        }
    }

    changeBunnyBounce() {
        if (this.dataMgr.routeState === 2) {
            if (this.dataMgr.nextStopState === 0) {
                if (this.settingsMgr.get("bunnyBounce")) {
                    this.bunnyMarker.setAnimation(window.google.maps.Animation.BOUNCE)
                } else {
                    this.bunnyMarker.setAnimation()
                }
            } else {
                this.bunnyMarker.setAnimation()
            }
        } else {
            this.bunnyMarker.setAnimation()
        }
    }

    changeChromeMapFix() {
        let elems = document.getElementsByClassName("gm-style")
        for (const elem of elems) {
            if (this.settingsMgr.settings.chromeMapFix) {
                elem.dataset.chromemapfix = "true"
            } else {
                elem.dataset.chromemapfix = "false"
            }
        }
    }

    changeStopArrivalZoom() {
        // Ah yes, if the zoom on stop arrival is on, and the route state is 2, AND we're at a stop, AND if the map is centered, yes, zoom in the map you goon.
        if (this.settingsMgr.settings.zoomOnStopArrival && this.dataMgr.routeState === 2 && this.dataMgr.nextStopState === 1 && this.settingsMgr.map_centered) {
            this.map.setZoom(this.settingsMgr.get("defaultZL_actual") + 3)
        } else if (!this.settingsMgr.settings.zoomOnStopArrival && this.dataMgr.routeState === 2 && this.dataMgr.nextStopState === 1 && this.settingsMgr.map_centered) {
            this.map.setZoom(this.settingsMgr.get("defaultZL_actual"))
        }
        // Fire on map update so shifting can occur
        this.onMapUpdate({detail: {ts: new Date().getTime() / 1000}})
    }

    onSettingChange(e) {
        if (e.detail.setting === "mapMode") {
            this.changeMapStyle()
        } else if (e.detail.setting === "bunnyBounce") {
            this.changeBunnyBounce()
        } else if (e.detail.setting === "defaultZL") {
            this.changeDefaultZL()
        } else if (e.detail.setting === "chromeMapFix") {
            this.changeChromeMapFix()
        } else if (e.detail.setting === "zoomOnStopArrival") {
            this.changeStopArrivalZoom()
        } else if (e.detail.setting === "thirdBox" || e.detail.setting === "mobileMetricsVisible") {
            this.lowheight_shift(true)
        } else if (e.detail.setting === "arrivalTimesHoverOver") {
            this.rerenderBasketTitles()
        } else if (e.detail.setting === "smoothMovement") {
            this.bunny_icon_bounce.url = this.settingsMgr.get_bunnyarrival_imagesrc()
            // Reset the icon with the new src to show an update in real time. Otherwise the smooth icon setting will get applied
            // the next time the bunny icon is on screen.
            this.bunnyMarker.setIcon(this.dataMgr.nextStopState === 1 ? this.bunny_icon_bounce : this.bunny_icon)
        }
    }

    onBulkStopUpdate(e) {
        for (let i = e.detail.start; i <= e.detail.end; i++) {
            this.renderBasketIcon(i)
        }
    }

    onMapCenterStateChange(e) {
        if (e.detail.state) {
            e.detail['ts'] = new Date().getTime() / 1000
            this.onMapUpdate(e)
            if (this.dataMgr.nextStopState === 1) {
                this.map.setZoom(this.settingsMgr.get("defaultZL_actual") + 3)
            } else {
                this.map.setZoom(this.settingsMgr.get("defaultZL_actual"))
            }
        }
    }

    onESDLaunch(e) {
        if (this.dataMgr.routeState === 3 || !this.settingsMgr.map_centered) {
            let stopdata = this.dataMgr.getStopInfo(e.detail.index)
            let stopLatLng = new window.google.maps.LatLng(stopdata.lat, stopdata.lng)
            let offpoint = this.mapov.getProjection().fromLatLngToContainerPixel(stopLatLng)
            offpoint.y = offpoint.y - this.pxoffset;
            this.map.panTo(this.mapov.getProjection().fromContainerPixelToLatLng(offpoint))
        }
    }

    onAppearanceChange(e) {
        this.changeMapStyle()
    }

    scaffoldMapBase() {
        this.map_settings = {
            center: {lat: 0, lng: 0},
            zoomControl: true,
            zoomControlOptions: {
                position: window.google.maps.ControlPosition.LEFT_RIGHT,
            },
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            tilt: 0,
            rotateControl: false,
            keyboardShortcuts: false
        }

        this.bunny_icon = {
            url: `/assets/icons/bunny-120.png`,
            scaledSize: new window.google.maps.Size(60, 60)
        }

        this.bunny_icon_bounce = {
            url: this.settingsMgr.get_bunnyarrival_imagesrc(),
            scaledSize: new window.google.maps.Size(60, 60)
        }

        this.basket_icon = {
            url: `/assets/icons/basket-96.png`,
            scaledSize: new window.google.maps.Size(24, 24)
        }

        this.iss_icon = {
            url: `/assets/icons/iss-96-3.png`,
            scaledSize: new window.google.maps.Size(24, 24)
        }

        this.bunnyMarker = null;
        
        this.pxoffset = 0;
        this.oldpxoffset = 0;

        // Just temporarily here we need to update the position. Otherwise we call the appearance change/route state change
        // to ensure everything is good with the map
        this.bunny_position = this.dataMgr.getEasterBunnyPosition(new Date().getTime() / 1000)
        this.map_settings.center = {lat: this.bunny_position.lat, lng: this.bunny_position.lng}
        if (this.dataMgr.routeState === 1 || this.dataMgr.routeState === 3) {
            this.map_settings.zoom = 3
        } else if (this.dataMgr.routeState === 2) {
            this.map_settings.zoom = (this.dataMgr.nextStopState === 1 && this.settingsMgr.get("zoomOnStopArrival")) ? this.settingsMgr.get("defaultZL_actual") + 3 : this.settingsMgr.get("defaultZL_actual")
        }
        this.map = new window.google.maps.Map(document.getElementById("map"), this.map_settings)
        this.changeMapStyle()
        this.mapov = new window.google.maps.OverlayView()
        this.mapov.onAdd = function () {}
        this.mapov.draw = function () {}
        this.mapov.setMap(this.map)

        let marker_settings = {
            position: {lat: this.bunny_position.lat, lng: this.bunny_position.lng},
            map: this.map,
            icon: this.dataMgr.nextStopState === 1 ? this.bunny_icon_bounce : this.bunny_icon,
            clickable: false,
            zIndex: 2000,
            optimized: false,
            animation: (this.settingsMgr.settings.bunnyBounce && this.dataMgr.routeState === 2 && this.dataMgr.nextStopState === 0) ? window.google.maps.Animation.BOUNCE : null
        }

        this.bunnyMarker = new window.google.maps.Marker(marker_settings)

        document.addEventListener("mapUpdate", this.onMapUpdate.bind(this))
        document.addEventListener("routeStateChange", this.onRouteStateChange.bind(this))
        document.addEventListener("stopArrival", this.onStopArrival.bind(this))
        document.addEventListener("stopDeparture", this.onStopDeparture.bind(this))
        document.addEventListener("settingChanged", this.onSettingChange.bind(this))
        document.addEventListener("appearanceChanged", this.onAppearanceChange.bind(this))
        document.addEventListener("centeredStateChanged", this.onMapCenterStateChange.bind(this))
        document.addEventListener("esdLaunch", this.onESDLaunch.bind(this))
        document.addEventListener("bulkStopUpdate", this.onBulkStopUpdate.bind(this))
        window.addEventListener("resize", function() {
            setTimeout(this.lowheight_shift.bind(this), 600)
        }.bind(this))

        for (let i = 0; i <= this.dataMgr.lastStopId; i++) {
            this.renderBasketIcon(i)
        }

        // Call low height shift on map load to hopefully fix a bug
        this.lowheight_shift(true)

        // Mutation observer to wait for gm-style elements to roll in to set chrome map fix to true onload
        let observer = new MutationObserver((mutations, mutationInstance) => {
            let gm_style = document.getElementsByClassName("gm-style")
            if (gm_style.length > 0) {
                this.changeChromeMapFix()
                mutationInstance.disconnect()
            }
        })

        observer.observe(document, {
            childList: true,
            subtree: true
        })
        

        this.scaffolded = 1
        this.scaffold_in_progress = false
    }

    onGMapsLoaded(e) {
        document.removeEventListener("gMapsLoaded", this.onGMapsLoaded.bind(this))
        this.gMapsLoaded = true
        this.componentDidMount()
    }

    componentDidMount() {
        // If gmapsloaded is false do not mount the component.
        if (this.scaffolded !== 0 || this.scaffold_in_progress) {
            // If we already scaffolded and we're remounting do nothing.
            return
        } else if (!this.gMapsLoaded) {
            // If if we haven't scaffolded but GMaps isn't ready, listen for when it is
            document.addEventListener("gMapsLoaded", this.onGMapsLoaded.bind(this))
        } else {
            // If we mounted and GMaps is ready (or componentDidMount was called again from onGMapsLoaded), scaffold
            this.scaffold_in_progress = true
            this.scaffoldMapBase()
        }
    }

    render() {
        return (
            <div id="map"></div>
        )
    }
}

