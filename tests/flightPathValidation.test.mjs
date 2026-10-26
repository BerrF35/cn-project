import test from 'node:test';
import assert from 'node:assert';
import { INITIAL_NETWORK_STATE } from '../src/engine/initialData.ts';
import { simulateTraffic } from '../src/engine/simulator.ts';

function hasDirectLink(links, idA, idB) {
  return links.some(
    l => (l.sourceDeviceId === idA && l.targetDeviceId === idB) ||
         (l.targetDeviceId === idA && l.sourceDeviceId === idB)
  );
}

function findLinkHopPath(links, startId, endId) {
  if (startId === endId) return [startId];
  const adj = new Map();
  for (const l of links) {
    if (l.status === 'down') continue;
    if (!adj.has(l.sourceDeviceId)) adj.set(l.sourceDeviceId, []);
    if (!adj.has(l.targetDeviceId)) adj.set(l.targetDeviceId, []);
    adj.get(l.sourceDeviceId).push(l.targetDeviceId);
    adj.get(l.targetDeviceId).push(l.sourceDeviceId);
  }
  const queue = [[startId]];
  const visited = new Set([startId]);
  while (queue.length > 0) {
    const cur = queue.shift();
    const last = cur[cur.length - 1];
    if (last === endId) return cur;
    for (const next of adj.get(last) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...cur, next]);
      }
    }
  }
  return [startId, endId];
}

function buildStrictPath(state, trace, sourceId) {
  const rawHops = [];
  for (const step of trace.steps) {
    if (!step.currentDeviceId) continue;
    const last = rawHops[rawHops.length - 1];
    if (step.currentDeviceId !== last) {
      rawHops.push(step.currentDeviceId);
    }
    if (step.dropped) break;
  }
  if (rawHops.length === 0) rawHops.push(sourceId);

  const strictlyConnected = [rawHops[0]];
  for (let i = 0; i < rawHops.length - 1; i++) {
    const cur = rawHops[i];
    const nxt = rawHops[i + 1];
    if (hasDirectLink(state.links, cur, nxt)) {
      strictlyConnected.push(nxt);
    } else {
      const expanded = findLinkHopPath(state.links, cur, nxt);
      for (let j = 1; j < expanded.length; j++) {
        strictlyConnected.push(expanded[j]);
      }
    }
  }
  return strictlyConnected;
}

test('Flight Path Integrity: HR-PC-01 to FIN-PC-01 strictly traverses physical lines', () => {
  const { trace } = simulateTraffic(INITIAL_NETWORK_STATE, {
    protocol: 'ICMP_PING',
    sourceDeviceId: 'dev-hr-01',
    destinationDeviceId: 'dev-fin-01'
  });

  const path = buildStrictPath(INITIAL_NETWORK_STATE, trace, 'dev-hr-01');

  // Verify every adjacent hop is a physical link in INITIAL_NETWORK_STATE.links
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    assert.strictEqual(
      hasDirectLink(INITIAL_NETWORK_STATE.links, a, b),
      true,
      `Hop from ${a} to ${b} has no physical link in state.links!`
    );
  }

  // Inter-VLAN between HR and Finance on ACC-SW-A must route via Core L3 Switch:
  // dev-hr-01 -> dev-acc-sw-a -> dev-core-01 -> dev-acc-sw-a -> dev-fin-01
  assert.deepStrictEqual(path, [
    'dev-hr-01',
    'dev-acc-sw-a',
    'dev-core-01',
    'dev-acc-sw-a',
    'dev-fin-01'
  ]);
});

test('Flight Path Integrity: HR-PC-01 to ENG-CAD-01 traverses Switch A -> Core -> Switch B -> CAD', () => {
  const { trace } = simulateTraffic(INITIAL_NETWORK_STATE, {
    protocol: 'ICMP_PING',
    sourceDeviceId: 'dev-hr-01',
    destinationDeviceId: 'dev-eng-01'
  });

  const path = buildStrictPath(INITIAL_NETWORK_STATE, trace, 'dev-hr-01');

  for (let i = 0; i < path.length - 1; i++) {
    assert.strictEqual(
      hasDirectLink(INITIAL_NETWORK_STATE.links, path[i], path[i + 1]),
      true,
      `Hop ${path[i]} -> ${path[i + 1]} is missing a physical link!`
    );
  }

  assert.deepStrictEqual(path, [
    'dev-hr-01',
    'dev-acc-sw-a',
    'dev-core-01',
    'dev-acc-sw-b',
    'dev-eng-01'
  ]);
});

test('Flight Path Integrity: HR-PC-01 to designated HR Portal (dev-srv-dc) traverses Switch A -> Core -> Switch C -> Server', () => {
  const { trace } = simulateTraffic(INITIAL_NETWORK_STATE, {
    protocol: 'ICMP_PING',
    sourceDeviceId: 'dev-hr-01',
    destinationDeviceId: 'dev-srv-dc'
  });

  const path = buildStrictPath(INITIAL_NETWORK_STATE, trace, 'dev-hr-01');

  for (let i = 0; i < path.length - 1; i++) {
    assert.strictEqual(
      hasDirectLink(INITIAL_NETWORK_STATE.links, path[i], path[i + 1]),
      true,
      `Hop ${path[i]} -> ${path[i + 1]} is missing a physical link!`
    );
  }

  assert.deepStrictEqual(path, [
    'dev-hr-01',
    'dev-acc-sw-a',
    'dev-core-01',
    'dev-acc-sw-c',
    'dev-srv-dc'
  ]);
});

test('Flight Path Integrity: FIN-PC-01 to approved accounting ERP (dev-srv-erp) traverses Switch A -> Core -> Switch C -> Server', () => {
  const { trace } = simulateTraffic(INITIAL_NETWORK_STATE, {
    protocol: 'ICMP_PING',
    sourceDeviceId: 'dev-fin-01',
    destinationDeviceId: 'dev-srv-erp'
  });

  const path = buildStrictPath(INITIAL_NETWORK_STATE, trace, 'dev-fin-01');

  for (let i = 0; i < path.length - 1; i++) {
    assert.strictEqual(
      hasDirectLink(INITIAL_NETWORK_STATE.links, path[i], path[i + 1]),
      true,
      `Hop ${path[i]} -> ${path[i + 1]} is missing a physical link!`
    );
  }

  assert.deepStrictEqual(path, [
    'dev-fin-01',
    'dev-acc-sw-a',
    'dev-core-01',
    'dev-acc-sw-c',
    'dev-srv-erp'
  ]);
});

test('Flight Path Integrity: HR-PC-01 to restricted Accounting ERP (dev-srv-erp) is blocked at Core and halts on Core', () => {
  const { trace } = simulateTraffic(INITIAL_NETWORK_STATE, {
    protocol: 'ICMP_PING',
    sourceDeviceId: 'dev-hr-01',
    destinationDeviceId: 'dev-srv-erp'
  });

  assert.strictEqual(trace.success, false, 'HR access to Accounting ERP should be denied by policy');

  const path = buildStrictPath(INITIAL_NETWORK_STATE, trace, 'dev-hr-01');
  assert.deepStrictEqual(path, [
    'dev-hr-01',
    'dev-acc-sw-a',
    'dev-core-01'
  ]);
});

test('Flight Path Integrity: HR-PC-01 to Internet (EXT-DNS-ROOT) strictly traverses Core -> FW -> ISP -> DNS', () => {
  const { trace } = simulateTraffic(INITIAL_NETWORK_STATE, {
    protocol: 'ICMP_PING',
    sourceDeviceId: 'dev-hr-01',
    destinationDeviceId: 'dev-ext-dns'
  });

  const path = buildStrictPath(INITIAL_NETWORK_STATE, trace, 'dev-hr-01');

  for (let i = 0; i < path.length - 1; i++) {
    assert.strictEqual(
      hasDirectLink(INITIAL_NETWORK_STATE.links, path[i], path[i + 1]),
      true,
      `Hop ${path[i]} -> ${path[i + 1]} is missing a physical link!`
    );
  }

  assert.deepStrictEqual(path, [
    'dev-hr-01',
    'dev-acc-sw-a',
    'dev-core-01',
    'dev-fw-01',
    'dev-cloud-01',
    'dev-ext-dns'
  ]);
});

test('Flight Path Integrity: HR-PC-01 to PROD-SCADA-01 is blocked at Core and halts on Core without flying off-line', () => {
  const { trace } = simulateTraffic(INITIAL_NETWORK_STATE, {
    protocol: 'ICMP_PING',
    sourceDeviceId: 'dev-hr-01',
    destinationDeviceId: 'dev-prod-01'
  });

  assert.strictEqual(trace.success, false);
  assert.match(trace.summary, /Access Control List Violation/i);

  const path = buildStrictPath(INITIAL_NETWORK_STATE, trace, 'dev-hr-01');

  for (let i = 0; i < path.length - 1; i++) {
    assert.strictEqual(
      hasDirectLink(INITIAL_NETWORK_STATE.links, path[i], path[i + 1]),
      true,
      `Hop ${path[i]} -> ${path[i + 1]} is missing a physical link!`
    );
  }

  // Stops at Core switch because ACL blocked it!
  assert.deepStrictEqual(path, [
    'dev-hr-01',
    'dev-acc-sw-a',
    'dev-core-01'
  ]);
});
