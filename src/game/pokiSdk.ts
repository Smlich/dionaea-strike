/**
 * Poki SDK v2 Bridge & Lifecycle Controller
 *
 * Implements the official Poki HTML5 QA lifecycle:
 *   init() -> gameLoadingFinished() -> gameplayStart() <-> gameplayStop() -> commercialBreak()
 *
 * Designed to work identically in three environments:
 *   1. Poki / Poki Inspector (window.PokiSDK active)
 *   2. Ad-blocked Poki sessions (PokiSDK.init rejects -> game proceeds smoothly)
 *   3. Standalone web hosting / local dev (window.PokiSDK absent -> instant no-op fallbacks)
 */

export interface PokiSDKGlobal {
  init?: () => Promise<void>;
  gameLoadingFinished?: () => void;
  gameplayStart?: () => void;
  gameplayStop?: () => void;
  commercialBreak?: (onStart?: () => void) => Promise<void>;
  rewardedBreak?: (onStart?: () => void) => Promise<boolean>;
  setDebug?: (debug: boolean) => void;
}

declare global {
  interface Window {
    PokiSDK?: PokiSDKGlobal;
  }
}

export interface PokiSdkTelemetry {
  initialized: boolean;
  adBlocked: boolean;
  loadingFinishedSent: boolean;
  gameplayActive: boolean;
  commercialBreakActive: boolean;
  commercialBreakCount: number;
  pokiDetected: boolean;
}

export interface PokiBridgeDeps {
  getSdk?: () => PokiSDKGlobal | null;
  getLocationHost?: () => string;
  getReferrer?: () => string;
  isEmbeddedIframe?: () => boolean;
  adBreakTimeoutMs?: number;
}

function defaultGetSdk(): PokiSDKGlobal | null {
  if (typeof window === 'undefined') return null;
  return window.PokiSDK ?? null;
}

function defaultGetLocationHost(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.location.hostname || '';
  } catch {
    return '';
  }
}

function defaultGetReferrer(): string {
  if (typeof document === 'undefined') return '';
  try {
    return document.referrer || '';
  } catch {
    return '';
  }
}

function defaultIsEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPokiDomain(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes('poki.com') ||
    lower.includes('poki-gdn.com') ||
    lower.includes('poki.io') ||
    lower.includes('poki-user-content.com')
  );
}

export class PokiSdkBridge {
  private readonly getSdkFn: () => PokiSDKGlobal | null;
  private readonly getHostFn: () => string;
  private readonly getReferrerFn: () => string;
  private readonly isIframeFn: () => boolean;
  private readonly adBreakTimeoutMs: number;

  private initPromise: Promise<void> | null = null;
  private initialized = false;
  private adBlocked = false;
  private loadingFinishedSent = false;
  private gameplayActive = false;
  private commercialBreakActive = false;
  private commercialBreakCount = 0;

  constructor(deps: PokiBridgeDeps = {}) {
    this.getSdkFn = deps.getSdk ?? defaultGetSdk;
    this.getHostFn = deps.getLocationHost ?? defaultGetLocationHost;
    this.getReferrerFn = deps.getReferrer ?? defaultGetReferrer;
    this.isIframeFn = deps.isEmbeddedIframe ?? defaultIsEmbeddedIframe;
    this.adBreakTimeoutMs = deps.adBreakTimeoutMs ?? 12000;
  }

  public isPokiEnvironment(): boolean {
    if (this.getSdkFn()) return true;
    return isPokiDomain(this.getHostFn()) || isPokiDomain(this.getReferrerFn());
  }

  public isEmbeddedInPortal(): boolean {
    return this.isPokiEnvironment() || this.isIframeFn();
  }

  public isCommercialBreakActive(): boolean {
    return this.commercialBreakActive;
  }

  public getTelemetry(): PokiSdkTelemetry {
    return {
      initialized: this.initialized,
      adBlocked: this.adBlocked,
      loadingFinishedSent: this.loadingFinishedSent,
      gameplayActive: this.gameplayActive,
      commercialBreakActive: this.commercialBreakActive,
      commercialBreakCount: this.commercialBreakCount,
      pokiDetected: this.isPokiEnvironment(),
    };
  }

  public init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    const sdk = this.getSdkFn();
    if (!sdk || typeof sdk.init !== 'function') {
      this.initialized = true;
      this.initPromise = Promise.resolve();
      return this.initPromise;
    }

    this.initPromise = Promise.resolve()
      .then(() => sdk.init?.())
      .then(() => {
        this.initialized = true;
        this.adBlocked = false;
      })
      .catch(() => {
        // Per Poki QA: an ad blocker may reject PokiSDK.init(); the game MUST proceed normally.
        this.initialized = true;
        this.adBlocked = true;
      });

    return this.initPromise;
  }

  public notifyLoadingFinished(): void {
    if (this.loadingFinishedSent) return;
    this.loadingFinishedSent = true;
    const sdk = this.getSdkFn();
    try {
      sdk?.gameLoadingFinished?.();
    } catch {
      // Never allow SDK errors to break game startup
    }
  }

  public notifyGameplayStart(): void {
    if (this.gameplayActive || this.commercialBreakActive) return;
    this.gameplayActive = true;
    const sdk = this.getSdkFn();
    try {
      sdk?.gameplayStart?.();
    } catch {
      // Ignore SDK errors
    }
  }

  public notifyGameplayStop(): void {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    const sdk = this.getSdkFn();
    try {
      sdk?.gameplayStop?.();
    } catch {
      // Ignore SDK errors
    }
  }

  /**
   * Requests a Poki commercial break on natural transitions back into gameplay
   * (e.g., Retry after Game Over/Victory, or Next Level after Level Clear).
   * Never call on first boot or initial Start from the Title Screen.
   */
  public async requestCommercialBreak(options: {
    onBeforeAd?: () => void;
    onAfterAd?: () => void;
  } = {}): Promise<void> {
    if (this.commercialBreakActive) return;

    this.notifyGameplayStop();

    const sdk = this.getSdkFn();
    if (!sdk || typeof sdk.commercialBreak !== 'function') {
      return;
    }

    this.commercialBreakActive = true;
    this.commercialBreakCount += 1;

    let beforeAdCalled = false;
    const invokeBeforeAd = () => {
      if (beforeAdCalled) return;
      beforeAdCalled = true;
      try {
        options.onBeforeAd?.();
      } catch {
        // Ignore audio/input mute callback errors
      }
    };

    try {
      await this.init();
      const breakPromise = Promise.resolve().then(() =>
        sdk.commercialBreak?.(() => {
          invokeBeforeAd();
        })
      );

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, this.adBreakTimeoutMs);
      });

      try {
        await Promise.race([breakPromise, timeoutPromise]);
      } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
      }
    } catch {
      // Never soft-lock gameplay if an ad fails to render
    } finally {
      this.commercialBreakActive = false;
      if (beforeAdCalled) {
        try {
          options.onAfterAd?.();
        } catch {
          // Ignore resume callback errors
        }
      }
    }
  }
}

export const pokiSdk = new PokiSdkBridge();
