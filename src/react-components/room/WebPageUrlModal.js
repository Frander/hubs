import React from "react";
import PropTypes from "prop-types";
import { Modal } from "../modal/Modal";
import { CloseButton } from "../input/CloseButton";
import { TextInputField } from "../input/TextInputField";
import { useForm } from "react-hook-form";
import { Button } from "../input/Button";
import { FormattedMessage } from "react-intl";
import { Column } from "../layout/Column";
import styles from "./WebPageUrlModal.scss";

export function WebPageUrlModal({ onSubmit, onClose, url, title = "" }) {
  const { isSubmitting, handleSubmit, register, errors } = useForm();
  return (
    <Modal
      //title={<FormattedMessage id="web-page-url-modal.title" defaultMessage={title} />}
      title={title}
      beforeTitle={<CloseButton onClick={onClose} />}
    >
      <iframe src={url} width="100%" height="500px" allow="camera;microphone" className={styles.iframe}>
      </iframe>
      {/* <Column as="form" padding center onSubmit={handleSubmit(onSubmit)}> */}
      
        {/* <p>
          <FormattedMessage
            id="web-page-url-modal.message"
            defaultMessage="Paste a URL to the web page you want to embed in the scene."
          />
        </p> */}
        {/* <TextInputField
          name="src"
          label={<FormattedMessage id="web-page-url-modal.url-input" defaultMessage="Web Page URL" />}
          placeholder="https://www.google.com"
          type="url"
        //   required
        //   ref={register}
          error=""
        /> */}
        {/* <Button type="submit" preset="accept" disabled={isSubmitting}>
          <FormattedMessage id="web-page-url-modal.spawn-web-page-button" defaultMessage="Spawn Web Page" />
        </Button> */}
      {/* </Column> */}
    </Modal>
  );
}
WebPageUrlModal.propTypes = {
  onSubmit: PropTypes.func,
  onClose: PropTypes.func
};