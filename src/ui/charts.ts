import type { ItemProfit, MonthlyTotal } from '../types';
import { formatAmount, formatDecimalAmount, formatMonth, formatPercent } from '../core/format';
import { el, emptyState, replaceChildren, svg } from './dom';

/**
 * One accent hue, six depths. Ordered dark to light so the largest slice always
 * carries the most weight; past six garment names the tail is folded into
 * "Other" rather than fading into near-white.
 */
const ACCENT_STEPS = ['#1d5a4f', '#357a6b', '#559b8a', '#7dbcaa', '#a6d8c9', '#cfeae1'] as const;

const OTHER_LABEL = 'Other';
const MAX_SLICES = 6;

const DONUT_SIZE = 168;
const DONUT_RADIUS = 66;
const DONUT_STROKE = 24;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

interface Slice {
  readonly label: string;
  readonly totalCents: number;
  readonly color: string;
}

/** Folds a long tail into a single "Other" slice. Pure, so it is easy to reason about. */
export function foldToSlices(totals: readonly ItemProfit[]): Slice[] {
  const head = totals.slice(0, MAX_SLICES);
  const tail = totals.slice(MAX_SLICES);

  const slices: Slice[] = head.map((total, index) => ({
    label: total.item,
    totalCents: total.totalCents,
    color: ACCENT_STEPS[index] ?? ACCENT_STEPS[ACCENT_STEPS.length - 1] ?? '#1d5a4f',
  }));

  if (tail.length > 0) {
    const totalCents = tail.reduce((sum, item) => sum + item.totalCents, 0);
    if (totalCents > 0) {
      slices.push({
        label: `${OTHER_LABEL} (${tail.length})`,
        totalCents,
        color: '#e3e6e4',
      });
    }
  }

  return slices;
}

function renderDonut(
  slices: readonly Slice[],
  totalCents: number,
  caption: string,
): SVGSVGElement {
  const centre = DONUT_SIZE / 2;
  const root = svg('svg', {
    class: 'donut',
    viewBox: `0 0 ${DONUT_SIZE} ${DONUT_SIZE}`,
    role: 'img',
    'aria-label': `Donut chart of profit by item. Largest: ${
      slices[0]?.label ?? 'none'
    } at ${formatAmount(slices[0]?.totalCents ?? 0)}.`,
  });

  let offset = 0;
  for (const slice of slices) {
    const share = totalCents === 0 ? 0 : slice.totalCents / totalCents;
    const length = Math.max(share * DONUT_CIRCUMFERENCE - 2, share > 0 ? 1 : 0);
    root.append(
      svg('circle', {
        class: 'donut__slice',
        cx: centre,
        cy: centre,
        r: DONUT_RADIUS,
        fill: 'none',
        stroke: slice.color,
        'stroke-width': DONUT_STROKE,
        'stroke-dasharray': `${length} ${DONUT_CIRCUMFERENCE - length}`,
        'stroke-dashoffset': -offset,
        transform: `rotate(-90 ${centre} ${centre})`,
      }, [svg('title', {}, [`${slice.label}: ${formatAmount(slice.totalCents)}`])]),
    );
    offset += share * DONUT_CIRCUMFERENCE;
  }

  root.append(
    svg('text', { class: 'donut__value', x: centre, y: centre - 2, 'text-anchor': 'middle' }, [
      formatAmount(totalCents),
    ]),
    svg('text', { class: 'donut__caption', x: centre, y: centre + 18, 'text-anchor': 'middle' }, [
      caption,
    ]),
  );

  return root;
}

function renderLegend(
  slices: readonly Slice[],
  totals: readonly ItemProfit[],
  totalCents: number,
): HTMLUListElement {
  const countFor = (label: string): number =>
    label === OTHER_LABEL
      ? totals.slice(MAX_SLICES).reduce((sum, item) => sum + item.count, 0)
      : (totals.find((item) => item.item === label)?.count ?? 0);

  return el(
    'ul',
    { class: 'legend' },
    slices.map((slice) => {
      const count = countFor(slice.label);
      return el('li', { class: 'legend__item' }, [
        el('span', {
          class: 'legend__swatch',
          style: `background:${slice.color}`,
          'aria-hidden': 'true',
        }),
        el('span', { class: 'legend__label' }, [slice.label]),
        el('span', { class: 'legend__value' }, [formatAmount(slice.totalCents)]),
        el('span', { class: 'legend__meta' }, [
          `${formatPercent(totalCents === 0 ? 0 : slice.totalCents / totalCents)} · ${
            count === 1 ? '1 sale' : `${count} sales`
          }`,
        ]),
      ]);
    }),
  );
}

/** Profit breakdown by garment: a donut plus a fully readable legend. */
export function renderItemProfitChart(
  container: HTMLElement,
  totals: readonly ItemProfit[],
): void {
  const profitable = totals.filter((total) => total.totalCents > 0);
  if (profitable.length === 0) {
    replaceChildren(container, emptyState('No profitable sales yet.'));
    return;
  }

  const slices = foldToSlices(profitable);
  const totalCents = profitable.reduce((sum, item) => sum + item.totalCents, 0);

  replaceChildren(container, [
    el('div', { class: 'chart__figure' }, [renderDonut(slices, totalCents, 'profit')]),
    renderLegend(slices, profitable, totalCents),
  ]);
}

const TREND_WIDTH = 560;
const TREND_HEIGHT = 200;
const TREND_PAD_TOP = 22;
const TREND_PAD_BOTTOM = 28;

/** Rounds a maximum up to a friendly axis ceiling so bars never touch the top. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function renderTrendBars(monthly: readonly MonthlyTotal[]): SVGSVGElement {
  const plotHeight = TREND_HEIGHT - TREND_PAD_TOP - TREND_PAD_BOTTOM;
  const baseline = TREND_HEIGHT - TREND_PAD_BOTTOM;
  const ceiling = niceCeiling(
    Math.max(
      1,
      ...monthly.map((item) => Math.max(item.investedCents, item.revenueCents)),
    ),
  );
  const slot = TREND_WIDTH / monthly.length;
  const barWidth = Math.max(slot * 0.26, 5);
  const gap = Math.max(slot * 0.06, 2);
  const pairWidth = barWidth * 2 + gap;

  const peak = monthly.reduce(
    (best, item) =>
      Math.max(item.investedCents, item.revenueCents) > best.cents
        ? { cents: Math.max(item.investedCents, item.revenueCents), month: item.month }
        : best,
    { cents: 0, month: monthly[0]?.month ?? '' },
  );

  const root = svg('svg', {
    class: 'trend',
    viewBox: `0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`,
    role: 'img',
    'aria-label': `Bar chart of monthly activity for ${monthly.length} ${
      monthly.length === 1 ? 'month' : 'months'
    }. Peak ${formatAmount(peak.cents)} in ${formatMonth(peak.month)}.`,
  });

  // Reference lines: baseline axis and the ceiling the labels sit against.
  root.append(
    svg('line', {
      class: 'trend__grid',
      x1: 0,
      x2: TREND_WIDTH,
      y1: TREND_PAD_TOP - 6,
      y2: TREND_PAD_TOP - 6,
    }),
    svg('text', { class: 'trend__axis-label', x: 0, y: TREND_PAD_TOP - 12 }, [
      formatAmount(ceiling),
    ]),
    svg('line', {
      class: 'trend__axis',
      x1: 0,
      x2: TREND_WIDTH,
      y1: baseline,
      y2: baseline,
    }),
  );

  monthly.forEach((item, index) => {
    const investedHeight = Math.max(
      (item.investedCents / ceiling) * plotHeight,
      item.investedCents > 0 ? 3 : 0,
    );
    const revenueHeight = Math.max(
      (item.revenueCents / ceiling) * plotHeight,
      item.revenueCents > 0 ? 3 : 0,
    );
    const xStart = index * slot + (slot - pairWidth) / 2;
    const label = formatMonth(item.month);

    const bar = (
      className: string,
      x: number,
      height: number,
      cents: number,
    ): SVGRectElement =>
      svg('rect', {
        class: className,
        x,
        y: cents === 0 ? baseline - 2 : baseline - height,
        width: barWidth,
        height: cents === 0 ? 2 : height,
        rx: 2,
      }, [svg('title', {}, [`${label}: ${formatAmount(cents)}`])]);

    const investedClass =
      item.investedCents === 0 ? 'trend__bar trend__bar--invested trend__bar--empty' : 'trend__bar trend__bar--invested';
    const revenueClass =
      item.revenueCents === 0 ? 'trend__bar trend__bar--revenue trend__bar--empty' : 'trend__bar trend__bar--revenue';

    root.append(
      bar(investedClass, xStart, investedHeight, item.investedCents),
      bar(revenueClass, xStart + barWidth + gap, revenueHeight, item.revenueCents),
      svg('text', { class: 'trend__month', x: xStart + pairWidth / 2, y: baseline + 16, 'text-anchor': 'middle' }, [
        label,
      ]),
    );

    if (item.revenueCents > 0) {
      root.append(
        svg('text', { class: 'trend__value', x: xStart + barWidth + gap + barWidth / 2, y: baseline - revenueHeight - 7, 'text-anchor': 'middle' }, [
          formatDecimalAmount(item.revenueCents),
        ]),
      );
    }
  });

  return root;
}

function renderKey(): HTMLUListElement {
  return el('ul', { class: 'chart__key', 'aria-hidden': 'true' }, [
    el('li', { class: 'chart__key-item' }, [
      el('span', { class: 'chart__key-swatch chart__key-swatch--invested' }),
      'Invested',
    ]),
    el('li', { class: 'chart__key-item' }, [
      el('span', { class: 'chart__key-swatch chart__key-swatch--revenue' }),
      'Sold',
    ]),
  ]);
}

/** Activity over time: invested vs sold, a grouped bar chart per month. */
export function renderMonthlyChart(
  container: HTMLElement,
  monthly: readonly MonthlyTotal[],
): void {
  if (monthly.length === 0) {
    replaceChildren(container, emptyState('No activity recorded yet.'));
    return;
  }

  const dataList = el(
    'ul',
    { class: 'visually-hidden' },
    monthly.map((item) =>
      el('li', {}, [
        `${formatMonth(item.month)}: ${formatAmount(item.investedCents)} invested, ${formatAmount(
          item.revenueCents,
        )} sold across ${item.count === 1 ? '1 item' : `${item.count} items`}`,
      ]),
    ),
  );

  replaceChildren(container, [
    el('div', { class: 'chart__figure' }, [renderTrendBars(monthly)]),
    renderKey(),
    dataList,
  ]);
}