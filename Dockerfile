FROM node:5.2.0-wheezy
MAINTAINER "ahmad.tahani@gmail.com"

# install dependencies for sharp.js
# more information at >> http://sharp.dimens.io/en/stable/

RUN apt-get update -y && apt-get install -y lsb-release
RUN curl -s https://raw.githubusercontent.com/lovell/sharp/master/preinstall.sh | bash -

# clean up
RUN apt-get remove -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN mkdir /app
WORKDIR /app

# clone the repo

RUN git clone git@gitlab.com:atahani/telepathy-app.git

WORKDIR /app/telepathy-app

RUN npm install

ENV NODE_ENV production

CMD git reset --hard origin/master && git pull && npm install && mkdir -p /app/telepathy-app/public/media && node server.js
