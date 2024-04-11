def get_authenticated_user_details(request_headers):
    user_object = {}

    ## check the headers for the Principal-Id (the guid of the signed in user)
    if "user_principal_id" not in request_headers.keys():
        ## if it's not, assume we're in development mode and return a default user
        from . import sample_user_v
        raw_user_object = sample_user_v.sample_user
    else:
        ## if it is, get the user details from the EasyAuth headers
        raw_user_object = {k:v for k,v in request_headers.items()}

    user_object['user_principal_id'] = raw_user_object.get('user_principal_id')
    user_object['user_name'] = raw_user_object.get('user_name')
    user_object['passward'] = raw_user_object.get('passward')
    user_object['admin'] = raw_user_object.get('admin')
    user_object['level'] = raw_user_object.get('level')
    
    return user_object