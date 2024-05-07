from quart import Quart, session, redirect, request, url_for, render_template, make_response
from . import User

# HTTPSを強制するための設定
async def before_request():
    if not request.is_secure:
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url)


async def index():
    if 'username' in session:
        username = session['username']
        response = await make_response(f'Logged in as {username}')
        # response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains'
        return response
    return 'You are not logged in'

async def login():
    if request.method == 'POST':
        session['username'] = request.form['username']
        response = await make_response(redirect(url_for('index')))
        # CookieにHttpOnlyとSecure属性を設定
        response.set_cookie('session', session.sid, httponly=True, secure=True, samesite='Lax')
        return response
    return await render_template('login.html')

async def logout():
    # セッションからユーザーを削除してログアウト
    session.pop('username', None)
    response = await make_response(redirect(url_for('index')))
    response.set_cookie('session', '', expires=0)
    return response
