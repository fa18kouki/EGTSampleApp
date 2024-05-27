import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
import json

load_dotenv()

def initialize_firebase():
    if not firebase_admin._apps:
        firebase_credentials = {
            "type": os.getenv('FIREBASE_TYPE'),
            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": os.getenv('FIREBASE_PRIVATE_KEY'),
            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
            "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
            "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
            "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL'),
            "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
        }
        cred = credentials.Certificate(firebase_credentials)
        firebase_admin.initialize_app(cred)

def get_authenticated_user_details(request_headers):
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
        user_object['user_principal_id'] = decoded_token['uid']
    return user_object

def fetch_users():
    initialize_firebase()
    users = []
    page = auth.list_users()
    while page:
        for user in page.users:
            users.append(user.__dict__)
        page = page.get_next_page()
    return users

def get_user(uid):
    initialize_firebase()
    return auth.get_user(uid).__dict__