#!/bin/bash

git subtree pull --prefix=foundations/utils git@github.com:hanzoai/hanzo.utils.git main
git subtree pull --prefix=foundations/core git@github.com:hanzoai/hanzo.core.git main
git subtree pull --prefix=foundations/server git@github.com:hanzoai/hanzo.server.git main
git subtree pull --prefix=foundations/net git@github.com:hanzoai/hanzo.net.git main

git subtree pull --prefix=foundations/hanzolake git@github.com:hanzoai/hanzolake.git master
git subtree pull --prefix=foundations/hanzopulse git@github.com:hanzoai/hanzopulse.git main
git subtree pull --prefix=foundations/communication git@github.com:hanzoai/communication.git main
