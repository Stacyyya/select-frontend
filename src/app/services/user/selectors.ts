import { get } from 'lodash-es';
import { createSelector, OutputSelector } from 'reselect';

import { SubscriptionStatus, UserState } from 'app/services/user';
import { RidiSelectState } from 'app/store';
import { DateDTO } from 'app/types';

const user = (state: RidiSelectState) => state.user || {};

export const getSubscriptionStartDate: OutputSelector<
  RidiSelectState,
  DateDTO,
  (userState: UserState) => DateDTO
> = createSelector(
  [user],
  (userState: UserState): DateDTO => {
    return get(userState, 'subscription.subscriptionStartDate');
  },
);

export const getCurrentPeriodStartDate: OutputSelector<
  RidiSelectState,
  DateDTO,
  (userState: UserState) => DateDTO
> = createSelector(
  [user],
  (userState: UserState): DateDTO => {
    return get(userState, 'subscription.currentPeriodStartDate');
  },
);

export const getCurrentPeriodEndDate: OutputSelector<
  RidiSelectState,
  DateDTO,
  (userState: UserState) => DateDTO
> = createSelector(
  [user],
  (userState: UserState): DateDTO => {
    return get(userState, 'subscription.currentPeriodEndDate');
  },
);

export const getSubscriptionStatus: OutputSelector<
  RidiSelectState,
  SubscriptionStatus,
  (userState: UserState) => SubscriptionStatus
> = createSelector(
  [user],
  (userState: UserState): SubscriptionStatus => {
    return get(userState, 'subscription.status');
  },
);

export const getNextBillingDate: OutputSelector<
  RidiSelectState,
  DateDTO,
  (userState: UserState) => DateDTO
> = createSelector(
  [user],
  (userState: UserState): DateDTO => {
    return get(userState, 'subscription.nextBillingDate');
  },
);

export const getUnsubscriptionDate: OutputSelector<
  RidiSelectState,
  DateDTO,
  (userState: UserState) => DateDTO
> = createSelector(
  [user],
  (userState: UserState): DateDTO => {
    return get(userState, 'subscription.unsubscriptionDate');
  },
);
