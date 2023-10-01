from flask import Flask, render_template, jsonify, request
import subprocess
import os
import re
from string import Template


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
        return jsonify(session_id=session_id.group(0), message=f'{retrieveprovSession}!'), 200
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
    return jsonify(message=f"Session {session_id} has been deleted."), 200


# Create Hosting Configuration from JSON file
@app.route('/create_chc_from_json', methods=['POST'])
def create_chc_from_json():
    print("Received POST request:", request.json)
    provisioning_session_id = request.json.get('prov-session-id', None)
    print("Parsed session ID:", provisioning_session_id)

    if not provisioning_session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.join(home_dir, 'rt-5gms-application-function/install/bin/m1-session'),
                            "set-stream",
                            "-p",
                            provisioning_session_id,
                            file_path],
                            capture_output=True,
                            text=True)
    print("Command output:", result.stdout, "Command error:", result.stderr)
    if result.returncode == 0:
        return jsonify(message=f"Content Hosting Configuration successfully created from Lama Drama JSON for session {provisioning_session_id}."), 200
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


# Create CHC with multiple entry points
@app.route('/chc_multiple_entry_points', methods=['POST'])
def chc_multiple_entry_points():
    sessionMEP = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                                                    "new-stream",
                                                    "-e",
                                                    "MyAppId",
                                                    "-a",
                                                    "MyASPId",
                                                    "-n",
                                                    'Big Buck Bunny',
                                                    'http://amssamples.streaming.mediaservices.windows.net/622b189f-ec39-43f2-93a2-201ac4e31ce1/BigBuckBunny.ism/',
                                                    'manifest(format=mpd-time-csf)',
                                                    'manifest(format=m3u8-aapl-v3)'],
                                                    capture_output=True,
                                                    text=True)
        
    retrieveprovSession = sessionMEP.stdout.strip()
    session_id = re.search(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', retrieveprovSession)
    if session_id is not None:
        return jsonify(session_id=session_id.group(0), message=f'{retrieveprovSession}!'), 200
    else:
        return jsonify(message='Failed to extract session ID.'), 500
    

# Create Server Certificate
@app.route('/new_certificate', methods=['POST'])
def new_certificate():
    session_id = request.json.get('prov-session-id', None)

    if not session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "new-certificate",
                             "-p",
                             session_id],
                             capture_output=True,
                             text=True)

    certificate_id = re.search(r'certificate_id=([\w-]+)', result.stdout)
    if certificate_id is not None:
        certificate_id = certificate_id.group(1)
    
    if result.returncode == 0:
        return jsonify(message=f"New certificate created for session {session_id}, with certificate ID: {certificate_id}.", certificate_id=certificate_id), 200
    else:
        return jsonify(message=f"Failed to create a new certificate for session {session_id}. Error: {result.stderr}"), 500

# Show Server Certificate
@app.route('/show_certificate', methods=['POST'])
def show_certificate():
    session_id = request.json.get('prov-session-id', None)
    certificate_id = request.json.get('certificate-id', None)

    if not session_id or not certificate_id:
        return jsonify(message="Please enter a session ID and a certificate ID."), 400

    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "show-certificate",
                             "-p",
                             session_id,
                             "-c",
                             certificate_id],
                             capture_output=True,
                             text=True)
    
    if result.returncode == 0:
        return jsonify(details=result.stdout), 200
    else:
        return jsonify(message=f"Failed to show certificate for session {session_id}. Error: {result.stderr}"), 500
    

# Get the Content Protocols available
@app.route('/get_protocol_list', methods=['POST'])
def get_protocol_list():
    session_id = request.json.get('prov-session-id', None)

    if not session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "protocols",
                             "-p",
                             session_id],
                             capture_output=True,
                             text=True)

    if result.returncode == 0:
        return jsonify(details=result.stdout), 200
    else:
        return jsonify(message=f"Failed to get protocols for session {session_id}. Error: {result.stderr}"), 500
    
# Content Hosting Configuration without certificate
@app.route('/get_chc_without_certificate', methods=['POST'])
def get_chc_without_certificate():
    provisioning_session_id = request.json.get('prov-session-id', None)

    if not provisioning_session_id:
        return jsonify(message="Please enter a session ID."), 400

    file_path = os.path.join(home_dir, 'rt-5gms-application-function/examples/ContentHostingConfiguration_Big-Buck-Bunny_pull-ingest.json')

    result = subprocess.run([os.path.join(home_dir, 'rt-5gms-application-function/install/bin/m1-session'),
                            "set-stream",
                            "-p",
                            provisioning_session_id,
                            file_path],
                            capture_output=True,
                            text=True)
    if result.returncode == 0:
        return jsonify(message=f"Stream set from Big-Buck-Bunny JSON for session {provisioning_session_id}."), 200
    else:
        return jsonify(message=f"Failed to set stream from Big-Buck-Bunny JSON for session {provisioning_session_id}. Error: {result.stderr}"), 500
    

# Set consumption reporting
@app.route('/set_consumption_reporting', methods=['POST'])
def set_consumption_reporting():
    provisioning_session_id = request.json.get('prov-session-id', None)

    if not provisioning_session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.join(home_dir, 'rt-5gms-application-function/install/bin/m1-session'),
                            "set-consumption-reporting",
                            "-p",
                            provisioning_session_id,
                            '-i',
                            '10',
                            '-s',
                            '1',
                            '-l',
                            '-A'],
                            capture_output=True,
                            text=True)
    if result.returncode == 0:
        return jsonify(message=f"Consumption reporting activated for session {provisioning_session_id}."), 200
    else:
        return jsonify(message=f"Failed to activate consumption reporting for session {provisioning_session_id}. Error: {result.stderr}"), 500
    
# Show consumption reporting
@app.route('/show_consumption_reporting', methods=['POST'])
def show_consumption_reporting():
    provisioning_session_id = request.json.get('prov-session-id', None)

    if not provisioning_session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.join(home_dir, 'rt-5gms-application-function/install/bin/m1-session'),
                            "show-consumption-reporting",
                            "-p",
                            provisioning_session_id],
                            capture_output=True,
                            text=True)

    if result.returncode == 0:
        return jsonify(message=f"Consumption reporting activated for session {provisioning_session_id}", details=result.stdout), 200
    else:
        return jsonify(message=f"Failed to activate consumption reporting for session {provisioning_session_id}. Error: {result.stderr}"), 500


# Delete consmption reporting
@app.route('/delete_consumption_reporting', methods=['POST'])
def delete_consumption_reporting():
    provisioning_session_id = request.json.get('prov-session-id', None)

    if not provisioning_session_id:
        return jsonify(message="Please enter a session ID."), 400

    result = subprocess.run([os.path.join(home_dir, 'rt-5gms-application-function/install/bin/m1-session'),
                            "del-consumption-reporting",
                            "-p",
                            provisioning_session_id],
                            capture_output=True,
                            text=True)
    if result.returncode == 0:
        return jsonify(message=f"Consumption reporting deleted for session {provisioning_session_id}."), 200
    else:
        return jsonify(message=f"Failed to delete consumption reporting for session {provisioning_session_id}. Error: {result.stderr}"), 500



if __name__ == '__main__':
    app.run(debug=True)