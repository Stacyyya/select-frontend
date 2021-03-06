import * as React from 'react';
import { connect } from 'react-redux';

import { Icon } from '@ridi/rsg';
import { RidiSelectState } from 'app/store';

interface Props {
  isRidiApp: boolean;
  isFetching: boolean;
  isSubscribing: boolean;
  introImageLoaded: boolean;
  publicRouteLoad: boolean;
}

const WithLogo: React.SFC = () => (
  <div className="SplashScreen">
    <Icon
      name="logo_ridiselect_1"
      className="SplashScreen_Logo"
    />
  </div>
);

const WhiteScreen: React.SFC = () => (
  <div className="SplashScreen SplashScreen-whiteScreen" />
);

const SplashScreen: React.SFC<Props> = (props) => {
  if (props.isRidiApp) {
    if (props.isFetching) {
      return <WithLogo />;
    }
  } else {
    if (props.isFetching) {
      return <WhiteScreen />;
    } else if (!props.isSubscribing && !(props.introImageLoaded || props.publicRouteLoad)) {
      return <WithLogo />;
    }
  }
  return null;
};

const mapStateToProps = (rootState: RidiSelectState): Pick<Props, 'introImageLoaded' | 'publicRouteLoad'> => ({
  introImageLoaded: rootState.environment.introImageLoaded,
  publicRouteLoad: rootState.environment.publicRouteLoad,
});

export const ConnectedSplashScreen = connect(mapStateToProps)(SplashScreen);
