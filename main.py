import flask, io
from flask import Flask, render_template

app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def view_main():
    return render_template(
        'main.html',
        content='It\'s Really work',
    )
    
    
if __name__ == '__main__':
    app.run(host='0.0.0.0',threaded=True, port=8080)
