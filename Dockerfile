FROM ubuntu:latest

# AF dependecies
RUN apt-get update && apt-get install -y \
    bison build-essential curl flex git default-jdk ninja-build wget \
    python3-pip python3-venv python3-setuptools python3-wheel python3-yaml \
    libsctp-dev libgnutls28-dev libgcrypt-dev libssl-dev libidn11-dev \
    libmongoc-dev libbson-dev libyaml-dev libnghttp2-dev libmicrohttpd-dev \
    libcurl4-gnutls-dev libnghttp2-dev libtins-dev libtalloc-dev cmake

RUN pip3 install --upgrade pip && pip3 install meson

# AD build & install
RUN git clone -b development --recurse-submodules https://github.com/5G-MAG/rt-5gms-application-function.git
WORKDIR /rt-5gms-application-function
RUN git submodule update
RUN meson setup --prefix=`pwd`/install build && ninja -C build
RUN rm -f install/etc/open5gs/msaf.yaml
RUN meson install -C build --no-rebuild

# UI server
COPY . /ui
WORKDIR /ui
RUN pip3 install -r requirements.txt
RUN pip3 install uvicorn

EXPOSE 8000

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]