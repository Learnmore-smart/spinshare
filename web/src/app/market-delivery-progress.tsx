import * as React from "react";

export interface MarketDeliveryProgressProps {
  servedImpressions: number;
  purchasedImpressions: number;
  deliveryPercent: number;
  ariaLabel: string;
}

const countFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function MarketDeliveryProgress(
  props: MarketDeliveryProgressProps,
) {
  const percent = Number.isFinite(props.deliveryPercent)
    ? Math.min(100, Math.max(0, props.deliveryPercent))
    : 0;

  return (
    <div className="min-w-0">
      <div className="mb-1.5 whitespace-nowrap text-xs font-bold tabular-nums text-[var(--text-secondary)]">
        {countFormatter.format(props.servedImpressions)} /{" "}
        {countFormatter.format(props.purchasedImpressions)}
      </div>
      <div
        role="progressbar"
        aria-label={props.ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-empty)]"
      >
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
