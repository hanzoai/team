#!/bin/bash

git subtree pull --prefix=foundations/utils git@github.com:hcengineering/hanzo.utils.git main
git subtree pull --prefix=foundations/core git@github.com:hcengineering/hanzo.core.git main
git subtree pull --prefix=foundations/server git@github.com:hcengineering/hanzo.server.git main
git subtree pull --prefix=foundations/net git@github.com:hcengineering/hanzo.net.git main

git subtree pull --prefix=foundations/hanzolake git@github.com:hcengineering/hanzolake.git master
git subtree pull --prefix=foundations/hanzopulse git@github.com:hcengineering/hanzopulse.git main
git subtree pull --prefix=foundations/communication git@github.com:hcengineering/communication.git main
