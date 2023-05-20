from flask import Flask, render_template, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route('/')
def index():
    """
    This function renders the index.html file and passes the count of active sessions to it.
    :return: Rendered index.html template
    """
    return render_template('index.html', active_sessions=get_sessions_count().json['count'])


@app.route('/new_provisioning_session', methods=['POST'])
def new_provisioning_session():
    """
    This function creates a new provisioning session.
    :return: JSON response with a success message
    """
    subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'), "new-provisioning-session", "-e", "MyAppId", "-a", "MyASPId"])
    return jsonify(message='✅ Provisioning session created!'), 200

@app.route('/get_provisioning_sessions', methods=['GET'])
def get_provisioning_sessions():
    """
    This function runs a CLI command to get a list of active provisioning sessions, parses the output, and returns a JSON response.
    :return: JSON response with a list of session IDs
    """
    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'), "list"], capture_output=True, text=True)
    session_list = result.stdout.split('\n')
    return jsonify(provisioning_sessions=session_list)

@app.route('/get_sessions_count', methods=['GET'])
def get_sessions_count():
    """
    This function counts the number of active sessions and returns a JSON response.
    :return: JSON response with the count of active sessions
    """
    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'), "list"], capture_output=True, text=True)
    session_list = result.stdout.split('\n')
    session_count = len([x for x in session_list if x])
    return jsonify(count=session_count)

if __name__ == '__main__':
    app.run(debug=True)
