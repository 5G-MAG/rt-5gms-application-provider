FROM ubuntu:latest

# AF dependecies
RUN apt-get update && apt-get install -y \
    bison build-essential curl flex git default-jdk ninja-build wget \
    python3-pip python3-venv python3-setuptools python3-wheel python3-yaml \
    python3-aiofiles python3-build python3-h11 python3-h2 python3-httpx\
    python3-openssl \
    libsctp-dev libgnutls28-dev libgcrypt-dev libssl-dev libidn11-dev \
    libmongoc-dev libbson-dev libyaml-dev libnghttp2-dev libmicrohttpd-dev \
    libcurl4-gnutls-dev libnghttp2-dev libtins-dev libtalloc-dev cmake

RUN pip3 install --upgrade pip && pip3 install meson

# AF build & install
RUN git clone -b development --recurse-submodules https://github.com/5G-MAG/rt-5gms-application-function.git
WORKDIR /rt-5gms-application-function
RUN git submodule update
RUN meson setup --prefix=`pwd`/install build || (echo '===================== build/meson-logs/meson-log.txt ======================'; cat build/meson-logs/meson-log.txt) && ninja -C build
RUN rm -f install/etc/open5gs/msaf.yaml
RUN meson install -C build --no-rebuild

# UI server
COPY . /ui
WORKDIR /ui
RUN pip3 install -r management-ui/requirements.txt
RUN pip3 install uvicorn
RUN pip3 install ./python

EXPOSE 8000

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]
