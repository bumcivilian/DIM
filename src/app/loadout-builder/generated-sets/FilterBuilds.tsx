import { t } from 'app/i18next-t';
import React, { useMemo, useCallback, useState } from 'react';
import { D2Store } from '../../inventory/store-types';
import { ArmorSet, StatTypes, MinMaxIgnored } from '../types';
import TierSelect from './TierSelect';
import _ from 'lodash';
import { D2ManifestDefinitions } from 'app/destiny2/d2-definitions';
import styles from './FilterBuilds.m.scss';
import { statHashes, statKeys } from '../process';
import { statTier } from './utils';
import { useDispatch } from 'react-redux';
import { setSetting } from 'app/settings/actions';

const statTypeToHash: { [type in StatTypes]: number } = {
  Mobility: 2996146975,
  Resilience: 392767087,
  Recovery: 1943323491,
  Discipline: 1735777505,
  Intellect: 144602215,
  Strength: 4244567218,
};

/**
 * A control for filtering builds by stats, and controlling the priority order of stats.
 */
export default function FilterBuilds({
  sets,
  minimumPower,
  selectedStore,
  stats,
  defs,
  order,
  assumeMasterwork,
  onMinimumPowerChanged,
  onStatFiltersChanged,
}: {
  sets: readonly ArmorSet[];
  minimumPower: number;
  selectedStore: D2Store;
  stats: { [statType in StatTypes]: MinMaxIgnored };
  defs: D2ManifestDefinitions;
  order: StatTypes[];
  assumeMasterwork: boolean;
  onMinimumPowerChanged(minimumPower: number): void;
  onStatFiltersChanged(stats: { [statType in StatTypes]: MinMaxIgnored }): void;
}) {
  const dispatch = useDispatch();

  const onStatSortOrderChanged = (sortOrder: StatTypes[]) => {
    dispatch(
      setSetting(
        'loStatSortOrder',
        sortOrder.map((type) => statTypeToHash[type])
      )
    );
  };

  const onMasterworkAssumptionChange = (assumeMasterwork: boolean) => {
    dispatch(setSetting('loAssumeMasterwork', assumeMasterwork));
  };

  const statRanges = useMemo(() => {
    if (!sets.length) {
      return _.mapValues(statHashes, () => ({ min: 0, max: 10, ignored: false }));
    }
    const statRanges = _.mapValues(statHashes, () => ({ min: 10, max: 0, ignored: false }));
    for (const set of sets) {
      for (const prop of statKeys) {
        const tier = statTier(set.stats[prop]);
        const range = statRanges[prop];
        range.min = Math.min(tier, range.min);
        range.max = Math.max(tier, range.max);
      }
    }
    return statRanges;
  }, [sets]);

  return (
    <div>
      <div className={styles.filters}>
        <TierSelect
          rowClassName={styles.row}
          stats={stats}
          statRanges={statRanges}
          defs={defs}
          order={order}
          onStatFiltersChanged={onStatFiltersChanged}
          onStatOrderChanged={onStatSortOrderChanged}
        />
        <div
          className={styles.assumeMasterwork}
          title={t('LoadoutBuilder.AssumeMasterworkDetailed')}
        >
          <input
            type="checkbox"
            checked={assumeMasterwork}
            onChange={(e) => onMasterworkAssumptionChange(e.target.checked)}
          />
          <span>{t('LoadoutBuilder.AssumeMasterwork')}</span>
        </div>
        <div className={styles.powerSelect}>
          <label id="minPower" title={t('LoadoutBuilder.SelectPowerDescription')}>
            {t('LoadoutBuilder.SelectPower')}
          </label>
          <RangeSelector
            min={750}
            max={parseInt(selectedStore.stats.maxGearPower!.value.toString(), 10)}
            initialValue={minimumPower}
            onChange={onMinimumPowerChanged}
          />
        </div>
      </div>
    </div>
  );
}

function RangeSelector({
  min,
  max,
  initialValue,
  onChange,
}: {
  min: number;
  max: number;
  initialValue: number;
  onChange(value: number): void;
}) {
  const [value, setValue] = useState(initialValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnChange = useCallback(_.debounce(onChange, 500), [onChange]);
  const clampedValue = Math.max(min, Math.min(value, max));
  const onChangeLive: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const val = parseInt(e.currentTarget.value, 10);
      setValue(val);
      debouncedOnChange(val);
    },
    [debouncedOnChange]
  );

  return (
    <div>
      <input
        aria-labelledby="minPower"
        type="range"
        min={min}
        max={max}
        value={clampedValue}
        onChange={onChangeLive}
      />
      <input
        aria-labelledby="minPower"
        type="number"
        min={min}
        max={max}
        value={clampedValue}
        onChange={onChangeLive}
      />
    </div>
  );
}
