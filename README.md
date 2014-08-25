neo4j-experiment
================

A playground to test neo4j in nodejs

## Setup

### Install docker

There are instructions [here](http://docs.docker.com/installation/ubuntulinux/) for Ubuntu installation.

### Run the neo4j docker

I use [this dockerfile](https://registry.hub.docker.com/u/tpires/neo4j/) to get up and running fast.

You can just run the following command and you'll be up and running with an installation of neo4j on port 7474 of your localhost.

```
docker run -i -t -d -privileged -p 7474:7474 tpires/neo4j
```
