neo4j-experiment
================

A playground to test neo4j in nodejs

## Setup

### Install nodejs

Latest instructions for this are [here](https://github.com/nodesource/distributions).

### Install docker

There are instructions [here](http://docs.docker.com/installation/ubuntulinux/) for Ubuntu installation.

### Run the neo4j docker

I use [this dockerfile](https://registry.hub.docker.com/u/tpires/neo4j/) to get up and running fast.

You can just run the following command and you'll be up and running with an installation of neo4j on port 7474 of your localhost.

```
docker run -i -t -d -privileged -p 7474:7474 tpires/neo4j
```

## Usage

Running the `app.js` script will create test data in the DB:

```shell
node app.js
```

The script doesn't clean up after itself, but you can get it to delete all data in the DB before it creates the test data with the `-d` argument:

```shell
node app.js -d
```

It will use the contents of the `data.json` file to create the test nodes and relationships, but you can also tell the script to generate a random amount of test data using the `-r` argument:

```shell
node app.js -r
```
