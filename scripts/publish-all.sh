#!/usr/bin/env bash
set -euo pipefail
ROOT=$(pwd)

# Ensure we have an npm auth token for non-interactive publishing
if [ -z "${NPM_TOKEN:-}" ]; then
  echo "Error: NPM_TOKEN not set."
  echo "Please create an npm automation token and export it as NPM_TOKEN"
  echo "  export NPM_TOKEN=your_token_here"
  exit 1
fi
# Configure npm to use the token (so npm publish does not prompt for login)
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc

echo "Discovering packages in dev, models, packages, plugins, server, server-plugins..."
# Find all package.json under specified directories and record packageName and folder
pkg_entries=()
while IFS= read -r pkg_path; do
  folder=$(dirname "$pkg_path")
  name=$(jq -r .name "$pkg_path")
  pkg_entries+=("$name $folder")
done < <(
  find dev models packages plugins server server-plugins -type f -name package.json
)

echo
echo "Bumping patch versions..."
for entry in "${pkg_entries[@]}"; do
  name=${entry%% *}
  folder=${entry#* }
  echo "  → $name in $folder"
  cd "${ROOT}/${folder}"
  oldVer=$(jq -r .version package.json)
  # bump patch version ensuring it's above what's already published
  IFS='.' read -r major minor patch <<< "$oldVer"
  # strip any prerelease tags
  patch=${patch%%-*}
  # determine current published version (if any)
  regVer=$(npm view "$name" version 2>/dev/null || echo "")
  if [[ -n "$regVer" ]]; then
    IFS='.' read -r rMajor rMinor rPatch <<< "$regVer"
    rPatch=${rPatch%%-*}
    if [[ "$rMajor" == "$major" && "$rMinor" == "$minor" && "$rPatch" -ge "$patch" ]]; then
      newPatch=$((rPatch + 1))
    else
      newPatch=$((patch + 1))
    fi
  else
    newPatch=$((patch + 1))
  fi
  newVer="$major.$minor.$newPatch"
  echo "    $oldVer → $newVer"
  # only bump own version; dependencies updated in next phase
  jq --arg v "$newVer" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json
  cd "$ROOT"
done

### Phase 2: update internal @hanzo dependency ranges
echo
echo "Updating internal @hanzo dependency ranges..."
for entry in "${pkg_entries[@]}"; do
  name=${entry%% *}
  folder=${entry#* }
  echo "  → Fixing deps in $name"
  cd "${ROOT}/${folder}"
  for dep_entry in "${pkg_entries[@]}"; do
    dep_name=${dep_entry%% *}
    dep_folder=${dep_entry#* }
    # update dependencies
    if jq -e --arg d "$dep_name" '.dependencies[$d]' package.json > /dev/null; then
      dep_ver=$(jq -r .version "${ROOT}/${dep_folder}/package.json")
      jq --arg d "$dep_name" --arg v "^$dep_ver" '.dependencies[$d] = $v' package.json > tmp.json && mv tmp.json package.json
    fi
    # update peerDependencies
    if jq -e --arg d "$dep_name" '.peerDependencies[$d]' package.json > /dev/null; then
      dep_ver=$(jq -r .version "${ROOT}/${dep_folder}/package.json")
      jq --arg d "$dep_name" --arg v "^$dep_ver" '.peerDependencies[$d] = $v' package.json > tmp.json && mv tmp.json package.json
    fi
  done
  cd "$ROOT"

done

# Determine publish order based on internal dependencies
echo
echo "Determining publish order based on internal dependencies..."

# Split pkg_entries into parallel arrays of names and folders
names=()
folders=()
for entry in "${pkg_entries[@]}"; do
  names+=("${entry%% *}")
  folders+=("${entry#* }")
done

# Compute dependency counts for each package
dep_counts=()
for idx in "${!names[@]}"; do
  folder="${folders[idx]}"
  # collect dependencies and peerDependencies keys
    # collect dependencies and peerDependencies keys, defaulting missing/null to empty object
    deps=$(jq -r '(.dependencies? // {} | keys[])' "$folder/package.json")
    deps="$deps
$(jq -r '(.peerDependencies? // {} | keys[])' "$folder/package.json")"
  count=0
  for dep in $deps; do
    for j in "${!names[@]}"; do
      if [ "$dep" = "${names[j]}" ]; then
        count=$((count+1))
        break
      fi
    done
  done
  dep_counts[idx]=$count
done

# Sort package indices by dependency count (ascending)
sorted_indices=()
while IFS=" " read -r cnt idx; do
  sorted_indices+=("$idx")
done < <(
  for idx in "${!dep_counts[@]}"; do
    echo "${dep_counts[idx]} $idx"
  done | sort -n
)

echo
echo "Publishing packages to npmjs.com in order..."
for idx in "${sorted_indices[@]}"; do
  name="${names[idx]}"
  folder="${folders[idx]}"
  echo "  → Publishing $name"
  cd "$ROOT/$folder"
  npm publish --access public
  cd "$ROOT"
done

echo
echo "All done."
