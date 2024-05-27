import firebase_admin
from firebase_admin import credentials, auth

def get_authenticated_user_details(request_headers):
    # Firebase Admin SDKの初期化
    if not firebase_admin._apps:
        cred = credentials.Certificate('./egt-gpt-firebase-adminsdk-w0ifw-89672149e0.json')
        firebase_admin.initialize_app(cred)
    
    user_object = {}
    print("Requesfdlkjhasf;lka: ", request_headers)
    ## check the headers for the Principal-Id (the guid of the signed in user)
    if "Authorization" not in request_headers.keys():
        ## if it's not, assume we're in development mode and return a default user
        from . import sample_user
        raw_user_object = sample_user.sample_user
        user_object = raw_user_object
    else:
        id_token = request_headers.get('Authorization').split('Bearer ')[1]
        decoded_token = auth.verify_id_token(id_token)
        user_object['user_principal_id'] = decoded_token['uid']
    return user_object

def fetch_users():
    if not firebase_admin._apps:
        cred = credentials.Certificate('./egt-gpt-firebase-adminsdk-w0ifw-89672149e0.json')
        firebase_admin.initialize_app(cred)
    users = []
    page = auth.list_users()
    while page:
        for user in page.users:
            users.append(user.__dict__)
        page = page.get_next_page()
    return users

def get_user(uid):
    if not firebase_admin._apps:
        cred = credentials.Certificate('./egt-gpt-firebase-adminsdk-w0ifw-89672149e0.json')
        firebase_admin.initialize_app(cred)
    return auth.get_user(uid).__dict__