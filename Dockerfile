FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    python3-pip python3-venv python3-setuptools python3-wheel python3-yaml \
    curl wget git && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . /ui
WORKDIR /ui
RUN pip3 install --upgrade pip
RUN pip3 install -r management-ui/requirements.txt
RUN pip3 install ./python

EXPOSE 8000

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]
