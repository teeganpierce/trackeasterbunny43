import { MDBCheckbox, MDBRadio } from "mdb-react-ui-kit"
import React, { useState } from "react"
import renderLSUnavailable from "./lsUnavail"
import renderGeoAPIUnavailable from "./geoAPIUnavail"

export default function MetricsSettings(props) {
    const [tempState, setTempState] = useState(0)
    const [settingsMgr, setSettingsMgr] = useState(props.settingsMgr) 

    const onRadioChange = (e) => {
        props.settingsMgr.set(e.currentTarget.name, e.currentTarget.value)
        setTempState(tempState + 1)
    }

    const onSettingCheckboxChange = (e) => {
        // Assuming that this emits checked?
        if (e.currentTarget.checked) {
            props.settingsMgr.thirdbox_add(e.currentTarget.value)
        } else {
            props.settingsMgr.thirdbox_remove(e.currentTarget.value)
        }

        setTempState(tempState + 1)
    }

    const getSetting = (key) => {
        return props.settingsMgr.get(key)
    }

    const renderNextStopLowHeight = () => {
        if (window.innerHeight <= 500 || window.innerWidth <= 330) {
            return (
                <>
                <b>Note: </b>Enabling this setting may cause the Easter Bunny icon to get obstructed and/or buttons to overlap the top boxes.<br></br><br></br>
                </>
            )
        } else {
            return (<></>)
        }
    }

    return (
        <>
            {renderLSUnavailable(settingsMgr.ls_available)}
            {renderGeoAPIUnavailable(props.geoMetricsErrorState)}
            <h5>Metrics shown</h5>
            <MDBCheckbox name='thirdBox' id='thirdBox-baskets' value='baskets' label='Baskets delivered' inline checked={getSetting("thirdBox").indexOf("baskets") !== -1} onChange={onSettingCheckboxChange} />
            <MDBCheckbox name='thirdBox' id='thirdBox-carrots' value='carrots' label='Carrots eaten' inline checked={getSetting("thirdBox").indexOf("carrots") !== -1} onChange={onSettingCheckboxChange} />
            <MDBCheckbox name='thirdBox' id='thirdBox-distancefromyou' value='distancefromyou' label='Distance from you' inline checked={getSetting("thirdBox").indexOf("distancefromyou") !== -1} onChange={onSettingCheckboxChange} />
            <MDBCheckbox name='thirdBox' id='thirdBox-distance' value='distance' label={settingsMgr.traveled_ls === 1 ? 'Distance traveled' : 'Distance travelled'} inline checked={getSetting("thirdBox").indexOf("distance") !== -1} onChange={onSettingCheckboxChange} />
            <MDBCheckbox name='thirdBox' id='thirdBox-speed' value='speed' label='Speed' inline checked={getSetting("thirdBox").indexOf("speed") !== -1} onChange={onSettingCheckboxChange} />
            <br></br>
            <small>Change the metrics shown during tracking. It is recommended to not show the distance from you metric if you are streaming the tracker.</small>
            <hr></hr>
            <h5>Show country flags in last seen & next stop boxes</h5>
            <MDBRadio name='arrivalFlags' id='arrivalFlags-on' value={true} label='On' inline checked={getSetting("arrivalFlags")} onChange={onRadioChange} />
            <MDBRadio name='arrivalFlags' id='arrivalFlags-off' value={false} label='Off' inline checked={!getSetting("arrivalFlags")} onChange={onRadioChange} /><br></br>
            <small>Control if country flags are shown in the last seen and next stop boxes.</small>
            <hr></hr>
            <h5>Hide value of distance from you metric</h5>
            <MDBRadio name='dfyDisabled' id='dfyDisabled-on' value={true} label='On' inline checked={getSetting("dfyDisabled")} onChange={onRadioChange} />
            <MDBRadio name='dfyDisabled' id='dfyDisabled-off' value={false} label='Off' inline checked={!getSetting("dfyDisabled")} onChange={onRadioChange} />
            <br></br>
            <small>Hides the value of the distance from you metric whenever it's visible. Turn this on if you're streaming the tracker to prevent accidentally exposing your location.</small>
            <hr></hr>
            <h5>Show metrics in next stop box</h5>
            <MDBRadio name='mobileMetricsVisible' id='mobileMetricsVisible-on' value={true} label='On' inline checked={getSetting("mobileMetricsVisible")} onChange={onRadioChange} />
            <MDBRadio name='mobileMetricsVisible' id='mobileMetricsVisible-off' value={false} label='Off' inline checked={!getSetting("mobileMetricsVisible")} onChange={onRadioChange} /><br></br>
            <small>{renderNextStopLowHeight()}Show metrics in the next stop box when only the next stop box is visible. This affects the visibility of metrics during pre-tracking and tracking.</small>
            <hr></hr>
            <small>Looking for the "Show weather summary in stop info window" or "Show local arrival time in stop info window" settings? They've moved to the new Stop Info section.</small>
        </>
    )
}
