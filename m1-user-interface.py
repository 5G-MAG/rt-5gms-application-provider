from flask import Flask, render_template, jsonify, request
import subprocess
import os
import re

home_dir = os.path.expanduser('~')
file_path = os.path.join(home_dir, 'rt-5gms-application-function/examples/ContentHostingConfiguration_Llama-Drama_pull-ingest.json')

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# Create new Provisioning Session
@app.route('/new_provisioning_session', methods=['POST'])
def new_provisioning_session():
    provSession = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                                          "new-provisioning-session",
                                          "-e",
                                          "MyAppId",
                                          "-a",
                                          "MyASPId"],
                                          capture_output=True,
                                          text=True)
    retrieveprovSession = provSession.stdout.strip()
    session_id = re.search(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', retrieveprovSession)
    if session_id is not None:
        return jsonify(session_id=session_id.group(0), message=f'✅ {retrieveprovSession}!'), 200
    else:
        return jsonify(message='Failed to extract session ID.'), 500


# Delete particular Provisioining Session
@app.route('/delete_provisioning_session_by_id', methods=['POST'])
def delete_provisioning_session_by_id():
    session_id = request.json.get('prov-session-id', None)

    if not session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "list"],
                             capture_output=True,
                             text=True)
    session_list = result.stdout.split('\n')

    if session_id not in session_list:
        return jsonify(message="No such session ID exists."), 400

    subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                    "del-stream",
                    "-p",
                    session_id])
    return jsonify(message=f"✅ Session {session_id} has been deleted."), 200


# Create Hosting Configuration from JSON file
@app.route('/create_chc_from_json', methods=['POST'])
def create_chc_from_json():
    print("Received POST request:", request.json)  # Debug statement
    provisioning_session_id = request.json.get('prov-session-id', None)
    print("Parsed session ID:", provisioning_session_id)  # Debug statement

    if not provisioning_session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.join(home_dir, 'rt-5gms-application-function/install/bin/m1-session'),
                            "set-stream",
                            "-p",
                            provisioning_session_id,
                            file_path],
                            capture_output=True,
                            text=True)
    print("Command output:", result.stdout, "Command error:", result.stderr)  # Debug statement

    if result.returncode == 0:
        return jsonify(message=f"✅ CHC created from JSON for session {provisioning_session_id}."), 200
    else:
        return jsonify(message=f"Failed to create CHC from JSON for session {provisioning_session_id}. Error: {result.stderr}"), 500


# Checks details for provisioning session
@app.route('/get_all_provisioning_sessions_details', methods=['GET'])
def get_all_provisioning_sessions_details():
    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "list",
                             "-v"],
                             capture_output=True,
                             text=True)
    return jsonify(details=result.stdout), 200



if __name__ == '__main__':
    app.run(debug=True)
