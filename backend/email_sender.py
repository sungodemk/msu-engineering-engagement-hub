# Zhixiang Miao
# Use Resend to send email for account notification and reset password
# Learned how to use Resend from this link: https://resend.com/docs/introduction

import os
import resend
import logging
from resend.exceptions import ResendError
from flask import jsonify

resend.api_key = os.environ["RESEND_API_KEY"]

def send_email(email, subj, message):
    params: resend.Emails.SendParams = {
        "from": "MSU Engineering Engagement Hub <onboarding@resend.dev>",
        "to": [email],
        "subject": subj,
        "text": message
    }

    try:
        send = resend.Emails.send(params)
    except ResendError as error:
        logging.exception("Failed to send email")
        return False

    return True