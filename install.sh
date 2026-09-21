#!/usr/bin/env sh
# Install the Approval-Gated Orchestrator plugin for Claude Code.
#
# Checks prerequisites, adds this repository as a Claude Code plugin marketplace,
# installs the plugin, and reports which ACP agents (Devin, OpenCode, Cursor) are
# available. It never installs or configures the agent CLIs themselves.
#
#   ./install.sh --local            # from a clone of the repository
#   ./install.sh                    # from GitHub
#   ./install.sh --scope project --handshake
set -eu

SOURCE="fabricefoy/approval-gated-orchestrator-plugin"
SCOPE="user"
HANDSHAKE=""
MARKETPLACE="approval-gated-orchestrator"
PLUGIN="approval-gated-orchestrator@$MARKETPLACE"
HERE="$(cd "$(dirname "$0")" && pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --local) SOURCE="$HERE" ;;
    --source) SOURCE="$2"; shift ;;
    --scope) SCOPE="$2"; shift ;;
    --handshake) HANDSHAKE="--handshake" ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '\n==> %s\n' "$1"; }
fail() { echo "error: $1" >&2; exit 1; }

step "Checking prerequisites"
command -v node >/dev/null 2>&1 || fail "Node.js 20+ is required (https://nodejs.org)."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js 20+ is required; found $(node --version)."
echo "node $(node --version)"
if command -v git >/dev/null 2>&1; then git --version; else echo "warning: git not found; worktree isolation will be unavailable."; fi
command -v claude >/dev/null 2>&1 || fail "Claude Code CLI (claude) is required."
echo "claude $(claude --version)"

step "Adding marketplace '$MARKETPLACE' from $SOURCE"
if claude plugin marketplace list 2>&1 | grep -q "$MARKETPLACE"; then
  echo "Marketplace already added; updating it."
  claude plugin marketplace update "$MARKETPLACE"
else
  claude plugin marketplace add "$SOURCE"
fi

if claude plugin list 2>&1 | grep -q "$PLUGIN"; then
  step "Updating $PLUGIN"
  claude plugin update "$PLUGIN"
else
  step "Installing $PLUGIN (scope: $SCOPE)"
  claude plugin install "$PLUGIN" --scope "$SCOPE"
fi

step "Checking ACP agents"
BRIDGE="$HERE/plugins/claude-code/scripts/acp.mjs"
if [ -f "$BRIDGE" ]; then
  node "$BRIDGE" doctor $HANDSHAKE || echo "Some checks failed. Missing agents are optional; install the ones you want to use."
else
  echo "Run /approval-gated-orchestrator:setup in Claude Code to check agents."
fi

step "Done"
cat <<'EOF'
Start a new Claude Code session, then:
  /approval-gated-orchestrator:orchestrate <goal>   plan, route, and dispatch a bounded task
  /approval-gated-orchestrator:setup                check or set up Devin, OpenCode and Cursor
Agent CLIs (optional, each with its own login and billing):
  Devin     docs.devin.ai        OpenCode  opencode.ai/docs        Cursor CLI  cursor.com/cli
EOF
