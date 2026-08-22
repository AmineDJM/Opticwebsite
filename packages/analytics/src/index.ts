/**
 * Vendor-neutral analytics layer (§37). Application code emits typed domain events to
 * a bus; sinks (console, GA4, Meta Pixel) subscribe. Swapping providers is a
 * configuration change, and consent is respected before any external sink fires.
 */

export const ANALYTICS_EVENTS = [
  "page_view",
  "view_product",
  "search",
  "filter",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "order_created",
  "visagism_started",
  "visagism_completed",
  "virtual_try_on_started",
  "quiz_started",
  "quiz_completed",
  "newsletter_subscribe",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  /** Arbitrary, PII-free properties. */
  props?: Record<string, string | number | boolean | null | undefined>;
  /** ISO timestamp; set by the bus if omitted. */
  timestamp?: string;
  /** Anonymous session key (not a user id). */
  sessionKey?: string;
}

export interface AnalyticsSink {
  readonly key: string;
  /** Whether this sink needs consent before it may fire (external trackers do). */
  readonly requiresConsent: boolean;
  emit(event: AnalyticsEvent): void | Promise<void>;
}

export interface AnalyticsBusOptions {
  consentGranted?: boolean;
  now?: () => string;
}

/**
 * The bus. Fans an event out to every registered sink, skipping consent-gated sinks
 * until consent is granted. First-party sinks (e.g. persisting to our own DB) do not
 * require consent and always fire.
 */
export class AnalyticsBus {
  private readonly sinks: AnalyticsSink[] = [];
  private consentGranted: boolean;
  private readonly now: () => string;

  constructor(options: AnalyticsBusOptions = {}) {
    this.consentGranted = options.consentGranted ?? false;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  use(sink: AnalyticsSink): this {
    this.sinks.push(sink);
    return this;
  }

  setConsent(granted: boolean): void {
    this.consentGranted = granted;
  }

  async track(name: AnalyticsEventName, props?: AnalyticsEvent["props"], sessionKey?: string): Promise<void> {
    const event: AnalyticsEvent = { name, props, sessionKey, timestamp: this.now() };
    await Promise.all(
      this.sinks
        .filter((s) => !s.requiresConsent || this.consentGranted)
        .map(async (sink) => {
          try {
            await sink.emit(event);
          } catch {
            // A failing sink must never break the user's action.
          }
        }),
    );
  }
}

/** Development sink: logs to console. Never requires consent. */
export class ConsoleSink implements AnalyticsSink {
  readonly key = "console";
  readonly requiresConsent = false;
  emit(event: AnalyticsEvent): void {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info(`[analytics] ${event.name}`, event.props ?? {});
    }
  }
}

/**
 * GA4 sink. Requires consent. In the browser it pushes to the gtag dataLayer; this
 * class only formats the payload and guards consent — the app wires the global.
 */
export class GA4Sink implements AnalyticsSink {
  readonly key = "ga4";
  readonly requiresConsent = true;
  constructor(private readonly send: (name: string, params: Record<string, unknown>) => void) {}
  emit(event: AnalyticsEvent): void {
    this.send(event.name, { ...event.props });
  }
}

/** Build the default bus for a given consent state (console only until configured). */
export function createAnalyticsBus(consentGranted: boolean): AnalyticsBus {
  return new AnalyticsBus({ consentGranted }).use(new ConsoleSink());
}
