#!/usr/bin/env bash
set -euo pipefail
OWNER=${1:-peerjakobsen}
TITLE=${2:-"ObsidianGTD Roadmap"}

# Ensure token has project scopes
if ! gh project list --owner "$OWNER" >/dev/null 2>&1; then
  echo "ERROR: Missing 'project' scopes. Run: gh auth refresh -s project,read:project,write:project" >&2
  exit 1
fi

# Create or find project
proj_id=$(gh project list --owner "$OWNER" --limit 100 --format json \
  | jq -r --arg t "$TITLE" '.projects[]? | select(.title==$t) | .number' \
  | head -n1)
if [[ -z "$proj_id" ]]; then
  proj_id=$(gh project create --owner "$OWNER" --title "$TITLE" --format json | jq -r '.number')
  echo "Created project $TITLE (#$proj_id)"
else
  echo "Using existing project $TITLE (#$proj_id)"
fi

# Link repo to project for convenience
REPO=$(git remote get-url origin | sed -E 's#.*github.com[/:]([^/]+/[^/.]+)(\.git)?#\1#')
gh project link "$proj_id" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1 || true

# Resolve project node id for item field updates
proj_node_id=$(gh project view "$proj_id" --owner "$OWNER" --format json | jq -r '.id')

# Status field + option ids
status_field_id=$(gh project field-list "$proj_id" --owner "$OWNER" --format json | jq -r '.fields[] | select(.name=="Status") | .id')
opt_done=$(gh project field-list "$proj_id" --owner "$OWNER" --format json | jq -r \
  '.fields[] | select(.name=="Status").options[] | select(.name=="Done") | .id')
opt_todo=$(gh project field-list "$proj_id" --owner "$OWNER" --format json | jq -r \
  '.fields[] | select(.name=="Status").options[] | select(.name=="Todo") | .id')

# Add all roadmap issues
issues=$(gh issue list -R "$REPO" --label roadmap --state all --limit 200 --json number,url,state,title)

echo "$issues" | jq -c '.[]' | while read -r issue; do
  url=$(echo "$issue" | jq -r .url)
  state=$(echo "$issue" | jq -r .state)
  # Add item (idempotent: ignore error if exists)
  item_id=$(gh project item-add "$proj_id" --owner "$OWNER" --url "$url" --format json | jq -r '.id' || true)
  if [[ -z "$item_id" || "$item_id" == "null" ]]; then
    # Find existing item id by listing items and matching content URL
    item_id=$(gh project item-list "$proj_id" --owner "$OWNER" --format json | jq -r --arg url "$url" '.items[] | select(.content.url==$url) | .id')
  fi
  # Set Status field
  if [[ -n "$item_id" && -n "$status_field_id" && -n "$proj_node_id" ]]; then
    if [[ "$state" == "CLOSED" || "$state" == "closed" ]]; then
      gh project item-edit --id "$item_id" --project-id "$proj_node_id" --field-id "$status_field_id" --single-select-option-id "$opt_done" >/dev/null
      echo "Added + set Done: $url"
    else
      gh project item-edit --id "$item_id" --project-id "$proj_node_id" --field-id "$status_field_id" --single-select-option-id "$opt_todo" >/dev/null
      echo "Added + set Todo: $url"
    fi
  fi
done

echo "Project ready: https://github.com/$OWNER?tab=projects"
