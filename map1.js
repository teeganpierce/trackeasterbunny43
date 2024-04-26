import fireEvent from "../../../utils/fireEvent"
import { MDBRadio, MDBRange } from "mdb-react-ui-kit"
import React, { useState } from "react"
import renderLSUnavailable from "./lsUnavail"
import renderGeoAPIUnavailable from "./geoAPIUnavail"

export default function MapSettings(props) {
    const [tempState, setTempState] = useState(0)
    const [settingsMgr, setSettingsMgr] = useState(props.settingsMgr)
    const [dataMgr, setDataMgr] = useState(props.dataMgr)

    const onRadioChange = (e) => {
        props.settingsMgr.set(e.currentTarget.name, e.currentTarget.value)
        setTempState(tempState + 1)
        fireEvent("alertShow", {message: "Your settings have been saved.", timeout: 5, severity: "success", nonblocking: false})
    }

    const getSetting = (key) => {
        return props.settingsMgr.get(key)
    }

    const setZLsetting = (e) => {
        props.settingsMgr.set("defaultZL", parseInt(e.currentTarget.value))
        setTempState(tempState + 1)
        fireEvent("alertShow", {message: "Your settings have been saved.", timeout: 5, severity: "success", nonblocking: false})
    }

    const renderGrayLines = () => {
        if (props.settingsMgr.is_chromium_browser()) {
            return (
                <>
                    <h5>Fix gray lines on map</h5>
                    <MDBRadio name='chromeMapFix' id='chromeMapFix-on' value={true} label='On' inline checked={getSetting("chromeMapFix")} onChange={onRadioChange} />
                    <MDBRadio name='chromeMapFix' id='chromeMapFix-off' value={false} label='Off' inline checked={!getSetting("chromeMapFix")} onChange={onRadioChange} /><br></br>
                    <small>If your page zoom or device scale is above 100%, you may see faint grey lines on the map. Enable this setting to attempt to hide them at the expense of slightly distorted map features (including baskets looking slightly misaligned) & missing zoom buttons.
                    </small>
                    <hr></hr>
                </>
            )
        } else {
            return (<></>)
        }
    }

    const renderDefaultZL = () => {
        if (props.settingsMgr.browser.platform.type === "mobile") {
            return "5"
        } else {
            return "6"
        }
    }

    const defaultZLpadding = () => {
        if (props.settingsMgr.browser.platform.type === "mobile") {
            return "43%"
        } else {
            return "51.5%"
        }
    }

    const renderDefaultZLText = () => {
        if (dataMgr.routeState === 0) {
            return "Sets the zoom level of the map when the tracker loads, when the map is centered, and when the Easter Bunny reaches/departs a stop. This setting will apply when the Easter Bunny's journey begins."
        } else if (dataMgr.routeState === 1) {
            return "Sets the zoom level of the map when the tracker loads, when the map is centered, and when the Easter Bunny reaches/departs a stop. Because we're in pre-tracking, this setting doesn't apply until tracking begins."
        } else if (dataMgr.routeState === 2) {
            return "Sets the zoom level of the map when the tracker loads, when the map is centered, and when the Easter Bunny reaches/departs a stop."
        } else if (dataMgr.routeState === 3) {
            return "Sets the zoom level of the map when the tracker loads, when the map is centered, and when the Easter Bunny reaches/departs a stop. Because tracking is over, this setting will apply for the next tracker run."
        }
    }

    const renderBouncingEffectText = () => {
        if (dataMgr.routeState <= 1) {
            return "Enable a bouncing effect for the Easter Bunny while en-route to stops during tracking. This setting will apply when tracking begins."
        } else if (dataMgr.routeState === 2) {
            return "Enable a bouncing effect for the Easter Bunny while en-route to stops. The Easter Bunny won't bounce when arrived at a stop."
        } else if (dataMgr.routeState === 3) {
            return "Enable a bouncing effect for the Easter Bunny while en-route to stops during tracking. Because tracking is over, this setting won't apply until the next tracker run."
        }
    }

    setTimeout(() => {
        document.getElementById("defaultZL").value = `${settingsMgr.get("defaultZL_actual")}`
    }, 3)

    return (
        <>
            {renderLSUnavailable(settingsMgr.ls_available)}
            {renderGeoAPIUnavailable(props.geoMetricsErrorState)}
            <h5>Map style</h5>
            <MDBRadio name='mapMode' id='mapMode-street' value='street' label='Street' inline checked={getSetting("mapMode") === "street"} onChange={onRadioChange} />
            <MDBRadio name='mapMode' id='mapMode-satellite' value='satellite' label='Satellite' inline checked={getSetting("mapMode") === "satellite"} onChange={onRadioChange} />
            <MDBRadio name='mapMode' id='mapMode-hybrid' value='hybrid' label='Hybrid' inline checked={getSetting("mapMode") === "hybrid"} onChange={onRadioChange} /><br></br>
            <small>Change the map style. Street mode will adapt to light/dark mode appearance settings.</small>
            <hr></hr>
            <h5>Easter Bunny bouncing effect</h5>
            <MDBRadio name='bunnyBounce' id='bunnyBounce-on' value={true} label='On' inline checked={getSetting("bunnyBounce")} onChange={onRadioChange} />
            <MDBRadio name='bunnyBounce' id='bunnyBounce-off' value={false} label='Off' inline checked={!getSetting("bunnyBounce")} onChange={onRadioChange} /><br></br>
            <small>{renderBouncingEffectText()}</small>
            <hr></hr>
            <h5>Zoom in on stop arrival</h5>
            <MDBRadio name='zoomOnStopArrival' id='zoomOnStopArrival-on' value={true} label='On' inline checked={getSetting("zoomOnStopArrival")} onChange={onRadioChange} />
            <MDBRadio name='zoomOnStopArrival' id='zoomOnStopArrival-off' value={false} label='Off' inline checked={!getSetting("zoomOnStopArrival")} onChange={onRadioChange} /><br></br>
            <small>Change whether the tracker zooms in when the Easter Bunny arrives at a stop and zooms out when departing a stop. Turn this off if you're recording a timelapse of the tracker, if the zoom animation lags on your device, or if you want to reduce data usage.</small>
            <hr></hr>
            { renderGrayLines() }
            <h5>Default zoom level</h5>
            <div>
                <small style={{ float: "left" }}>0</small>
                <small style={{ left: `${defaultZLpadding()}`, position: "relative", bottom: "0.2rem"}}>{renderDefaultZL()}</small>
                <small style={{ float: "right"}}>11</small>
            </div>
            <MDBRange name='defaultZL' id='defaultZL' defaultValue={settingsMgr.get("defaultZL_actual").toString()} onChange={setZLsetting} min="0" max="11" />
            <small>The map will be at zoom level <b>{getSetting("zoomOnStopArrival") ? getSetting("defaultZL_actual") + 3 : getSetting("defaultZL_actual")}</b> when the Easter Bunny is arrived at a stop.</small><br></br><br></br>
            <small>{renderDefaultZLText()}</small>
            <hr></hr>
            <h5>Show arrival times when hovering over stop icons</h5>
            <MDBRadio name='arrivalTimesHoverOver' id='arrivalTimesHoverOver-on' value={true} label='On' inline checked={getSetting("arrivalTimesHoverOver")} onChange={onRadioChange} />
            <MDBRadio name='arrivalTimesHoverOver' id='arrivalTimesHoverOver-off' value={false} label='Off' inline checked={!getSetting("arrivalTimesHoverOver")} onChange={onRadioChange} /><br></br>
            <small>Change whether or not arrival times are shown when hovering over stop icons on the map. Enabling this setting will slow down initial tracker loading.</small>
        </>
    )
}
