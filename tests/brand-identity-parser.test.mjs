import test from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeStructuredBrandIdentity,
  parseStructuredBrandIdentity,
} from '../lib/context/brandIdentityParser.ts';

const sacredDarkAfrica = `
Sacred Dark Africa - Master Production System

Brand Core
1 One character: Ayo
2 One world: dark African mythological setting
3 One evolving supernatural force
4 Continuous cinematic storytelling
5 Loop-driven content for retention

Character Lock - Ayo
1 Young African man, slim build, short black hair
2 Dark skin, small scar at left temple
3 Worn indigo robe, rope belt, barefoot
4 Holds a lit lantern, charm tied to wrist
5 Slow movement, micro-expressions, tense presence

Content Pillars
1 The Entity - evolving threat
2 Ayo's Descent - psychological breakdown
3 The World - eerie African environments
4 The Moment - viral disturbing hooks
5 The Loop - unresolved endings

Episode Structure (5 Scenes)
1 Scene 1 - Push-in (hook)
2 Scene 2 - Tracking (discovery)
3 Scene 3 - Orbit (distortion)
4 Scene 4 - Zoom (reveal)
5 Scene 5 - Fast shake (cliffhanger) Topics to Avoid
1 Generic horror
2 Western tropes
3 Multiple main characters
4 Over-explanation
`;

test('structured brand identity parser detects Sacred Dark Africa production systems', () => {
  assert.equal(looksLikeStructuredBrandIdentity(sacredDarkAfrica), true);
});

test('structured brand identity parser extracts brand, character, pillars, avoid topics, and episode flow', () => {
  const parsed = parseStructuredBrandIdentity(sacredDarkAfrica);

  assert.ok(parsed);
  assert.equal(parsed.brandName, 'Sacred Dark Africa');
  assert.equal(parsed.characterName, 'Ayo');
  assert.match(parsed.niche || '', /dark African mythological setting/);
  assert.ok(parsed.characterProfile?.includes('small scar at left temple'));
  assert.ok(parsed.contentPillars.includes('The Entity - evolving threat'));
  assert.ok(parsed.avoidTopics.includes('Generic horror'));
  assert.match(parsed.episodeStructure || '', /Scene 5 - Fast shake/);
});
