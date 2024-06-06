import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
import json
import smtplib
from email.mime.text import MIMEText
load_dotenv()

class AuthError(Exception):
    pass

def initialize_firebase():
    if not firebase_admin._apps:
        firebase_credentials = {
            "type": os.getenv('FIREBASE_TYPE'),
            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
            "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
            "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
            "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
            "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
        }
        print("Firebase credentials: ", firebase_credentials)
        cred = credentials.Certificate(firebase_credentials)
        firebase_admin.initialize_app(cred)


def get_authenticated_user_details(request_headers):
    try:
        initialize_firebase()
        user_object = {}
        print("Request headers: ", request_headers)
        if "Authorization" not in request_headers.keys():
            from . import sample_user
            raw_user_object = sample_user.sample_user
            user_object = raw_user_object
        else:
            id_token = request_headers.get('Authorization').split('Bearer ')[1]
            decoded_token = auth.verify_id_token(id_token)
            print("Decoded token: ", decoded_token)
            user_object['user_principal_id'] = decoded_token['uid']
            user_object['display_name'] = decoded_token['display_name']
            user_object['email'] = decoded_token['email']
        return user_object
    except Exception as e:
        raise AuthError(f"Error in get_authenticated_user_details: {str(e)}")


def set_custom_claims(request_headers):
    try:
        user_id = request_headers.get('user_id')
        claim = request_headers.get('claim')
        value = request_headers.get('value') if request_headers.get('value') else False
        initialize_firebase()
        auth.set_custom_user_claims(user_id, {claim: value})
        print(f"Claim {claim} set for user {user_id} to {value}")
    except Exception as e:
        raise AuthError(f"Error in set_custom_claims: {str(e)}")


def verify_email(request_headers):
    try:
        email = request_headers.get('email')
        initialize_firebase()
        link = auth.generate_email_verification_link(email)
        smtp_host = "sv8259.xserver.jp"
        smtp_port = 465
        smtp_account = "k.kanno@egt-group.jp"
        smtp_password = "egt00000"
        to_address = "kouki2718@outlook.jp"
        from_address = "k.kanno@egt-group.jp"
        subject = "メールのタイトル"
        text = "メールの本文 " + link
        msg = MIMEText(text, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = from_address
        msg["To"] = to_address

        # メール送信
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as smtp:
            smtp.login(smtp_account, smtp_password)
            smtp.send_message(msg)
            smtp.quit()
    except smtplib.SMTPException as e:
        raise AuthError(f"SMTP error: {str(e)}")
    except Exception as e:
        raise AuthError(f"Error in verify_email: {str(e)}")


def send_email(oob_code):
    try:
        auth.apply_action_code(oob_code)
        print("Email verified")
    except Exception as e:
        raise AuthError(f"Error in send_email: {str(e)}")


def fetch_users():
    try:
        initialize_firebase()
        users = []
        page = auth.list_users()
        while page:
            for user in page.users:
                users.append(user.__dict__)
            page = page.get_next_page()
        return users
    except Exception as e:
        raise AuthError(f"Error in fetch_users: {str(e)}")


def get_user(uid):
    try:
        initialize_firebase()
        return auth.get_user(uid).__dict__
    except Exception as e:
        raise AuthError(f"Error in get_user: {str(e)}")