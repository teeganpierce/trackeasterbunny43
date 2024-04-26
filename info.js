import { MDBBtn, MDBModal, MDBModalContent, MDBModalDialog, MDBModalHeader, MDBModalTitle, MDBModalBody, MDBModalFooter } from "mdb-react-ui-kit";
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings'
import React, { useState } from "react";
import timeFormat from "../../TimeFormatter/TimeFormatter";
import FullscreenButton from "./FullscreenButton";
import { Fullscreen, FullscreenExit } from "@mui/icons-material";

export default function InfoButton(props) {
    const [infoModal, setInfoModal] = useState(false);

    const toggleInfoModal = () => {
        setTimeout(() => {
            document.getElementById("infoModalDialog").scrollIntoView()
        }, infoModal ? 250 : 5)
        setInfoModal(!infoModal)
    }

    function renderCountdownContent() {
        let pt_start = timeFormat(0, props.dataMgr.pt_starts_unix, 0, "info", undefined, undefined, props.settingsMgr)
        let t_start = timeFormat(0, props.dataMgr.t_starts_unix, 0, "info", undefined, undefined, props.settingsMgr)
        return (
            <div>
                The Easter Bunny begins preparing for liftoff on <b>{pt_start}</b> and will liftoff on <b>{t_start}</b>.<br></br><br></br>
                In the mean time, you can click on the <i title="Settings"><SettingsIcon sx={{ width: "18px", height: "18px", bottom: "0.06rem", position: "relative" }} /></i> button to configure tracker settings.
                { renderFullscreenContent() }
            </div>
        )
    }

    function renderTrackingContent() {
        if (props.dataMgr.routeState === 2) {
            if (props.settingsMgr.map_centered) {
                return (<span>Click on the <i className={props.settingsMgr.get_actual_appearance() === "dark" ? "uncenter-icon small-icon" : "uncenter-icon-dark small-icon"} title="Uncenter Easter Bunny"></i> button to uncenter the map on the Easter Bunny, so you can explore the map.<br></br></span>)
            } else {
                return (<span>Click on the <i className={props.settingsMgr.get_actual_appearance() === "dark" ? "center-icon small-icon" : "center-icon-dark small-icon"} title="Center Easter Bunny"></i> button to center the map on the Easter Bunny.<br></br></span>)
            }
        } else {
            return
        }
    }

    function renderFullscreenContent() {
        if (new FullscreenButton({settingsMgr: props.settingsMgr}).determineBrowserCompatibility()) {
            if (document.fullscreen) {
                return (
                    <>
                    <br></br>
                    <span>Click on the <i title="Fullscreen Exit"><FullscreenExit sx={{ width: "18px", height: "18px", bottom: "0.06rem", position: "relative" }}></FullscreenExit></i> button to exit full screen mode.</span>
                    </>
                )
            } else {
                return (
                    <>
                    <br></br>
                    <span>Click on the <i title="Fullscreen"><Fullscreen sx={{ width: "18px", height: "18px", bottom: "0.06rem", position: "relative" }}></Fullscreen></i> button to show the tracker in full screen.</span>
                    </>
                )
            }
        }
    }

    function renderTrackingAlwaysContent() {
        return (<div>
            The <i className="bunny-icon-small" title="Easter Bunny"></i> icon represents the Easter Bunny's current location.<br></br>
            The <i className="basket-icon-small" title="Easter Basket"></i> icon represents cities that the Easter Bunny has visited. Click on one to learn more about that city! <br></br>
            { renderTrackingContent() }
            Click on the <i title="Settings"><SettingsIcon sx={{ width: "18px", height: "18px", bottom: "0.06rem", position: "relative" }} /></i> button to customize tracker settings.
            { renderFullscreenContent() }
        </div>)
    }

    if (process.env.REACT_APP_IS_SHUTDOWN === "true") {
        return (
            <>
                <MDBBtn onClick={toggleInfoModal} style={{ marginTop: "8px", pointerEvents: "auto" }} title="Click to show information about the tracker">
                    <InfoIcon fontSize="small"/>
                </MDBBtn><br></br>
                <MDBModal id="infoModal" appendToBody show={infoModal} setShow={setInfoModal} tabIndex='-1'>
                    <MDBModalDialog id="infoModalDialog">
                        <MDBModalContent>
                            <MDBModalHeader>
                                <MDBModalTitle>Welcome to trackeasterbunnylive.net</MDBModalTitle>
                                <MDBBtn className='btn-close' color='none' onClick={toggleInfoModal} title="Click to close this modal"></MDBBtn>
                            </MDBModalHeader>
                            <MDBModalBody>
    
                                {process.env.REACT_APP_VERSION} ({process.env.REACT_APP_COMMIT}) · &copy; 2024 track.easterbunny.cc<br></br>
                                <a href="/faq/" rel="noopener" target="_blank">FAQs</a> · <a href="/news/" rel="noopener" target="_blank">News</a> · <a href="/privacy/" rel="noopener" target="_blank">Privacy</a> · <a href="/acknowledgements/" rel="noopener" target="_blank">Acknowledgements</a>
                            </MDBModalBody>
                            <MDBModalFooter>
                            <MDBBtn color='secondary' onClick={toggleInfoModal} title="Click to close this modal">
                                Close
                            </MDBBtn>
                        </MDBModalFooter>
                        </MDBModalContent>
                    </MDBModalDialog>
                </MDBModal>
            </>
        )
    }
 
    return (
        <>
            <MDBBtn onClick={toggleInfoModal} style={{ marginTop: "8px", pointerEvents: "auto" }} title="Click to show information about the tracker">
                <InfoIcon fontSize="small"/>
            </MDBBtn><br></br>
            <MDBModal id="infoModal" appendToBody show={infoModal} setShow={setInfoModal} tabIndex='-1'>
                <MDBModalDialog id="infoModalDialog">
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>Welcome to trackeasterbunnylive.net!</MDBModalTitle>
                            <MDBBtn className='btn-close' color='none' onClick={toggleInfoModal} title="Click to close this modal"></MDBBtn>
                        </MDBModalHeader>
                        <MDBModalBody>
                            { props.dataMgr.routeState === 3 ? (
                                <>
            
                                </>
                            ) : (<></>)}
                            { props.dataMgr.routeState === 0 ? renderCountdownContent() : renderTrackingAlwaysContent() }
                         
                            {process.env.REACT_APP_VERSION} ({process.env.REACT_APP_COMMIT}) · &copy; 2026 trackeasterbunnylive.net<br></br>
                            <a href="/news/" rel="noopener" target="_blank">News</a> · <a href="/privacy/" rel="noopener" target="_blank">Privacy</a> · <a href="/acknowledgements/" rel="noopener" target="_blank">Acknowledgements</a>
                        </MDBModalBody>
                        <MDBModalFooter>
                            <MDBBtn color='secondary' onClick={toggleInfoModal} title="Click to close this modal">
                                Close
                            </MDBBtn>
                        </MDBModalFooter>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </>
        )
}
