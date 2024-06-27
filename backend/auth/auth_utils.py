import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
import json
import smtplib
from email.mime.text import MIMEText
import logging

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
        logging.info(f"Firebase credentials: {firebase_credentials}")
        cred = credentials.Certificate(firebase_credentials)
        firebase_admin.initialize_app(cred)


def get_authenticated_user_details(request_headers):
    try:
        initialize_firebase()
        user_object = {}
        if "Authorization" not in request_headers.keys():
            logging.info("ユーザーが見つからなかったので、ゲストユーザーで入ります。")
            from . import sample_user
            raw_user_object = sample_user.sample_user
            user_object = raw_user_object
        else:
            id_token = request_headers.get('Authorization').split('Bearer ')[1]
            decoded_token = auth.verify_id_token(id_token)
            logging.info(f"Decoded token: {decoded_token}")
            user_object = decoded_token  # decoded_tokenの全ての内容をuser_objectに格納
        return user_object
    except Exception as e:
        raise AuthError(f"Error in get_authenticated_user_details: {str(e)}")

def get_userid(request_headers):
    try:
        initialize_firebase()
        if "Authorization" not in request_headers.keys():
            logging.info("ユーザーが見つからなかったので、ゲストユーザーで入りま��。")
            from . import sample_user
            raw_user_object = sample_user.sample_user
            return raw_user_object['user_principal_id']
        else:
            id_token = request_headers.get('Authorization').split('Bearer ')[1]
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token['uid']
    except Exception as e:
        raise AuthError(f"Error in get_userid: {str(e)}")

def set_custom_claims(request_headers):
    try:
        logging.info("set_custom_claims", request_headers)
        user_id = request_headers.get('user_id')
        claim = request_headers.get('claim')
        value = request_headers.get('value') if request_headers.get('value') else False
        initialize_firebase()
        auth.set_custom_user_claims(user_id, {claim: value})
        logging.info(f"Claim {claim} set for user {user_id} to {value}")
    except Exception as e:
        raise AuthError(f"Error in set_custom_claims: {str(e)}")

def get_custom_claims(request_headers):
    try:
        uid = request_headers.get('user_id')
        initialize_firebase()
        user = auth.get_user(uid)
        return user.custom_claims
    except Exception as e:
        raise AuthError(f"Error in set_custom_claims: {str(e)}")

def verify_email(request_headers):
    try:
        email = request_headers.get('email')
        initialize_firebase()
        
        action_code_settings = auth.ActionCodeSettings(
            url='https://your-app-url.com/finishSignUp?cartId=1234',
            handle_code_in_app=False
        )
        
        link = auth.generate_email_verification_link(email, action_code_settings)
        
        smtp_host = "sv8259.xserver.jp"
        smtp_port = 465
        smtp_account = "k.kanno@egt-group.jp"
        smtp_password = "egt00000"
        to_address = email
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
    
def handle_reset_password(action_code, continue_url, lang):
    try:
        email = auth.verify_password_reset_code(action_code)
        # Render a template to input new password
        return render_template_string("""
            <form action="/confirm_reset_password" method="POST">
                <input type="hidden" name="action_code" value="{{ action_code }}">
                <label for="new_password">New Password:</label>
                <input type="password" id="new_password" name="new_password">
                <button type="submit">Reset Password</button>
            </form>
        """, action_code=action_code)
    except Exception as e:
        return f"Error: {str(e)}"
    
def handle_recover_email(action_code, lang):
    try:
        info = auth.check_action_code(action_code)
        restored_email = info.data['email']
        auth.apply_action_code(action_code)
        auth.send_password_reset_email(restored_email)
        return "Email recovery successful. Password reset email sent."
    except Exception as e:
        return f"Error: {str(e)}"

def handle_verify_email(action_code, continue_url, lang):
    try:
        auth.apply_action_code(action_code)
        return "Email verification successful"
    except Exception as e:
        return f"Error: {str(e)}"

def confirm_password_reset(action_code, new_password):
    try:
        auth.confirm_password_reset(action_code, new_password)
        return "Password reset successful"
    except Exception as e:
        return f"Error: {str(e)}"

def create_user(email, password):
    try:
        user = auth.create_user(email=email, password=password)
        print('Successfully created new user:', user.uid)
    except auth.EmailAlreadyExistsError:
        print('Error: The email address is already in use by another account.')
    except auth.UidAlreadyExistsError:
        print('Error: The user with the provided UID already exists.')
    except auth.InvalidArgumentError as e:
        print(f'Error: {e}')
    except Exception as e:
        print(f'Unexpected error: {e}')

def verify_id_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        print('Successfully verified ID token:', uid)
    except auth.InvalidIdTokenError:
        print('Error: The provided ID token is invalid.')
    except auth.ExpiredIdTokenError:
        print('Error: The provided ID token is expired.')
    except Exception as e:
        print(f'Unexpected error: {e}')
        
def revoke_refresh_tokens(uid):
    try:
        auth.revoke_refresh_tokens(uid)
        print('Successfully revoked refresh tokens for user:', uid)
    except auth.FirebaseError as e:
        print(f'Error: {e}')
    except Exception as e:
        print(f'Unexpected error: {e}')
        
def update_user(uid, email=None, password=None):
    try:
        user = auth.update_user(uid, email=email, password=password)
        print('Successfully updated user:', user.uid)
    except auth.UserNotFoundError:
        print('Error: No user record found for the given identifier.')
    except auth.InvalidArgumentError as e:
        print(f'Error: {e}')
    except Exception as e:
        print(f'Unexpected error: {e}')
        
def create_user_and_send_verification(email, password):
    try:
        initialize_firebase()
        # ユーザーの作成
        user = auth.create_user(email=email, password=password)
        print('Successfully created new user:', user.uid)
        
        # メール認証リンクの生成
        action_code_settings = auth.ActionCodeSettings(
            url='https://egtsampleapp.azurewebsites.net/auth/verify',
            handle_code_in_app=True
        )
        link = auth.generate_email_verification_link(email, action_code_settings)
        
        # メールの送信
        send_verification_email(email, link)
        
        return {"message": "User created and verification email sent"}, 200
        
    except exceptions.AlreadyExistsError:
        print('Error: The email address is already in use by another account.')
        return {"error": "The email address is already in use by another account."}, 400
    except exceptions.InvalidArgumentError as e:
        print(f'Error: {e}')
        return {"error": str(e)}, 400
    except exceptions.FirebaseError as e:
        print(f'Firebase error: {e}')
        return {"error": str(e)}, 500
    except Exception as e:
        print(f'Unexpected error: {e}')
        return {"error": str(e)}, 500

def send_verification_email(to_address, verification_link):
    smtp_host = "sv8259.xserver.jp"
    smtp_port = 465
    smtp_account = "k.kanno@egt-group.jp"
    smtp_password = "egt00000"
    from_address = "k.kanno@egt-group.jp"
    subject = "メールの認証"
    text = f"以下のリンクをクリックしてメールアドレスを認証してください: {verification_link}"
    
    msg = MIMEText(text, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = from_address
    msg["To"] = to_address
    logging.info(f"Verification email sent to {to_address} with link: {verification_link}")
    try:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as smtp:
            smtp.login(smtp_account, smtp_password)
            smtp.send_message(msg)
            smtp.quit()
        print("Verification email sent successfully.")
    except smtplib.SMTPException as e:
        print(f'SMTP error: {e}')
    except Exception as e:
        print(f'Unexpected error: {e}')
