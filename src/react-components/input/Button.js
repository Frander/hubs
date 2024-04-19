import React, { forwardRef, memo } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import styles from "./Button.scss";
import textInputStyles from "./TextInput.scss";
import { FormattedMessage } from "react-intl";

import NextBtn from "../../assets/newSkin/next.svg";

export const presets = [
  "transparent",
  "basic",
  "primary",
  "accept",
  "cancel",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "landing",
  "signin"
];

export const Button = memo(
  forwardRef(({ as, sm, lg, xl, thin, thick, preset, className, children, ...rest }, ref) => {
    const ButtonComponent = as;
    const buttonProps = ButtonComponent === "button" ? { type: "button" } : {};

    return (
      <ButtonComponent
        className={classNames(
          styles.button,
          textInputStyles.button,
          styles[preset],
          {
            [styles.sm]: sm,
            [styles.lg]: lg,
            [styles.xl]: xl,
            [styles.thin]: thin,
            [styles.thick]: thick
          },
          className
        )}
        {...buttonProps}
        {...rest}
        ref={ref}
      >
        {children}
      </ButtonComponent>
    );
  })
);

Button.propTypes = {
  as: PropTypes.elementType,
  preset: PropTypes.oneOf(presets),
  className: PropTypes.string,
  children: PropTypes.node,
  sm: PropTypes.bool
};

Button.defaultProps = {
  as: "button",
  preset: "basic"
};

export function NextButton(props) {
  return (
    <Button preset="accept" {...props}>
      <FormattedMessage id="button.next" defaultMessage="Next" />
    </Button>
  );
}

export function NextButton2() {
  return (
    // <button><img src={NextBtn} alt="Main Image" width="220px"/></button>
    // <img src={NextBtn} alt="Main Image" width="220px"/>
    // <input type="image" src={NextBtn} style="border: double;" width="220"/> 
    <input type="image" src={NextBtn} border="0" alt="Submit" width="180"/>

  );
}

export function CancelButton(props) {
  return (
    <Button preset="cancel" {...props}>
      <FormattedMessage id="button.cancel" defaultMessage="Cancel" />
    </Button>
  );
}

export function ContinueButton(props) {
  return (
    <Button preset="accept" {...props}>
      <FormattedMessage id="button.continue" defaultMessage="Continue" />
    </Button>
  );
}

export function AcceptButton(props) {
  return (
    <Button preset="accept" {...props}>
      <FormattedMessage id="button.accept" defaultMessage="Aceptar" />
    </Button>
  );
}

export function ApplyButton(props) {
  return (
    <Button preset="accept" {...props}>
      <FormattedMessage id="button.apply" defaultMessage="Apply" />
    </Button>
  );
}
