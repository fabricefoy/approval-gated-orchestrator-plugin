// PreToolUse hook for the Antigravity CLI (agy), installed by `acp gate install`.
// Outside the acp bridge (ACP_BRIDGE_GATE unset) it prints nothing, so agy's own permission
// handling applies unchanged. Inside a bridge session it forwards the tool call to the bridge
// and returns its decision, waiting as long as an approval takes. If the bridge cannot be
// reached it denies, so the gate fails closed.
import http from 'node:http';

const url = process.env.ACP_BRIDGE_GATE;
const deny = reason => process.stdout.write(JSON.stringify({ decision: 'deny', reason }));

let input = '';
process.stdin.on('data', d => (input += d)).on('end', () => {
  if (!url) return;
  const req = http.request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-acp-token': process.env.ACP_BRIDGE_TOKEN || '' },
  }, res => {
    let body = '';
    res.on('data', d => (body += d)).on('end', () => {
      let r;
      try { r = JSON.parse(body); } catch { return deny('acp bridge returned an invalid response'); }
      if (res.statusCode !== 200) return deny(`acp bridge error: ${r.error || res.statusCode}`);
      process.stdout.write(JSON.stringify({ decision: r.decision, ...(r.reason ? { reason: r.reason } : {}) }));
    });
  });
  req.on('error', e => deny(`acp bridge unreachable: ${e.message}`));
  req.end(input || '{}');
});
