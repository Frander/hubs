import React from "react";
import { FormattedMessage } from "react-intl";
import { createAndRedirectToNewHub } from "../../utils/phoenix-utils";
import { Button } from "../input/Button";
import { useCssBreakpoints } from "react-use-css-breakpoints";
import btn2 from '../../assets/newSkin/m-btn2.svg';

export function CreateRoomButton() {
  const breakpoint = useCssBreakpoints();

  return (
    <input type="image" src={btn2} border="0" alt="Submit" width="180"  onClick={e => {
      e.preventDefault();
      createAndRedirectToNewHub(null, null, false);
    }} />
    // <Button
    //   thick={breakpoint === "sm" || breakpoint === "md"}
    //   xl={breakpoint !== "sm" && breakpoint !== "md"}
    //   preset="landing"
    //   onClick={e => {
    //     e.preventDefault();
    //     createAndRedirectToNewHub(null, null, false);
    //   }}
    // >
    //   <FormattedMessage id="create-room-button" defaultMessage="Create Room" />
    // </Button>
  );
}
