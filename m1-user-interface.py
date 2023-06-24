from flask import Flask, render_template, jsonify, request
import subprocess
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html', active_sessions=get_sessions_count().json['count'])


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
    return jsonify(message=f'✅ {retrieveprovSession}!'), 200

@app.route('/new_prov_session_with_content_hosting_configuration', methods=['POST'])
def new_prov_session_with_content_hosting_configuration():
    provSessionWithCHC = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "new-stream",
                             "-e",
                             "MyAppId",
                             "-a",
                             "MyASPId",
                             "-n",
                             'Big Buck Bunny',
                             'https://ftp.itec.aau.at/datasets/DASHDataset2014/BigBuckBunny/4sec/',
                             'BigBuckBunny_4s_onDemand_2014_05_09.mpd'],
                             capture_output=True,
                             text=True)
    retrieveProvSessionWithCHC = provSessionWithCHC.stdout.strip() 
    return jsonify(message=f'✅{retrieveProvSessionWithCHC}!'), 200


@app.route('/get_prov_session_details', methods=['GET'])
def get_prov_session_details():
    prov_session_details = subprocess.run(
        [os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
         "list",
         "-v"],
        capture_output=True,
        text=True
    )
    prov_session_output = prov_session_details.stdout.strip()

    return jsonify({"details": prov_session_output}), 200


                                            

@app.route('/get_provisioning_sessions', methods=['GET'])
def get_provisioning_sessions():
    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "list"],
                             capture_output=True,
                             text=True)
    session_list = result.stdout.split('\n')
    return jsonify(provisioning_sessions=session_list)

@app.route('/get_sessions_count', methods=['GET'])
def get_sessions_count():
    result = subprocess.run([os.path.expanduser('~/rt-5gms-application-function/install/bin/m1-session'),
                             "list"],
                             capture_output=True,
                             text=True)
    session_list = result.stdout.split('\n')
    session_count = len([x for x in session_list if x])
    return jsonify(count=session_count)

@app.route('/delete_provisioning_session', methods=['POST'])
def delete_provisioning_session():
    session_id = request.form.get('prov-session-id', None)

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


if __name__ == '__main__':
    app.run(debug=True)
