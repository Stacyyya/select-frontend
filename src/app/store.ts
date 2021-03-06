import { History } from 'history';
import { isEmpty } from 'lodash-es';
import * as qs from 'qs';
import { routerMiddleware, routerReducer, RouterState } from 'react-router-redux';
import { Dispatch } from 'redux';
import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import { loggers } from 'redux-act';
import { createLogger } from 'redux-logger';
import createSagaMiddleware from 'redux-saga';
import { all } from 'redux-saga/effects';
import { closingReservedBooksReducer } from './services/closingReservedBooks/index';

import browserHistory from 'app/config/history';
import { bookReducer, BookState } from 'app/services/book';
import { bookRootSaga } from 'app/services/book/sagas';
import { commonUIReducer, CommonUIState } from 'app/services/commonUI';
import { homeReducer, HomeState } from 'app/services/home';
import { homeRootSaga } from 'app/services/home/sagas';
import { userRootSaga } from 'app/services/user/sagas';

import { categoryBooksReducer, CategoryBooksState, categoryListReducer, CategoryListState } from 'app/services/category';
import { categoryRootSaga } from 'app/services/category/sagas';
import { closingReservedBooksState } from 'app/services/closingReservedBooks/index';
import { closingReservedBooksRootSaga } from 'app/services/closingReservedBooks/sagas';
import { collectionReducer, CollectionsState } from 'app/services/collection';
import { collectionsRootSaga } from 'app/services/collection/sagas';
import { environmentReducer, EnvironmentState } from 'app/services/environment';
import { MySelectState } from 'app/services/mySelect';
import { mySelectReducer } from 'app/services/mySelect';
import { mySelectRootSaga } from 'app/services/mySelect/sagas';
import { reviewsReducer, ReviewsState } from 'app/services/review';
import { reviewRootSaga } from 'app/services/review/sagas';
import { SearchResultState } from 'app/services/searchResult';
import { searchResultReducer } from 'app/services/searchResult';
import { searchResultRootSaga } from 'app/services/searchResult/sagas';
import { serviceStatusReducer, ServiceStatusState } from 'app/services/serviceStatus';
import { trackingSaga } from 'app/services/tracking/sagas';

import env from 'app/config/env';
import { customHistoryReducer, customHistorySaga, CustomHistoryState } from 'app/services/customHistory';
import { downloadSaga } from 'app/services/download/sagas';
import { userReducer, UserState } from 'app/services/user';
import { stateHydrator } from 'app/utils/stateHydrator';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any;
  }
}

function* rootSaga(dispatch: Dispatch) {
  yield all([
    homeRootSaga(),
    bookRootSaga(),
    reviewRootSaga(dispatch),
    userRootSaga(),
    collectionsRootSaga(),
    categoryRootSaga(),
    searchResultRootSaga(),
    mySelectRootSaga(),
    trackingSaga(),
    downloadSaga(),
    customHistorySaga(),
    closingReservedBooksRootSaga(),
  ]);
}

export interface RidiSelectState {
  router: RouterState;
  user: UserState;
  home: HomeState;
  booksById: BookState;
  collectionsById: CollectionsState;
  commonUI: CommonUIState;
  reviewsByBookId: ReviewsState;
  categories: CategoryListState;
  categoriesById: CategoryBooksState;
  searchResult: SearchResultState;
  mySelect: MySelectState;
  serviceStatus: ServiceStatusState;
  environment: EnvironmentState;
  customHistory: CustomHistoryState;
  closingReservedBooks: closingReservedBooksState;
}

const sagaMiddleware = createSagaMiddleware();
const logger = createLogger({
  ...loggers.reduxLogger,
});

export const hasRefreshedForAppDownload = () => !!qs.parse(location.search, { ignoreQueryPrefix: true }).to_app_store;
export const hasCompletedRidiPaySubscription = () => !!qs.parse(location.search, { ignoreQueryPrefix: true }).new_subscription;
export const hasCompletedPayletterSubscription = () => !!qs.parse(location.search, { ignoreQueryPrefix: true }).new_payletter_subscription;

const reducers = combineReducers({
  router: routerReducer,
  user: userReducer,
  home: homeReducer,
  booksById: bookReducer,
  collectionsById: collectionReducer,
  commonUI: commonUIReducer,
  reviewsByBookId: reviewsReducer,
  categories: categoryListReducer,
  categoriesById: categoryBooksReducer,
  searchResult: searchResultReducer,
  mySelect: mySelectReducer,
  serviceStatus: serviceStatusReducer,
  environment: environmentReducer,
  customHistory: customHistoryReducer,
  closingReservedBooks: closingReservedBooksReducer,
});

const middleware = [
  routerMiddleware(browserHistory),
  sagaMiddleware,
];

if (!env.production) {
  middleware.push(logger);
}

const enhancers = (!env.production
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
  : compose
)(applyMiddleware(...middleware));

const savedState = stateHydrator.load();
export const store = hasRefreshedForAppDownload() && !isEmpty(savedState)
  ? createStore(reducers, savedState, enhancers)
  : createStore(reducers, enhancers);

sagaMiddleware.run(rootSaga, store.dispatch);
