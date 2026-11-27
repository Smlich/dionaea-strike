import test from 'node:test';
import assert from 'node:assert/strict';
import { PokiSdkBridge, type PokiSDKGlobal } from './pokiSdk';

test('PokiSdkBridge operates cleanly in standalone mode when PokiSDK is absent', async () => {
  const bridge = new PokiSdkBridge({
    getSdk: () => null,
    getLocationHost: () => 'dionaea-strike.web.app',
    getReferrer: () => '',
    isEmbeddedIframe: () => false,
  });

  assert.equal(bridge.isPokiEnvironment(), false);
  await bridge.init();
  bridge.notifyLoadingFinished();
  bridge.notifyGameplayStart();
  assert.equal(bridge.getTelemetry().gameplayActive, true);

  let beforeCalled = false;
  let afterCalled = false;
  await bridge.requestCommercialBreak({
    onBeforeAd: () => {
      beforeCalled = true;
    },
    onAfterAd: () => {
      afterCalled = true;
    },
  });

  assert.equal(beforeCalled, false);
  assert.equal(afterCalled, false);
  assert.equal(bridge.getTelemetry().gameplayActive, false);
  assert.equal(bridge.getTelemetry().commercialBreakCount, 0);
});

test('PokiSdkBridge enforces Poki QA lifecycle order and deduplicates start/stop events', async () => {
  const events: string[] = [];
  const fakeSdk: PokiSDKGlobal = {
    init: async () => {
      events.push('init');
    },
    gameLoadingFinished: () => {
      events.push('gameLoadingFinished');
    },
    gameplayStart: () => {
      events.push('gameplayStart');
    },
    gameplayStop: () => {
      events.push('gameplayStop');
    },
    commercialBreak: async (onStart) => {
      events.push('commercialBreak:enter');
      onStart?.();
      events.push('commercialBreak:done');
    },
  };

  const bridge = new PokiSdkBridge({
    getSdk: () => fakeSdk,
    getLocationHost: () => 'games.poki-gdn.com',
    isEmbeddedIframe: () => true,
  });

  assert.equal(bridge.isPokiEnvironment(), true);

  await bridge.init();
  await bridge.init(); // idempotent

  bridge.notifyLoadingFinished();
  bridge.notifyLoadingFinished(); // strictly once

  bridge.notifyGameplayStart();
  bridge.notifyGameplayStart(); // deduplicated

  await bridge.requestCommercialBreak({
    onBeforeAd: () => events.push('audio:mute'),
    onAfterAd: () => events.push('audio:unmute'),
  });

  bridge.notifyGameplayStart();
  bridge.notifyGameplayStop();
  bridge.notifyGameplayStop(); // deduplicated

  assert.deepEqual(events, [
    'init',
    'gameLoadingFinished',
    'gameplayStart',
    'gameplayStop',
    'commercialBreak:enter',
    'audio:mute',
    'commercialBreak:done',
    'audio:unmute',
    'gameplayStart',
    'gameplayStop',
  ]);
});

test('PokiSdkBridge recovers safely from adblocker init rejection and commercialBreak errors', async () => {
  let unmuted = false;
  const fakeSdk: PokiSDKGlobal = {
    init: async () => {
      throw new Error('Blocked by adblock');
    },
    gameLoadingFinished: () => {},
    gameplayStart: () => {},
    gameplayStop: () => {},
    commercialBreak: async (onStart) => {
      onStart?.();
      throw new Error('Ad failed to load');
    },
  };

  const bridge = new PokiSdkBridge({
    getSdk: () => fakeSdk,
    adBreakTimeoutMs: 250,
  });

  await bridge.init();
  assert.equal(bridge.getTelemetry().initialized, true);
  assert.equal(bridge.getTelemetry().adBlocked, true);

  bridge.notifyGameplayStart();
  await bridge.requestCommercialBreak({
    onBeforeAd: () => {},
    onAfterAd: () => {
      unmuted = true;
    },
  });

  assert.equal(unmuted, true, 'onAfterAd always runs to restore audio even if ad throws');
  assert.equal(bridge.isCommercialBreakActive(), false);
});
