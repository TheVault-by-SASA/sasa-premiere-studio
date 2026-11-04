import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { stateDirectory } from '../packages/platform/index.js';
import { assertPublishable } from '../scripts/package-release.js';

test('private state follows platform conventions and an explicit override is shared', () => {
  const home = '/fixture/home';
  assert.equal(stateDirectory({}, 'darwin', home), join(home,'Library','Application Support','SASA','PremiereStudio'));
  assert.equal(stateDirectory({LOCALAPPDATA:'/fixture/local'}, 'win32', home), join('/fixture/local','SASA','PremiereStudio'));
  assert.equal(stateDirectory({XDG_STATE_HOME:'/fixture/state'}, 'linux', home), join('/fixture/state','sasa','premiere-studio'));
  for (const platform of ['win32','darwin','linux']) assert.equal(stateDirectory({SASA_STUDIO_STATE_DIR:'/fixture/private'}, platform, home), '/fixture/private');
});
test('distribution rejects private pairing/session files and credential material', () => {
  for (const name of ['session.json','connection.json','agent-session.json','agent-session.json.tmp','auth.json','mcp-client.json']) {
    assert.throws(() => assertPublishable('apps/' + name, Buffer.from('{}')), /Private state/);
  }
  const synthetic = 'ghp_' + 'x'.repeat(30);
  assert.throws(() => assertPublishable('README.md', Buffer.from(synthetic)), /Potential credential/);
  assert.doesNotThrow(() => assertPublishable('mcp-client.example.json', Buffer.from('/ABSOLUTE/PATH')));
});
