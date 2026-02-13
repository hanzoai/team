#!/bin/bash

git subtree pull --prefix=foundations/utils git@github.com:hanzoai/huly.utils.git main
git subtree pull --prefix=foundations/core git@github.com:hanzoai/huly.core.git main
git subtree pull --prefix=foundations/server git@github.com:hanzoai/huly.server.git main
git subtree pull --prefix=foundations/net git@github.com:hanzoai/huly.net.git main

git subtree pull --prefix=foundations/hulylake git@github.com:hanzoai/hulylake.git master
git subtree pull --prefix=foundations/hulypulse git@github.com:hanzoai/hulypulse.git main
git subtree pull --prefix=foundations/communication git@github.com:hanzoai/communication.git main
